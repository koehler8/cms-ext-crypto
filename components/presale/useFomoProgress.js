import { ref, computed, watch, reactive } from 'vue';
import { ethers } from 'ethers';
import {
  sanitizeText,
  toBadgeText,
  sanitizeUrl,
  toSafeInteger,
  formatSchedulePrice,
  formatScheduleTimestamp,
  normalizePriceSchedule,
  decorateScheduleWithState,
} from './buyTextHelpers.js';
import {
  getPresaleReadContract,
} from '../../utils/presaleContracts';

/**
 * Composable that manages FOMO / momentum display state:
 * fomoConfig, priceTimeline, bonus incentive state, and live-metrics polling.
 *
 * @param {Object} options
 * @param {import('vue').Ref} options.presalePulse - injected presalePulse ref (may be null)
 * @param {import('vue').Ref} options.showPurchaseControls - ref<boolean> indicating if presale is live
 * @param {Function} options.getPresaleContractAddress - () => string|null
 * @param {Function} options.getReadProvider - () => provider|null
 * @param {boolean} options.hasCustomRpc - whether a custom RPC is configured
 * @param {string} options.normalizedToken - lowercase token ticker
 * @param {import('vue').Ref|null} options.fomoProgressOverride - injected fomoProgress ref (may be null)
 */
export function useFomoProgress(options) {
  const {
    presalePulse,
    showPurchaseControls,
    getPresaleContractAddress,
    getReadProvider,
    hasCustomRpc,
    normalizedToken,
    fomoProgressOverride,
  } = options;

  let liveMetricsInterval;

  const priceTimelineId = computed(() => `${normalizedToken}-price-timeline`);

  const fomoConfig = ref({
    enabled: false,
    totalAllocation: 0,
    soldAmount: 0,
    uniqueBuyers: 0,
    nextPhaseTimestamp: Math.floor(Date.now() / 1000) + 3600,
    title: 'Presale momentum',
    caption: 'Limited supply. Secure your spot before the next price increase triggers.',
    showFuse: true,
    animates: true,
    priceSchedule: [],
    priceScheduleTitle: '',
    priceScheduleSubtitle: '',
  });

  const priceTimeline = ref([]);

  const bonusState = reactive({
    enabled: false,
    badge: '',
    headline: '',
    description: '',
    bonusLabel: '',
    bonusValue: '',
    total: null,
    remaining: null,
    footnote: '',
    countdownLabel: '',
    expiresAt: null,
    cta: {
      text: '',
      href: '',
      external: false,
    },
  });

  const bonusDisplay = computed(() => {
    if (!bonusState.enabled) {
      return {
        enabled: false,
        badge: '',
        headline: '',
        description: '',
        bonusLabel: '',
        bonusValue: '',
        total: null,
        remaining: null,
        footnote: '',
        countdownLabel: '',
        expiresAt: null,
        cta: {
          text: '',
          href: '',
          external: false,
        },
      };
    }

    return {
      enabled: true,
      badge: bonusState.badge,
      headline: bonusState.headline || 'Early buyer bonus live',
      description: bonusState.description,
      bonusLabel: bonusState.bonusLabel,
      bonusValue: bonusState.bonusValue,
      total: bonusState.total,
      remaining: bonusState.remaining,
      footnote: bonusState.footnote,
      countdownLabel: bonusState.countdownLabel,
      expiresAt: bonusState.expiresAt,
      cta: bonusState.cta,
    };
  });

  const priceTimelineTitle = computed(() => {
    const title = sanitizeText(fomoConfig.value.priceScheduleTitle);
    return title || 'Price timeline';
  });

  const priceTimelineEntries = computed(() =>
    priceTimeline.value.map((entry) => {
      const priceDisplay =
        sanitizeText(entry.priceDisplay) ||
        (Number.isFinite(entry.priceValue) && entry.priceValue > 0
          ? formatSchedulePrice(entry.priceValue)
          : '');
      const timeDisplay =
        sanitizeText(entry.timeDisplay) ||
        (Number.isFinite(entry.timestamp) && entry.timestamp > 0
          ? formatScheduleTimestamp(entry.timestamp)
          : '');
      return {
        ...entry,
        priceDisplay,
        timeDisplay,
      };
    })
  );

  const priceTimelineSubtitle = computed(() => {
    const override = sanitizeText(fomoConfig.value.priceScheduleSubtitle);
    if (override) return override;
    const nextEntry =
      priceTimelineEntries.value.find((entry) => entry.isNext) ||
      priceTimelineEntries.value.find((entry) => entry.status === 'upcoming');
    if (!nextEntry) return '';
    const parts = [];
    if (nextEntry.priceDisplay) parts.push(nextEntry.priceDisplay);
    if (nextEntry.timeDisplay) parts.push(nextEntry.timeDisplay);
    if (!parts.length) return '';
    return `Next: ${parts.join(' – ')}`;
  });

  const showPriceTimeline = computed(() => priceTimelineEntries.value.length > 0);

  function syncPresalePulse(extra = {}) {
    if (!presalePulse || typeof presalePulse !== 'object') return;

    const previous =
      presalePulse.value && typeof presalePulse.value === 'object' ? presalePulse.value : {};

    const schedule = Array.isArray(fomoConfig.value.priceSchedule)
      ? fomoConfig.value.priceSchedule
      : [];

    const nextPhaseTimestampCandidate =
      Number.isFinite(fomoConfig.value.nextPhaseTimestamp) && fomoConfig.value.nextPhaseTimestamp > 0
        ? fomoConfig.value.nextPhaseTimestamp
        : null;

    const { list, current, next, phaseIndex, totalPhases } = decorateScheduleWithState(
      schedule,
      nextPhaseTimestampCandidate
    );

    priceTimeline.value = list;

    const payload = {
      ...previous,
      isLive: Boolean(showPurchaseControls.value),
      totalAllocation: fomoConfig.value.totalAllocation,
      soldAmount: fomoConfig.value.soldAmount,
      uniqueBuyers: fomoConfig.value.uniqueBuyers,
      enabled: fomoConfig.value.enabled,
      title: fomoConfig.value.title,
      caption: fomoConfig.value.caption,
      showFuse: fomoConfig.value.showFuse,
      animates: fomoConfig.value.animates,
      priceScheduleTitle: fomoConfig.value.priceScheduleTitle,
      priceScheduleSubtitle: fomoConfig.value.priceScheduleSubtitle,
      nextPhaseTimestamp:
        nextPhaseTimestampCandidate ||
        (next && Number.isFinite(next.timestamp) ? next.timestamp : null),
      schedule: list,
      currentPhase: current,
      nextPhase: next,
      phaseIndex,
      totalPhases,
      fetchedAt: Date.now(),
      totalUsdRaised: previous.totalUsdRaised ?? 0,
      totalUsdRaisedFormatted: previous.totalUsdRaisedFormatted ?? '$0.00',
      isHydrated: previous.isHydrated ?? false,
      ...extra,
    };

    if (bonusState.enabled) {
      payload.bonus = {
        total: bonusState.total,
        remaining: bonusState.remaining,
        bonusValue: bonusState.bonusValue,
        countdownLabel: bonusState.countdownLabel,
        expiresAt: bonusState.expiresAt,
        updatedAt: Date.now(),
      };
    } else if ('bonus' in payload) {
      delete payload.bonus;
    }

    presalePulse.value = payload;
  }

  function resetBonusState() {
    bonusState.enabled = false;
    bonusState.badge = '';
    bonusState.headline = '';
    bonusState.description = '';
    bonusState.bonusLabel = '';
    bonusState.bonusValue = '';
    bonusState.total = null;
    bonusState.remaining = null;
    bonusState.footnote = '';
    bonusState.countdownLabel = '';
    bonusState.expiresAt = null;
    bonusState.cta = {
      text: '',
      href: '',
      external: false,
    };
    syncPresalePulse();
  }

  function applyBonusConfig(raw) {
    if (!raw || typeof raw !== 'object') {
      resetBonusState();
      return;
    }

    const headline = sanitizeText(raw.headline || '');
    const description = sanitizeText(raw.description || '');
    const hasContent = Boolean(headline || description);
    const enabledFlag = raw.enabled !== false;

    if (!enabledFlag || !hasContent) {
      resetBonusState();
      return;
    }

    bonusState.enabled = true;
    bonusState.badge = toBadgeText(raw.badge || 'Early bonus');
    bonusState.headline = headline || 'Early buyer bonus live';
    bonusState.description = description;

    const label = sanitizeText(raw.bonusLabel || raw.rewardLabel || '');
    bonusState.bonusLabel = label;

    const rawValue = raw.bonusValue ?? raw.rewardValue ?? raw.reward;
    let bonusValueText = '';
    if (typeof rawValue === 'number') {
      const formatted = Math.abs(rawValue % 1) < 1e-6 ? rawValue.toFixed(0) : rawValue.toFixed(2);
      const cleaned = formatted.replace(/\.00$/, '');
      const prefix = rawValue >= 0 ? '+' : '-';
      bonusValueText = `${prefix}${cleaned}% bonus`;
    } else {
      bonusValueText = sanitizeText(rawValue || '');
    }
    bonusState.bonusValue = bonusValueText;

    const total = toSafeInteger(
      raw.limit ?? raw.total ?? raw.quantity ?? raw.totalBonuses ?? raw.cap ?? null
    );
    bonusState.total = total !== null && total >= 0 ? total : null;

    const remaining = toSafeInteger(
      raw.remaining ?? raw.remainingCount ?? raw.available ?? raw.remainingBonuses ?? null
    );
    if (remaining !== null && remaining >= 0) {
      bonusState.remaining = remaining;
    } else if (bonusState.total !== null) {
      bonusState.remaining = bonusState.total;
    } else {
      bonusState.remaining = null;
    }
    if (
      bonusState.total !== null &&
      bonusState.remaining !== null &&
      bonusState.remaining > bonusState.total
    ) {
      bonusState.remaining = bonusState.total;
    }

    const footnote = sanitizeText(raw.footnote || raw.disclaimer || '');
    bonusState.footnote = footnote;

    const expiresAtCandidate = toSafeInteger(raw.expiresAt ?? raw.expiresTimestamp ?? null);
    bonusState.expiresAt = expiresAtCandidate !== null && expiresAtCandidate > 0 ? expiresAtCandidate : null;
    const countdownLabel = sanitizeText(raw.countdownLabel || raw.timerLabel || '');
    bonusState.countdownLabel = bonusState.expiresAt !== null ? countdownLabel || 'Ends in' : '';

    const ctaText = sanitizeText(raw.cta?.text || raw.ctaText || '');
    const ctaHref = sanitizeUrl(raw.cta?.href || raw.ctaHref || '');
    const ctaExternal =
      raw.cta?.external !== undefined ? Boolean(raw.cta.external) : /^https?:\/\//i.test(ctaHref);
    bonusState.cta =
      ctaText && ctaHref
        ? { text: ctaText, href: ctaHref, external: ctaExternal }
        : { text: '', href: '', external: false };

    syncPresalePulse();
  }

  function applyBonusOverride(override) {
    if (!override || typeof override !== 'object') return;

    if (override.enabled !== undefined) {
      bonusState.enabled = Boolean(override.enabled);
    }

    if (override.total !== undefined) {
      const total = toSafeInteger(override.total);
      if (total !== null && total >= 0) {
        bonusState.total = total;
        if (
          bonusState.remaining !== null &&
          bonusState.remaining > bonusState.total
        ) {
          bonusState.remaining = bonusState.total;
        }
      }
    }

    if (override.remaining !== undefined) {
      const remaining = toSafeInteger(override.remaining);
      if (remaining !== null && remaining >= 0) {
        bonusState.remaining = remaining;
      }
    }

    if (override.expiresAt !== undefined) {
      const expires = toSafeInteger(override.expiresAt);
      bonusState.expiresAt = expires !== null && expires > 0 ? expires : null;
    }

    if (override.countdownLabel !== undefined) {
      const label = sanitizeText(override.countdownLabel || '');
      if (bonusState.expiresAt !== null && label) {
        bonusState.countdownLabel = label;
      } else if (bonusState.expiresAt === null) {
        bonusState.countdownLabel = '';
      }
    }

    syncPresalePulse();
  }

  async function updateFomoProgress() {
    const presaleContractAddress = getPresaleContractAddress();
    const readProvider = getReadProvider();
    if (!presaleContractAddress || !readProvider) return;
    if (!hasCustomRpc) return;
    if (!fomoConfig.value.enabled) return;
    try {
      const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
      if (!presaleContract) return;
      const updates = [];

      if (typeof presaleContract.getTotalTokensSold === 'function') {
        updates.push(
          presaleContract.getTotalTokensSold().then((soldRaw) => {
            const sold = parseFloat(ethers.formatUnits(soldRaw, 18));
            if (!Number.isNaN(sold)) {
              fomoConfig.value.soldAmount = sold;
            }
          })
        );
      }

      const uniqueBuyerFunction = ['getUniqueBuyerCount', 'getTotalBuyerCount', 'getBuyerCount'].find(
        (fn) => typeof presaleContract[fn] === 'function'
      );
      if (uniqueBuyerFunction) {
        updates.push(
          presaleContract[uniqueBuyerFunction]().then((countRaw) => {
            const count = toSafeInteger(countRaw);
            if (count !== null && count >= 0) {
              fomoConfig.value.uniqueBuyers = count;
            }
          })
        );
      }

      if (
        typeof presaleContract.getNextPriceIncreaseTime === 'function' &&
        typeof presaleContract.getCurrentTime === 'function'
      ) {
        updates.push(
          Promise.all([
            presaleContract.getNextPriceIncreaseTime(),
            presaleContract.getCurrentTime(),
          ]).then(([nextRaw, currentRaw]) => {
            const chainNext = Number(nextRaw);
            const chainCurrent = Number(currentRaw);
            if (!Number.isFinite(chainNext) || !Number.isFinite(chainCurrent)) {
              return;
            }

            const delta = chainNext - chainCurrent;
            const nowSeconds = Math.floor(Date.now() / 1000);
            const adjustedTimestamp =
              delta > 0 ? nowSeconds + delta : Math.max(nowSeconds, chainNext);
            fomoConfig.value.nextPhaseTimestamp = adjustedTimestamp;
          })
        );
      }

      if (updates.length) {
        await Promise.allSettled(updates);
      }

      syncPresalePulse();
    } catch (error) {
      console.warn('Unable to refresh FOMO progress', error);
    }
  }

  /**
   * Apply FOMO config from site content (called from the pageContent watcher).
   * @param {Object} fomoRaw - the `progressFomo` block from presale content
   */
  function applyFomoConfig(fomoRaw) {
    if (!fomoRaw || typeof fomoRaw !== 'object') {
      fomoRaw = {};
    }
    const total = Number.parseFloat(fomoRaw.totalAllocation || 0) || 0;
    const sold = Number.parseFloat(fomoRaw.soldAmount || 0) || 0;
    const nextPhaseTimestamp = Number.parseInt(fomoRaw.nextPhaseTimestamp || 0, 10);
    const showFuse = fomoRaw.showFuse === undefined ? true : Boolean(fomoRaw.showFuse);
    const animates = fomoRaw.animates === undefined ? true : Boolean(fomoRaw.animates);
    const uniqueBuyersRaw = toSafeInteger(fomoRaw.uniqueBuyers);
    const priceScheduleTitle =
      typeof fomoRaw.priceScheduleTitle === 'string' && fomoRaw.priceScheduleTitle.trim()
        ? fomoRaw.priceScheduleTitle.trim()
        : '';
    const priceScheduleSubtitle =
      typeof fomoRaw.priceScheduleSubtitle === 'string' && fomoRaw.priceScheduleSubtitle.trim()
        ? fomoRaw.priceScheduleSubtitle.trim()
        : '';
    const priceSchedule = normalizePriceSchedule(fomoRaw.priceSchedule);

    fomoConfig.value = {
      enabled: Boolean(total > 0 && fomoRaw.enabled !== false),
      totalAllocation: total,
      soldAmount: sold,
      uniqueBuyers:
        uniqueBuyersRaw !== null && uniqueBuyersRaw >= 0
          ? uniqueBuyersRaw
          : fomoConfig.value.uniqueBuyers || 0,
      nextPhaseTimestamp:
        nextPhaseTimestamp > 0 ? nextPhaseTimestamp : Math.floor(Date.now() / 1000) + 3600,
      title: fomoRaw.title || 'Presale momentum',
      caption:
        fomoRaw.caption || 'Limited supply. Secure your spot before the next price increase triggers.',
      showFuse,
      animates,
      priceScheduleTitle,
      priceScheduleSubtitle,
      priceSchedule: priceSchedule.length ? priceSchedule : fomoConfig.value.priceSchedule,
    };
  }

  function startLiveMetrics() {
    if (typeof window === 'undefined') return;
    if (liveMetricsInterval) {
      window.clearInterval(liveMetricsInterval);
    }
    liveMetricsInterval = window.setInterval(() => {
      updateFomoProgress().catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('Unable to refresh live presale metrics', error);
        }
      });
    }, 15000);
  }

  function stopLiveMetrics() {
    if (liveMetricsInterval) {
      if (typeof window !== 'undefined') {
        window.clearInterval(liveMetricsInterval);
      } else {
        clearInterval(liveMetricsInterval);
      }
      liveMetricsInterval = null;
    }
  }

  // Set up the fomoProgressOverride watcher if provided
  if (fomoProgressOverride && typeof fomoProgressOverride === 'object') {
    watch(
      () => fomoProgressOverride.value,
      (override) => {
        if (!override || typeof override !== 'object') return;
        const nextConfig = {
          ...fomoConfig.value,
          ...override,
        };
        nextConfig.enabled = override.enabled ?? fomoConfig.value.enabled;

        if (override.priceSchedule !== undefined) {
          const sanitizedSchedule = normalizePriceSchedule(override.priceSchedule);
          nextConfig.priceSchedule = sanitizedSchedule.length
            ? sanitizedSchedule
            : fomoConfig.value.priceSchedule;
        }

        if (override.uniqueBuyers !== undefined) {
          const overrideUnique = toSafeInteger(override.uniqueBuyers);
          if (overrideUnique !== null && overrideUnique >= 0) {
            nextConfig.uniqueBuyers = overrideUnique;
          }
        }

        if (typeof override.priceScheduleTitle === 'string') {
          nextConfig.priceScheduleTitle = override.priceScheduleTitle.trim();
        }

        if (typeof override.priceScheduleSubtitle === 'string') {
          nextConfig.priceScheduleSubtitle = override.priceScheduleSubtitle.trim();
        }

        fomoConfig.value = nextConfig;
        if (override?.bonusIncentive || override?.bonus) {
          applyBonusOverride(override.bonusIncentive || override.bonus);
        } else {
          syncPresalePulse();
        }
      },
      { immediate: true }
    );
  }

  return {
    // State
    fomoConfig,
    priceTimeline,
    bonusState,

    // Computeds
    bonusDisplay,
    priceTimelineId,
    priceTimelineTitle,
    priceTimelineSubtitle,
    priceTimelineEntries,
    showPriceTimeline,

    // Functions
    syncPresalePulse,
    updateFomoProgress,
    resetBonusState,
    applyBonusConfig,
    applyBonusOverride,
    applyFomoConfig,
    startLiveMetrics,
    stopLiveMetrics,
  };
}
