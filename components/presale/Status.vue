<template>
  <div
    id="leftPresale"
    class="status-layout text-center equal-height"
    :class="statusLayoutStateClasses"
  >
    <div class="status-card">
      <div
        id="presaleLive"
        v-if="showPresaleLive"
        class="status-card__line status-card__line--headline ui-title-md"
      >
        <span class="status-dot status-dot--live" aria-hidden="true"></span>{{ presaleStatus }}
      </div>
      <div
        id="presaleComplete"
        v-if="showPresaleComplete"
        class="status-card__line ui-title-sm"
      >
        <span class="status-dot status-dot--complete" aria-hidden="true"></span>{{ presaleCompleteLabel }}
      </div>
      <div
        id="claimLive"
        v-if="showClaimLive"
        class="status-card__line ui-title-sm"
      >
        <span class="status-dot status-dot--live" aria-hidden="true"></span>{{ unstakedClaimLabel }}
      </div>
      <div
        id="stakedClaimLive"
        v-if="showStakedClaimLive"
        class="status-card__line ui-title-sm"
      >
        <span class="status-dot status-dot--live" aria-hidden="true"></span>{{ stakedClaimLabel }}
      </div>
      <div v-if="shouldRenderCountdownSlot" class="status-countdown-slot">
        <CountdownTimer
          v-if="showCountdown && countdownReady"
          class="status-countdown"
          :label="countdownLabel"
          :target-timestamp="countdownTarget"
          :unit-suffixes="countdownUnitSuffixes"
          @expired="handleCountdownExpired"
        />
        <div
          v-else-if="showCountdown && showCountdownLoader"
          class="status-countdown status-countdown--loading"
        >
          <SkeletonPulse
            width="100%"
            height="72px"
            radius="24px"
            :label="countdownLoadingLabel"
          />
        </div>
        <p
          v-else-if="countdownFallbackMessage"
          class="status-countdown__placeholder ui-label-sm"
        >
          {{ countdownFallbackMessage }}
        </p>
      </div>
      <div
        id="priceDiv"
        v-if="showPriceDiv"
        class="status-card__price"
      >
        <div class="status-card__price-body">
          <span class="status-card__price-prefix">1 {{ tokenUnitLabel }}</span>
          <div class="status-card__price-highlight">
            <span class="status-card__price-value" :data-loading="isPriceLoading">
              <SkeletonPulse
                v-if="isPriceLoading"
                class="status-card__price-loader"
                width="9ch"
                height="2.6rem"
                radius="16px"
                :label="priceLoadingLabel"
                inline
              />
              <span v-else class="status-card__price-number">{{ displayTokenPrice }}</span>
            </span>
            <UnitChip
              v-if="!isPriceLoading"
              class="status-card__price-chip"
              label="USD"
            />
          </div>
        </div>
        <p class="status-card__price-context ui-label-sm">
          <span v-if="isPriceLoading">{{ priceLoadingLabel }}</span>
          <span v-else>{{ priceContextLabel }}</span>
        </p>
      </div>
      <div
        v-if="shouldShowMetricsGrid"
        class="status-card__metrics ui-grid-sm-2"
        role="list"
      >
        <StatusMetric
          v-for="metric in combinedMetrics"
          :key="metric.id"
          :label="metric.label"
          :icon="metric.icon"
          :tooltip="metric.tooltip"
          :loading="metric.loading"
          :loader-width="metric.loaderWidth"
          :value="metric.value"
          :unit="metric.unit"
          :class="[
            metric.id?.startsWith('metric-personal-') ? 'status-metric--personal' : '',
            metric.id === 'metric-supply' ? 'status-metric--allocation' : '',
          ]"
        />
      </div>
      <p
        v-else-if="shouldShowEmptyMessage"
        class="status-card__empty ui-label-sm"
      >
        {{ emptyMetricsLabel }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { ethers } from 'ethers';
import CountdownTimer from './CountdownTimer.vue';
import StatusMetric from './StatusMetric.vue';
import { formatDecimal, formatUsd } from '@d2sg/cms/utils/formatNumber';
import UnitChip from '@d2sg/cms/components/ui/UnitChip.vue';
import SkeletonPulse from '@d2sg/cms/components/ui/SkeletonPulse.vue';
import { getPresaleReadContract, getRegistryContract } from '@d2sg/cms/utils/presaleContracts';

let readProvider;
let presaleContractAddress;

const TOKEN_TICKER = import.meta.env.VITE_TOKEN;
const CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
const RPC_READ = import.meta.env.VITE_RPC_READ;
const tokenUnitLabel = computed(() => {
  const ticker = (TOKEN_TICKER || '').trim();
  return ticker ? `$${ticker.toUpperCase()}` : '$TOKEN';
});

const showPresaleLive = ref(false);
const showPresaleComplete = ref(false);
const showCountdown = ref(true);
const showClaimLive = ref(false);
const showStakedClaimLive = ref(false);
const showPriceDiv = ref(true);
const currentTokenPrice = ref('');
const isPriceLoading = ref(true);
const countdownLoading = ref(true);
const countdownHasExpired = ref(false);

const STATUS_REFRESH_INTERVAL_MS = 45000;
let statusRefreshIntervalId = null;

const DEFAULT_AMOUNT_RAISED_LABEL = 'Amount raised';
const DEFAULT_TIME_REMAINING_LABEL = 'Time remaining';
const DEFAULT_ENDING_NOW_LABEL = 'Ending now';
const DEFAULT_PRESALE_ENDED_LABEL = 'Presale ended';
const DEFAULT_METRIC_PURCHASED_LABEL = 'Purchased';
const DEFAULT_METRIC_SUPPLY_LABEL = 'Allocation';
const DEFAULT_METRIC_WALLETS_LABEL = 'Wallets Connected';
const DEFAULT_PRICE_PLACEHOLDER = '—';
const DEFAULT_COUNTDOWN_PENDING_LABEL = 'Updating schedule…';
const DEFAULT_PERSONAL_PURCHASED_LABEL = 'Your purchased';
const DEFAULT_PERSONAL_STAKED_LABEL = 'Your staked';
const DEFAULT_PERSONAL_STAKEABLE_LABEL = 'Stakeable';
const DEFAULT_PERSONAL_REWARDS_LABEL = 'Rewards';
const DEFAULT_STATUS_PRESALE_COMPLETE = 'Presale is Complete';
const DEFAULT_STATUS_CLAIM_LIVE = 'Unstaked Claim is Live';
const DEFAULT_STATUS_STAKED_CLAIM = 'Token Claim is Live';
const DEFAULT_STATUS_COUNTDOWN_LOADING = 'Countdown is loading';
const DEFAULT_STATUS_PRICE_LOADING = 'Token price is loading';
const DEFAULT_STATUS_EMPTY_METRICS = 'Presale metrics will appear once activity starts.';
const DEFAULT_STATUS_PRICE_CONTEXT = 'Live token price';
const DEFAULT_COUNTDOWN_UNIT_SUFFIXES = Object.freeze({
  day: { singular: 'DAY', plural: 'DAYS' },
  hour: { singular: 'HR', plural: 'HRS' },
  minute: { singular: 'MIN', plural: 'MINS' },
  second: { singular: 'SEC', plural: 'SECS' },
});

function sanitizeLabel(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

function sanitizeCountdownUnits(units) {
  const keys = ['day', 'hour', 'minute', 'second'];
  const fallback = DEFAULT_COUNTDOWN_UNIT_SUFFIXES;
  const hasUnits = units && typeof units === 'object';
  const result = {};

  for (const key of keys) {
    const fallbackEntry = fallback[key] || { singular: '', plural: '' };
    const source = hasUnits ? units[key] : undefined;

    if (typeof source === 'string') {
      const trimmed = source.trim();
      const normalized = trimmed || fallbackEntry.singular || fallbackEntry.plural || '';
      result[key] = { singular: normalized, plural: normalized };
      continue;
    }

    if (source && typeof source === 'object') {
      const pick = (candidates) => {
        for (const candidate of candidates) {
          const raw = source[candidate];
          if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed) return trimmed;
          }
        }
        return '';
      };

      const singular = pick(['singular', 'one', 'single', 'short', 'label', 'default']);
      const plural = pick(['plural', 'many', 'multiple', 'label', 'default']);
      result[key] = {
        singular: singular || plural || fallbackEntry.singular || fallbackEntry.plural || '',
        plural: plural || singular || fallbackEntry.plural || fallbackEntry.singular || '',
      };
      continue;
    }

    result[key] = {
      singular: fallbackEntry.singular || fallbackEntry.plural || '',
      plural: fallbackEntry.plural || fallbackEntry.singular || '',
    };
  }

  return result;
}

const amountRaisedLabel = ref(DEFAULT_AMOUNT_RAISED_LABEL);
const timeEndingLabel = ref(DEFAULT_ENDING_NOW_LABEL);
const presaleEndedLabel = ref(DEFAULT_PRESALE_ENDED_LABEL);
const metricPurchasedLabel = ref(DEFAULT_METRIC_PURCHASED_LABEL);
const metricSupplyLabel = ref(DEFAULT_METRIC_SUPPLY_LABEL);
const metricWalletsLabel = ref(DEFAULT_METRIC_WALLETS_LABEL);
const countdownPendingLabel = ref(DEFAULT_COUNTDOWN_PENDING_LABEL);
const personalPurchasedLabel = ref('');
const personalStakedLabel = ref('');
const personalStakeableLabel = ref('');
const personalRewardsLabel = ref('');
const countdownUnitSuffixes = ref(sanitizeCountdownUnits());

const displayTokenPrice = computed(() => {
  const price = currentTokenPrice.value;
  if (!price || price === DEFAULT_PRICE_PLACEHOLDER) {
    return price;
  }
  return price.startsWith('$') ? price : `$${price}`;
});

async function fetchPresaleContractAddress() {
  if (!readProvider) {
    throw new Error('Presale status: read provider is not initialised.');
  }
  const registryContract = getRegistryContract(CONTRACT_REGISTRY_ADDRESS, readProvider);
  if (!registryContract) {
    throw new Error('Presale status: registry contract could not be created.');
  }
  const resolvedAddress = await registryContract.getContractAddress(`${TOKEN_TICKER}-PRESALE`);
  if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
    throw new Error(`Presale status: contract address missing for token "${TOKEN_TICKER}".`);
  }
  presaleContractAddress = resolvedAddress;
}

async function getCurrentPrice() {
  if (!showPriceDiv.value) {
    isPriceLoading.value = false;
    return;
  }
  if (!presaleContractAddress || !readProvider) {
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    isPriceLoading.value = false;
    return;
  }
  isPriceLoading.value = true;
  try {
    const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
    if (!presaleContract) {
      currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
      return;
    }
    const currentPrice = await presaleContract.getCurrentTokenPrice();
    const numericPrice = Number.parseFloat(ethers.formatUnits(currentPrice, 18));
    if (Number.isFinite(numericPrice) && numericPrice > 0) {
      currentTokenPrice.value = formatDecimal(numericPrice, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    } else {
      currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    }
  } catch (error) {
    console.warn('Failed to load current token price', error);
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
  } finally {
    isPriceLoading.value = false;
  }
}

async function updateCountdownTarget() {
  if (!showCountdown.value) {
    countdownTarget.value = null;
    countdownLoading.value = false;
    countdownHasExpired.value = false;
    return;
  }
  if (!presaleContractAddress || !readProvider) {
    countdownTarget.value = null;
    countdownLoading.value = false;
    countdownHasExpired.value = false;
    return;
  }
  countdownLoading.value = true;
  try {
    const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
    if (!presaleContract) {
      countdownTarget.value = null;
      return;
    }
    const nextPriceIncreaseTime = await presaleContract.getNextPriceIncreaseTime();
    const parsed = Number(nextPriceIncreaseTime);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Number.isFinite(parsed) && parsed > nowSeconds) {
      countdownTarget.value = parsed;
      countdownHasExpired.value = false;
    } else if (Number.isFinite(parsed)) {
      countdownTarget.value = null;
      countdownHasExpired.value = true;
    } else {
      countdownTarget.value = null;
      countdownHasExpired.value = false;
    }
  } catch (error) {
    console.warn('Failed to resolve next price increase time', error);
    countdownTarget.value = null;
    countdownHasExpired.value = false;
  } finally {
    countdownLoading.value = false;
  }
}

let statusRefreshPromise = null;
async function refreshStatusData() {
  if (statusRefreshPromise) {
    return statusRefreshPromise;
  }
  statusRefreshPromise = (async () => {
    try {
      await checkPresaleStatus();
      await getCurrentPrice();
    } finally {
      statusRefreshPromise = null;
    }
  })();
  return statusRefreshPromise;
}

function startStatusRefreshLoop() {
  if (statusRefreshIntervalId !== null) return;
  if (typeof window === 'undefined' || typeof window.setInterval !== 'function') return;
  statusRefreshIntervalId = window.setInterval(() => {
    refreshStatusData().catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('Periodic presale status refresh failed', error);
      }
    });
  }, STATUS_REFRESH_INTERVAL_MS);
}

function stopStatusRefreshLoop() {
  if (statusRefreshIntervalId === null) return;
  if (typeof window !== 'undefined' && typeof window.clearInterval === 'function') {
    window.clearInterval(statusRefreshIntervalId);
  } else {
    clearInterval(statusRefreshIntervalId);
  }
  statusRefreshIntervalId = null;
}

async function checkPresaleStatus() {
  if (!presaleContractAddress || !readProvider) return;
  const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
  if (!presaleContract) return;
  const presaleFlag = await presaleContract.getPresaleFlag();
  const claimFlag = await presaleContract.getClaimFlag();
  const stakedClaimFlag = await presaleContract.getStakedClaimFlag();

  if (presaleFlag) {
    showPresaleLive.value = true;
    showPresaleComplete.value = false;
    showCountdown.value = true;
    showClaimLive.value = false;
    showStakedClaimLive.value = false;
    showPriceDiv.value = true;
  } else {
    showPresaleLive.value = false;
    showPresaleComplete.value = true;
    showCountdown.value = false;
    showPriceDiv.value = false;
    countdownLoading.value = false;
    countdownTarget.value = null;
    isPriceLoading.value = false;
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
  }

  if (!presaleFlag && claimFlag && stakedClaimFlag) {
    showClaimLive.value = false;
    showStakedClaimLive.value = true;
  } else if (!presaleFlag && claimFlag && !stakedClaimFlag) {
    showClaimLive.value = true;
    showStakedClaimLive.value = false;
  } else {
    showClaimLive.value = false;
  }

  if (presaleFlag || !claimFlag || !stakedClaimFlag) {
    showStakedClaimLive.value = false;
  }

  if (showCountdown.value) {
    countdownLoading.value = true;
    await updateCountdownTarget();
  } else {
    countdownTarget.value = null;
    countdownLoading.value = false;
  }
}

const presaleStatus = ref('');
const countdownLabel = ref('Next price increase in');
const countdownTarget = ref(null);
let countdownRefreshInFlight = false;
const countdownReady = computed(
  () => showCountdown.value && !countdownLoading.value && countdownTarget.value !== null
);
const showCountdownLoader = computed(
  () => showCountdown.value && countdownLoading.value
);
const countdownFallbackMessage = computed(() => {
  if (showPresaleComplete.value) {
    return presaleEndedLabel.value || '';
  }
  if (!showCountdown.value || countdownLoading.value) return '';
  if (countdownHasExpired.value) {
    return timeEndingLabel.value || '';
  }
  return countdownTarget.value === null ? countdownPendingLabel.value : '';
});
const shouldRenderCountdownSlot = computed(
  () => showCountdown.value || Boolean(countdownFallbackMessage.value)
);

const pageContent = inject('pageContent', ref({}));
const presalePulse = inject('presalePulse', null);
const personalPresaleSummary = inject(
  'personalPresaleSummary',
  ref({
    isConnected: false,
    isHydrated: false,
    purchased: 0,
    purchasedFormatted: '0',
    staked: 0,
    stakedFormatted: '0',
  })
);
const statusCopyConfig = computed(() => pageContent.value?.presale?.statusCopy || {});
const presaleCompleteLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.presaleComplete, DEFAULT_STATUS_PRESALE_COMPLETE)
);
const unstakedClaimLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.claimLive, DEFAULT_STATUS_CLAIM_LIVE)
);
const stakedClaimLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.stakedClaimLive, DEFAULT_STATUS_STAKED_CLAIM)
);
const countdownLoadingLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.countdownLoading, DEFAULT_STATUS_COUNTDOWN_LOADING)
);
const priceLoadingLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.priceLoading, DEFAULT_STATUS_PRICE_LOADING)
);
const priceContextLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.priceContext, DEFAULT_STATUS_PRICE_CONTEXT)
);
const emptyMetricsLabel = computed(() =>
  sanitizeLabel(statusCopyConfig.value?.emptyMetrics, DEFAULT_STATUS_EMPTY_METRICS)
);

const safePresalePulse = computed(() => {
  if (!presalePulse || typeof presalePulse !== 'object') return null;
  return presalePulse.value && typeof presalePulse.value === 'object'
    ? presalePulse.value
    : null;
});
const isPulseHydrated = computed(() => Boolean(safePresalePulse.value?.isHydrated));
const presaleActivitySnapshot = computed(() => {
  const pulse = safePresalePulse.value || {};
  const raised = Number(pulse.totalUsdRaised) || 0;
  const sold = Number(pulse.soldAmount) || 0;
  const buyers = Number(pulse.uniqueBuyers) || 0;
  return {
    raised,
    sold,
    buyers,
  };
});
const hasPresaleActivity = computed(() => {
  if (!isPulseHydrated.value) return false;
  const snapshot = presaleActivitySnapshot.value;
  return snapshot.raised > 0 || snapshot.sold > 0 || snapshot.buyers > 0;
});

const metricsLoading = computed(() => !isPulseHydrated.value);

const globalMetrics = computed(() => {
  const pulse = safePresalePulse.value || {};
  const loading = metricsLoading.value;
  const tokenLabel = tokenUnitLabel.value;
  const hiddenMetricIds = new Set(['metric-purchased', 'metric-wallets']);
  const metrics = [
    {
      id: 'metric-raised',
      label: amountRaisedLabel.value,
      value: loading ? null : amountRaisedValue.value,
      icon: 'currency',
      unit: 'USD',
      loading,
      loaderWidth: '12ch',
    },
    {
      id: 'metric-purchased',
      label: metricPurchasedLabel.value,
      value: loading
        ? null
        : formatDecimal(pulse.soldAmount, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
      icon: 'purchase',
      unit: tokenLabel,
      loading,
      loaderWidth: '9ch',
    },
    {
      id: 'metric-supply',
      label: metricSupplyLabel.value,
      value: loading
        ? null
        : formatDecimal(pulse.totalAllocation, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
      icon: 'supply',
      unit: tokenLabel,
      loading,
      loaderWidth: '9ch',
    },
    {
      id: 'metric-wallets',
      label: metricWalletsLabel.value,
      value: loading
        ? null
        : formatDecimal(pulse.uniqueBuyers, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
      icon: 'wallet',
      unit: 'Wallets',
      loading,
      loaderWidth: '8ch',
    },
  ];
  return metrics.filter((metric) => Boolean(metric.label) && !hiddenMetricIds.has(metric.id));
});

const personalSummaryData = computed(() => {
  const summary = personalPresaleSummary?.value || {};
  const connected = Boolean(summary.isConnected);
  const hydrated = Boolean(summary.isHydrated);
  const purchased = Number(summary.purchased) || 0;
  const staked = Number(summary.staked) || 0;
  const stakeable = Number(summary.stakeable) || 0;
  const rewards = Number(summary.rewards) || 0;
  const purchasedFormatted =
    typeof summary.purchasedFormatted === 'string' && summary.purchasedFormatted.trim()
      ? summary.purchasedFormatted.trim()
      : formatDecimal(purchased, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const stakedFormatted =
    typeof summary.stakedFormatted === 'string' && summary.stakedFormatted.trim()
      ? summary.stakedFormatted.trim()
      : formatDecimal(staked, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const stakeableFormatted =
    typeof summary.stakeableFormatted === 'string' && summary.stakeableFormatted.trim()
      ? summary.stakeableFormatted.trim()
      : formatDecimal(stakeable, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const rewardsFormatted =
    typeof summary.rewardsFormatted === 'string' && summary.rewardsFormatted.trim()
      ? summary.rewardsFormatted.trim()
      : formatDecimal(rewards, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return {
    isConnected: connected,
    isHydrated: hydrated,
    purchased,
    purchasedFormatted,
    staked,
    stakedFormatted,
    stakeable,
    stakeableFormatted,
    rewards,
    rewardsFormatted,
  };
});

const showPersonalMetrics = computed(() => personalSummaryData.value.isConnected);
const statusLayoutStateClasses = computed(() => ({
  'status-layout--hide-allocation-mobile': !showPersonalMetrics.value,
}));

const personalMetrics = computed(() => {
  if (!showPersonalMetrics.value) return [];
  const tokenLabel = tokenUnitLabel.value || '$TOKEN';
  const loading = !personalSummaryData.value.isHydrated;
  return [
    {
      id: 'metric-personal-purchased',
      label: personalPurchasedLabel.value || `${DEFAULT_PERSONAL_PURCHASED_LABEL} ${tokenLabel}`,
      value: personalSummaryData.value.purchasedFormatted,
      icon: 'purchase',
      unit: tokenLabel,
      loading,
      loaderWidth: '9ch',
    },
    {
      id: 'metric-personal-staked',
      label: personalStakedLabel.value || `${DEFAULT_PERSONAL_STAKED_LABEL} ${tokenLabel}`,
      value: personalSummaryData.value.stakedFormatted,
      icon: 'stake',
      unit: tokenLabel,
      loading,
      loaderWidth: '9ch',
    },
    {
      id: 'metric-personal-stakeable',
      label:
        personalStakeableLabel.value ||
        `${DEFAULT_PERSONAL_STAKEABLE_LABEL} ${tokenLabel}`,
      value: personalSummaryData.value.stakeableFormatted,
      icon: 'token',
      unit: tokenLabel,
      loading,
      loaderWidth: '9ch',
    },
    {
      id: 'metric-personal-rewards',
      label:
        personalRewardsLabel.value ||
        `${tokenLabel} ${DEFAULT_PERSONAL_REWARDS_LABEL}`,
      value: personalSummaryData.value.rewardsFormatted,
      icon: 'rewards',
      unit: tokenLabel,
      loading,
      loaderWidth: '9ch',
    },
  ];
});

const combinedMetrics = computed(() => {
  const metrics = [...globalMetrics.value];
  if (showPersonalMetrics.value) {
    metrics.push(...personalMetrics.value);
  }
  return metrics;
});

const shouldShowMetricsGrid = computed(() => {
  if (combinedMetrics.value.length === 0) return false;
  if (metricsLoading.value) return true;
  if (hasPresaleActivity.value) return true;
  if (showPersonalMetrics.value) return true;
  return false;
});

const shouldShowEmptyMessage = computed(
  () =>
    hasGlobalMetrics.value &&
    !metricsLoading.value &&
    !hasPresaleActivity.value &&
    !showPersonalMetrics.value
);

const amountRaisedValue = computed(() => {
  if (!isPulseHydrated.value) return null;
  const pulse = safePresalePulse.value;
  let formatted = '';
  if (pulse && typeof pulse.totalUsdRaisedFormatted === 'string') {
    formatted = pulse.totalUsdRaisedFormatted.trim();
  }
  if (!formatted && pulse && pulse.totalUsdRaised !== undefined) {
    formatted = formatUsd(Math.max(Number(pulse.totalUsdRaised) || 0, 0), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (!formatted) {
    formatted = formatUsd(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return formatted;
});

const hasGlobalMetrics = computed(() =>
  Array.isArray(globalMetrics.value) && globalMetrics.value.length > 0
);

watch(
  () => pageContent.value,
  (content) => {
    const presaleContent = content?.presale || {};
    presaleStatus.value = presaleContent.presaleStatus || '';
    amountRaisedLabel.value = sanitizeLabel(
      presaleContent.amountRaisedLabel,
      DEFAULT_AMOUNT_RAISED_LABEL
    );
    const tokenLabel = tokenUnitLabel.value || '$TOKEN';
    metricPurchasedLabel.value = sanitizeLabel(
      presaleContent.metricPurchasedLabel,
      `Purchased ${tokenLabel}`
    );
    metricSupplyLabel.value = sanitizeLabel(
      presaleContent.metricSupplyLabel,
      `Presale ${tokenLabel} Allocation`
    );
    metricWalletsLabel.value = sanitizeLabel(
      presaleContent.metricWalletsLabel,
      DEFAULT_METRIC_WALLETS_LABEL
    );
    timeEndingLabel.value = sanitizeLabel(
      presaleContent.timeEndingLabel,
      DEFAULT_ENDING_NOW_LABEL
    );
    presaleEndedLabel.value = sanitizeLabel(
      presaleContent.timeEndedLabel,
      DEFAULT_PRESALE_ENDED_LABEL
    );
    const fallbackCountdownLabel =
      typeof presaleContent.timeRemainingLabel === 'string'
        ? presaleContent.timeRemainingLabel
        : DEFAULT_TIME_REMAINING_LABEL;
    countdownLabel.value = sanitizeLabel(
      presaleContent.countdownLabel || fallbackCountdownLabel,
      countdownLabel.value
    );
    countdownPendingLabel.value = sanitizeLabel(
      presaleContent.countdownPendingLabel,
      DEFAULT_COUNTDOWN_PENDING_LABEL
    );
    countdownUnitSuffixes.value = sanitizeCountdownUnits(presaleContent.countdownUnits);
    personalPurchasedLabel.value = sanitizeLabel(
      presaleContent.personalPurchasedLabel,
      `${DEFAULT_PERSONAL_PURCHASED_LABEL} ${tokenLabel}`
    );
    personalStakedLabel.value = sanitizeLabel(
      presaleContent.personalStakedLabel,
      `${DEFAULT_PERSONAL_STAKED_LABEL} ${tokenLabel}`
    );
    personalStakeableLabel.value = sanitizeLabel(
      presaleContent.personalStakeableLabel,
      `${DEFAULT_PERSONAL_STAKEABLE_LABEL} ${tokenLabel}`
    );
    personalRewardsLabel.value = sanitizeLabel(
      presaleContent.personalRewardsLabel,
      `${tokenLabel} ${DEFAULT_PERSONAL_REWARDS_LABEL}`
    );
  },
  { immediate: true }
);

async function handleCountdownExpired() {
  if (!showCountdown.value || countdownLoading.value || countdownRefreshInFlight) return;
  countdownRefreshInFlight = true;
  try {
    countdownHasExpired.value = true;
    await refreshStatusData();
  } catch (error) {
    console.warn('Failed to refresh status after countdown expiry', error);
  } finally {
    countdownRefreshInFlight = false;
  }
}

watch(
  () => showCountdown.value,
  (value) => {
    if (value) {
      stopStatusRefreshLoop();
      countdownHasExpired.value = false;
      countdownLoading.value = true;
      updateCountdownTarget();
    } else {
      startStatusRefreshLoop();
      countdownTarget.value = null;
      countdownLoading.value = false;
      countdownHasExpired.value = false;
    }
  }
);

onMounted(async () => {
  if (!TOKEN_TICKER || !TOKEN_TICKER.trim()) {
    countdownLoading.value = false;
    isPriceLoading.value = false;
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    throw new Error('Presale status: VITE_TOKEN is not configured.');
  }
  if (!CONTRACT_REGISTRY_ADDRESS || !CONTRACT_REGISTRY_ADDRESS.trim()) {
    countdownLoading.value = false;
    isPriceLoading.value = false;
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    throw new Error('Presale status: VITE_REGISTRY_ADDRESS is not configured.');
  }
  if (!RPC_READ || typeof RPC_READ !== 'string' || !RPC_READ.trim()) {
    countdownLoading.value = false;
    isPriceLoading.value = false;
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    throw new Error('Presale status: VITE_RPC_READ is not configured.');
  }

  try {
    readProvider = new ethers.JsonRpcProvider(RPC_READ);
  } catch (error) {
    countdownLoading.value = false;
    isPriceLoading.value = false;
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    throw error;
  }

  try {
    await fetchPresaleContractAddress();
    await refreshStatusData();
  } catch (error) {
    countdownLoading.value = false;
    isPriceLoading.value = false;
    currentTokenPrice.value = DEFAULT_PRICE_PLACEHOLDER;
    throw error;
  }
});

onUnmounted(() => {
  countdownTarget.value = null;
  stopStatusRefreshLoop();
});
</script>

<style scoped>
.status-layout {
  width: 100%;
}

.equal-height {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.status-card {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--ui-gap-lg, 32px);
}

.status-card__line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
}

.status-card__line + .status-card__line {
  margin-top: clamp(6px, 1vw, 10px);
}

.status-card__line--headline {
  padding: clamp(12px, 2.2vw, 18px) clamp(16px, 3vw, 24px);
  border-radius: 16px;
  background: var(
    --status-headline-bg,
    linear-gradient(120deg, rgba(79, 108, 240, 0.12), rgba(28, 42, 96, 0.14))
  );
  box-shadow: var(
    --status-headline-shadow,
    0 12px 24px rgba(28, 42, 96, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.4)
  );
  color: var(--status-headline-color, var(--brand-accent-electric, #4f6cf0));
}

.status-card__metrics {
  margin-top: clamp(5px, 0.7vw, 11px);
  width: 100%;
}

.status-card__empty {
  margin: 0;
  text-align: center;
  color: var(--brand-fg-300);
  line-height: 1.5;
}

.status-card__price {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 1vw, 10px);
  padding: clamp(12px, 1.8vw, 18px) 0 0;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: var(--brand-fg-300, #a798b0);
  width: 100%;
}

.status-card__price-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1px, 0.4vw, 4px);
}

.status-card__price-highlight {
  display: inline-flex;
  align-items: center;
  gap: clamp(6px, 1vw, 10px);
  white-space: nowrap;
  justify-content: center;
}

.status-card__price-prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  font-size: clamp(0.75rem, 1vw, 0.85rem);
  letter-spacing: 0.16em;
  color: var(--brand-fg-300, #a798b0);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

.status-card__price-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5ch;
  font-size: clamp(1.8rem, 2.4vw, 2.3rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--status-price-value-color, var(--brand-fg-050, #fdfbff));
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
  text-shadow: var(
    --status-price-value-shadow,
    0 0 22px rgba(79, 108, 240, 0.24),
    0 0 48px rgba(28, 42, 96, 0.16)
  );
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.status-card__price-value[data-loading='true'] {
  font-size: clamp(1.3rem, 2vw, 1.5rem);
  font-weight: 600;
  color: var(--brand-fg-300, #a798b0);
  text-shadow: none;
  letter-spacing: 0.08em;
}

.status-card__price-loader {
  display: inline-flex;
  min-width: 9ch;
}

.status-card__price-chip {
  padding: 0 10px;
  min-height: 24px;
  margin-top: 0;
  align-self: center;
}

.status-card__price-context {
  margin: 0;
  font-size: clamp(0.68rem, 0.9vw, 0.75rem);
  letter-spacing: 0.04em;
  text-transform: none;
  color: color-mix(in srgb, var(--brand-fg-300, #a798b0) 82%, transparent);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

.status-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  flex-shrink: 0;
  margin-right: 6px;
  box-shadow: 0 0 16px color-mix(in srgb, var(--brand-accent-electric) 40%, transparent);
}

.status-dot--live {
  background: var(--brand-status-success);
}

.status-dot--complete {
  background: var(--brand-sultry-purple);
}

.status-countdown-slot {
  margin-top: clamp(-4px, 0.2vw, 6px);
}

.status-countdown {
  margin: 0 auto;
  width: 100%;
  max-width: clamp(280px, 80vw, 520px);
}

.status-countdown--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 20px;
  border: 1px solid var(--brand-surface-card-border, rgba(74, 95, 150, 0.35));
  border-radius: var(--ui-radius-card, 24px);
  background: var(--brand-surface-card-bg, #ffffff);
  box-shadow: var(--ui-shadow-card, 0 8px 24px rgba(28, 42, 96, 0.22));
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

.status-countdown__placeholder {
  margin: 0 auto;
  width: 100%;
  max-width: clamp(280px, 80vw, 520px);
  text-align: center;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--brand-fg-300, #a798b0);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

@media (max-width: 600px) {
  .status-card {
    min-height: auto;
  }

  .status-card__metrics {
    gap: 12px;
    margin-top: 4px;
  }

  .status-layout--hide-allocation-mobile :deep(.status-metric--allocation) {
    display: none;
  }

  .status-card__line + .status-card__line {
    margin-top: 2px;
  }

  .status-countdown-slot {
    margin-top: -8px;
  }

  .status-card__price {
    padding: 0;
    margin: -12px 0;
    text-align: center;
  }

  .status-card__price-body {
    width: 100%;
  }

  .status-card__price-context {
    letter-spacing: 0.04em;
  }
}

@media (max-width: 480px) {
  .status-card__price-value {
    font-size: 1.8rem;
  }
}
</style>
