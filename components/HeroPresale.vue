<template>
  <section
    id="hero-presale"
    :class="promoSectionClasses"
    :style="promoBackgroundStyle"
  >
    <div class="container text-center hero-promo">
      <div class="hero-copy" data-animation="fadeInUp" data-animation-delay="500" data-animation-duration="1500">
        <span v-if="badgeText" class="hero-badge">{{ badgeText }}</span>
        <h1 class="hero-title">
          {{ headlineText }}
        </h1>
        <p v-if="subheadlineText" class="hero-subtitle">
          {{ subheadlineText }}
        </p>
        <div class="hero-actions" data-animation="fadeInUp" data-animation-delay="800" data-animation-duration="1500">
          <button
            v-if="!isWalletConnected"
            type="button"
            class="primary-button action-pill action-pill--button"
            :aria-label="connectLabel"
            :disabled="!canOpenConnect"
            @click="handleConnectClick"
          >
            {{ connectLabel }}
          </button>
          <a
            v-else
            :href="primaryTarget"
            class="primary-button action-pill"
            :aria-label="primaryLabel"
            @click="handlePrimaryCta"
          >
            {{ primaryLabel }}
          </a>
          <a
            v-for="(action, idx) in secondaryActions"
            :key="idx"
            class="action-link"
            :href="action.href"
            :data-target="isComingSoonAction(action.href) ? null : action.href"
            @click="handleSecondaryAction($event, action)"
          >
            {{ action.text }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAppKit, useAppKitAccount } from '@reown/appkit/vue';
import { ChainController } from '@reown/appkit-controllers';
import { useComingSoonInterstitial } from '@d2sg/cms/composables/useComingSoonInterstitial';
import { usePromoBackgroundStyles } from '@d2sg/cms/composables/usePromoBackgroundStyles';
import { trackEvent, trackFunnelEvent } from '@d2sg/cms/utils/analytics';
import { requestScrollToPresale } from '../utils/scrollToPresale';
import { setPendingWalletConnectContext, peekPendingWalletConnectContext, trackWalletConnectedOnce } from '../utils/walletTracking';
import { useComingSoonResolver } from '@d2sg/cms/composables/useComingSoonConfig';
import { useResponsiveImage } from '@d2sg/cms/utils/imageSources';
import { getTokenSymbol } from '../utils/tokenFormat';

const HERO_CTA_TARGET = '#centerPresale';
const SCROLL_MARGIN = 32;
const SMALL_SCREEN_SCROLL_QUERY = '(max-width: 640px)';

const token = import.meta.env.VITE_TOKEN || '';
const normalizedToken = token.toLowerCase();
const tokenSymbol = getTokenSymbol();
const CONNECT_SOURCE = 'hero_presale';
const DEFAULT_CONNECTOR = 'appkit';
const appKitAccount = useAppKitAccount();

const { openComingSoon } = useComingSoonInterstitial();

const pageContent = inject('pageContent', ref({}));
const siteData = inject('siteData', ref({}));
const { resolve: resolveComingSoon, isComingSoonAction } = useComingSoonResolver(pageContent);

const heroData = computed(() => pageContent.value?.heroPresale || {});

function pickLabel(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

let appKit = null;
try {
  appKit = useAppKit();
} catch (error) {
  if (import.meta.env?.DEV) {
    console.warn('HeroPresale: AppKit not initialised; connect CTA will be disabled.', error);
  }
}

const canOpenConnect = computed(() => Boolean(appKit && typeof appKit.open === 'function'));
const isWalletConnected = ref(Boolean(appKit?.state?.address));
const lastConnectedAddress = ref(String(appKit?.state?.address || '').trim());
const connectLabel = computed(
  () =>
    pickLabel(
      heroData.value?.connectLabel,
      pageContent.value?.presale?.connectButtonLabel,
      siteData.value?.shared?.content?.presale?.connectButtonLabel,
      siteData.value?.pages?.home?.content?.presale?.connectButtonLabel
    ) || 'Connect Wallet'
);

const fallbackBadge = tokenSymbol ? `${tokenSymbol} Token Presale` : 'Token Presale';
const fallbackHeadline = tokenSymbol ? `${tokenSymbol} Presale Ignites Tonight` : 'Presale ignites tonight';

const badgeText = computed(() => heroData.value?.badge || fallbackBadge);
const baseHeadline = computed(() => heroData.value?.headline || fallbackHeadline);
const baseSubheadline = computed(
  () =>
    heroData.value?.subheadline ||
    'Stake-ready tokens, VIP-only drops, and seductive rewards for bold believers.'
);
const primaryCta = computed(() => {
  const value = heroData.value?.primaryCta;
  return value && typeof value === 'object' ? value : {};
});
const primaryTarget = computed(() => {
  const raw = primaryCta.value?.href;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) return trimmed;
  }
  return HERO_CTA_TARGET;
});
const primaryLabel = computed(() => {
  const label = primaryCta.value?.text;
  if (typeof label === 'string') {
    const trimmed = label.trim();
    if (trimmed) return trimmed;
  }
  return 'Join Presale';
});
const secondaryActions = computed(() => {
  const actions = Array.isArray(heroData.value?.secondaryActions) ? heroData.value.secondaryActions : [];
  return actions.map((action) => {
    if (!action || typeof action !== 'object') return action;
    const fallbackText = typeof action.text === 'string' ? action.text : '';
    const trimmed = fallbackText.trim();
    return {
      ...action,
      text: trimmed || 'Learn More',
    };
  });
});

let highlightTimeoutId = null;
let lastHighlightedElement = null;
let tempTabindexTarget = null;
let tempTabindexTimeoutId = null;
let scrollAlignmentTimeoutId = null;

function prettifyWalletProvider(value) {
  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  if (!trimmed) return 'unknown';
  const lower = trimmed.toLowerCase();
  if (lower === 'metamask') return 'MetaMask';
  if (lower === 'walletconnect') return 'WalletConnect';
  if (lower === 'coinbase' || lower === 'coinbase wallet' || lower === 'coinbase_wallet') return 'Coinbase Wallet';
  if (lower === 'appkit') return 'AppKit';
  if (lower === 'rainbow') return 'Rainbow';
  if (lower === 'zerion') return 'Zerion';
  if (lower === 'trust wallet' || lower === 'trust_wallet') return 'Trust Wallet';
  return trimmed;
}

function resolveWalletProviderName() {
  let accountState;
  if (typeof ChainController?.getAccountData === 'function') {
    accountState = ChainController.getAccountData();
  } else if (ChainController?.state?.activeChain && ChainController?.state?.chains?.get) {
    accountState = ChainController.state.chains.get(ChainController.state.activeChain)?.accountState;
  }

  const info = accountState?.connectedWalletInfo;
  const candidates = [info?.name, info?.label, info?.title, info?.id, info?.type];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return prettifyWalletProvider(candidate);
    }
  }
  if (accountState?.address) {
    return 'AppKit';
  }
  return 'unknown';
}

function normalizeChainId(value) {
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}

function resolveAccountsConnected() {
  const accounts = appKitAccount.value?.allAccounts;
  if (Array.isArray(accounts) && accounts.length > 0) {
    return accounts.length;
  }
  return 1;
}

function emitHeroConnectAttempt() {
  setPendingWalletConnectContext({
    source: CONNECT_SOURCE,
    connector: DEFAULT_CONNECTOR,
  });
  trackFunnelEvent('wallet_connect_initiated', {
    wallet_provider: DEFAULT_CONNECTOR,
    source: CONNECT_SOURCE,
  });
  trackFunnelEvent('wallet_connect_clicked', {
    wallet_provider: DEFAULT_CONNECTOR,
    source: CONNECT_SOURCE,
  });
  trackEvent('wallet_connect_initiated', {
    token: normalizedToken || 'unknown',
    connector: DEFAULT_CONNECTOR,
    source: CONNECT_SOURCE,
  });
}

function emitWalletConnectedAnalytics(address, accountsConnected = 1) {
  const pendingContext = peekPendingWalletConnectContext();
  if (!pendingContext || pendingContext.source !== CONNECT_SOURCE) return;

  const providerName = resolveWalletProviderName();
  const chainId = normalizeChainId(ChainController?.state?.activeCaipNetwork?.id);

  trackWalletConnectedOnce({
    address,
    providerName,
    chainId,
    accountsConnected,
    token: normalizedToken,
    source: CONNECT_SOURCE,
    onFirstConnect: () =>
      requestScrollToPresale({
        source: CONNECT_SOURCE,
        target: HERO_CTA_TARGET,
        trigger: 'wallet_connected',
      }),
  });
}

updateWalletState(appKitAccount.value?.address ?? appKit?.state?.address ?? '');

watch(
  () => appKitAccount.value.address,
  (nextAddress) => {
    const normalized = typeof nextAddress === 'string' ? nextAddress : '';
    updateWalletState(normalized);
  },
  { immediate: true }
);

watch(
  () => appKitAccount.value.isConnected,
  (connected) => {
    if (!connected) {
      updateWalletState('');
    }
  }
);

const DEFAULT_HERO_BACKGROUND_WIDTHS = [960, 1440, 1920];

const heroBackgroundImage = computed(() => heroData.value?.backgroundImage || 'img/promo');
const heroBackgroundWidths = computed(() => {
  const widths = heroData.value?.backgroundWidths;
  if (Array.isArray(widths) && widths.length) {
    return widths;
  }
  return DEFAULT_HERO_BACKGROUND_WIDTHS;
});

const promoImageSet = useResponsiveImage(heroBackgroundImage, {
  widths: heroBackgroundWidths,
  fallbackFormat: 'jpg',
});

onMounted(() => {
  if (typeof window === 'undefined') return;
  window.addEventListener('site:scroll-to-presale', handleExternalScrollRequest);

  updateWalletState(appKitAccount.value?.address ?? appKit?.state?.address ?? '');

  if (appKit?.state) {
    watch(
      () => appKit.state.address,
      (nextAddress) => updateWalletState(nextAddress),
      { immediate: false }
    );
  }
});

onBeforeUnmount(() => {
  if (highlightTimeoutId) {
    window.clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
  }
  if (scrollAlignmentTimeoutId) {
    window.clearTimeout(scrollAlignmentTimeoutId);
    scrollAlignmentTimeoutId = null;
  }
  if (lastHighlightedElement) {
    lastHighlightedElement.classList.remove('presale-scroll-highlight');
    lastHighlightedElement = null;
  }
  cleanupTempTabindex();
  if (typeof window !== 'undefined') {
    window.removeEventListener('site:scroll-to-presale', handleExternalScrollRequest);
  }

  const pendingContext = peekPendingWalletConnectContext();
  if (pendingContext?.source === CONNECT_SOURCE) {
    setPendingWalletConnectContext(null);
  }

});

const headlineText = computed(() => baseHeadline.value);
const subheadlineText = computed(() => baseSubheadline.value);

const promoSectionClasses = computed(() => [
  'promo-surface',
  'hero-presale-shell',
]);

const promoBackgroundStyle = usePromoBackgroundStyles({
  imageSet: promoImageSet,
});

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getHeaderOffset() {
  if (typeof document === 'undefined') return 0;
  const header = document.getElementById('js-header');
  if (!header) return 0;
  return header.offsetHeight || 0;
}

function shouldScrollToTarget(element, headerOffset) {
  if (typeof window === 'undefined' || !element) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
  if (!viewportHeight) return false;

  const topBelowViewport = rect.top >= viewportHeight - 24;
  const aboveViewport = rect.bottom <= headerOffset;
  const clippedByHeader = rect.top < headerOffset && rect.bottom > headerOffset;

  return topBelowViewport || aboveViewport || clippedByHeader;
}

function performScroll(element, headerOffset) {
  if (typeof window === 'undefined' || !element) return;
  const rect = element.getBoundingClientRect();
  const prefersCompactOffset = window.matchMedia && window.matchMedia(SMALL_SCREEN_SCROLL_QUERY).matches;
  const scrollMargin = prefersCompactOffset ? 0 : SCROLL_MARGIN;
  const targetTop = Math.max(rect.top + window.pageYOffset - headerOffset - scrollMargin, 0);
  window.scrollTo({
    top: targetTop,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
  scheduleScrollAlignment(element);
}

function cleanupTempTabindex() {
  if (typeof window !== 'undefined' && tempTabindexTimeoutId) {
    window.clearTimeout(tempTabindexTimeoutId);
    tempTabindexTimeoutId = null;
  }
  if (tempTabindexTarget) {
    tempTabindexTarget.removeAttribute('tabindex');
    tempTabindexTarget.removeAttribute('data-temp-tabindex');
    tempTabindexTarget = null;
  }
}

function focusPresaleEntry(container) {
  if (typeof window === 'undefined' || !container) return;
  const focusTarget =
    document.getElementById('presale-tab-buy') ||
    container.querySelector(
      'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ) ||
    container;

  window.requestAnimationFrame(() => {
    if (!focusTarget) return;

    if (focusTarget === container) {
      cleanupTempTabindex();
      if (!container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
        container.setAttribute('data-temp-tabindex', 'true');
        tempTabindexTarget = container;
        if (typeof window !== 'undefined') {
          tempTabindexTimeoutId = window.setTimeout(() => {
            if (tempTabindexTarget === container) {
              container.removeAttribute('tabindex');
              container.removeAttribute('data-temp-tabindex');
              tempTabindexTarget = null;
              tempTabindexTimeoutId = null;
            }
          }, 2000);
        }
      }
    } else {
      cleanupTempTabindex();
    }

    try {
      focusTarget.focus({ preventScroll: true });
    } catch (error) {
      focusTarget.focus();
    }
  });
}

function highlightPresale(container) {
  if (!container || !container.classList) return;

  if (lastHighlightedElement && lastHighlightedElement !== container) {
    lastHighlightedElement.classList.remove('presale-scroll-highlight');
  }
  if (container.classList.contains('presale-scroll-highlight')) {
    container.classList.remove('presale-scroll-highlight');
    // Force reflow so animation can restart
    void container.offsetHeight;
  }
  lastHighlightedElement = container;
  container.classList.add('presale-scroll-highlight');

  if (typeof window === 'undefined') return;
  if (highlightTimeoutId) {
    window.clearTimeout(highlightTimeoutId);
  }

  const duration = prefersReducedMotion() ? 900 : 1500;
  highlightTimeoutId = window.setTimeout(() => {
    if (container.classList.contains('presale-scroll-highlight')) {
      container.classList.remove('presale-scroll-highlight');
    }
    if (lastHighlightedElement === container) {
      lastHighlightedElement = null;
    }
    highlightTimeoutId = null;
  }, duration);
}

function scheduleScrollAlignment(element) {
  if (typeof window === 'undefined') return;
  if (scrollAlignmentTimeoutId) {
    window.clearTimeout(scrollAlignmentTimeoutId);
  }
  const delay = prefersReducedMotion() ? 120 : 260;
  scrollAlignmentTimeoutId = window.setTimeout(() => {
    scrollAlignmentTimeoutId = null;
    ensureScrollAlignment(element);
  }, delay);
}

function ensureScrollAlignment(element) {
  if (typeof window === 'undefined' || !element) return;
  const rect = element.getBoundingClientRect();
  const headerOffset = getHeaderOffset();
  const prefersCompactOffset = window.matchMedia && window.matchMedia(SMALL_SCREEN_SCROLL_QUERY).matches;
  const scrollMargin = prefersCompactOffset ? 0 : SCROLL_MARGIN;
  const desiredTop = headerOffset + scrollMargin;
  const delta = rect.top - desiredTop;
  if (Math.abs(delta) > 6) {
    window.scrollBy({
      top: delta,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }
}

function moveToPresale(element) {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !element) return false;
  const container = element.closest('#centerPresale') || element;
  const highlightTarget = container.closest('.ui-section__card') || container;
  const scrollTarget = container;
  const headerOffset = getHeaderOffset();
  const requiresScroll = shouldScrollToTarget(scrollTarget, headerOffset);

  if (requiresScroll) {
    performScroll(scrollTarget, headerOffset);
    window.requestAnimationFrame(() => {
      highlightPresale(highlightTarget);
      focusPresaleEntry(container);
    });
    return true;
  }

  highlightPresale(highlightTarget);
  focusPresaleEntry(container);
  return true;
}

function handleExternalScrollRequest(event) {
  if (typeof document === 'undefined') return;
  const detail = event?.detail || {};
  let targetElement = null;

  if (typeof detail.target === 'string' && detail.target.trim()) {
    targetElement = document.querySelector(detail.target.trim());
  }

  if (!targetElement) {
    targetElement =
      document.querySelector('#centerPresale') ||
      document.querySelector('#buyToken');
  }

  if (targetElement) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    moveToPresale(targetElement);
  }
}

function handlePrimaryCta(event) {
  trackEvent('promo_primary_cta_clicked', {
    token: normalizedToken,
    target: primaryTarget.value,
  });

  if (typeof document === 'undefined') return;

  const targetSelector = String(primaryTarget.value || HERO_CTA_TARGET).trim();
  const targetElement = targetSelector ? document.querySelector(targetSelector) : null;

  if (targetElement) {
    if (event?.preventDefault) event.preventDefault();
    moveToPresale(targetElement);
    return;
  }

  if (!targetSelector || targetSelector.startsWith('#')) {
    const fallback =
      document.querySelector('#centerPresale') ||
      document.querySelector('#buyToken');
    if (fallback) {
      if (event?.preventDefault) event.preventDefault();
      moveToPresale(fallback);
    }
  }
}

function handleConnectClick(event) {
  trackEvent('promo_primary_cta_clicked', {
    token: normalizedToken,
    target: 'connect_wallet',
  });

  if (event?.preventDefault) event.preventDefault();

  if (!canOpenConnect.value) {
    if (typeof window !== 'undefined') {
      const fallbackEvent = new CustomEvent('site:request-connect', {
        detail: { source: 'hero_presale' },
      });
      window.dispatchEvent(fallbackEvent);
    }
    return;
  }

  emitHeroConnectAttempt();

  try {
    if (appKit && typeof appKit.open === 'function') {
      appKit.open({ view: 'Connect' });
    }
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.warn('HeroPresale: failed to open AppKit connect modal', error);
    }
    setPendingWalletConnectContext(null);
  }
  if (typeof window !== 'undefined') {
    const connectEvent = new CustomEvent('site:request-connect', {
      detail: { source: 'hero_presale' },
    });
    window.dispatchEvent(connectEvent);
  }
}

function updateWalletState(address) {
  const trimmed = typeof address === 'string' ? address.trim() : '';
  if (trimmed) {
    lastConnectedAddress.value = trimmed;
    isWalletConnected.value = true;
    emitWalletConnectedAnalytics(trimmed, resolveAccountsConnected());
    return;
  }
  if (appKit?.state?.address) {
    const fallbackAddress = String(appKit.state.address || '').trim();
    if (fallbackAddress) {
      lastConnectedAddress.value = fallbackAddress;
      isWalletConnected.value = true;
      emitWalletConnectedAnalytics(fallbackAddress, resolveAccountsConnected());
      return;
    }
    lastConnectedAddress.value = '';
    isWalletConnected.value = true;
    return;
  }
  lastConnectedAddress.value = '';
  isWalletConnected.value = false;
}

function handleSecondaryAction(event, action) {
  handlePromoActionClick(event, action);
}

function handlePromoActionClick(event, action) {
  if (!event) return;

  const label = (action?.text ?? '').toString();
  const trimmedLabel = label.trim();

  const href = (action?.href ?? '').toString().trim();

  const modalPayload = resolveComingSoon({
    href,
  });
  if (!modalPayload) {
    return;
  }

  event.preventDefault();
  openComingSoon(modalPayload);
  trackEvent('coming_soon_interstitial_shown', {
    token: normalizedToken,
    trigger: 'promo-secondary',
    label: trimmedLabel ? trimmedLabel.toLowerCase() : 'coming-soon',
  });
}
</script>

<style scoped>
[data-animation] {
  visibility: visible !important;
  opacity: 1 !important;
}

.promo-surface {
  position: relative;
  min-height: var(--promo-surface-min-height, calc(100vh + 75px));
  background: var(
    --promo-surface-bg,
    var(--hero-surface-bg, var(--theme-body-background, #060212))
  );
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
}

.hero-presale-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh + 60px);
  padding-block: clamp(96px, 18vh, 200px);
}

.hero-promo {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-24, 24px);
}

.hero-copy {
  background: var(--hero-panel-bg, var(--brand-card-soft, rgba(8, 8, 12, 0.78)));
  color: var(--hero-panel-body-color, var(--brand-card-text, rgba(255, 255, 255, 0.9)));
  padding: 24px 24px 32px;
  border-radius: var(--brand-card-radius, 24px);
  box-shadow: var(--brand-surface-card-shadow, 0 8px 24px rgba(217, 22, 75, 0.18));
}

.hero-badge {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 999px;
  letter-spacing: 0.18em;
  font-size: 12px;
  font-weight: 600;
  background: var(
    --hero-panel-badge-bg,
    color-mix(in srgb, var(--brand-card-text, #ffffff) 18%, transparent)
  );
  color: var(
    --hero-panel-badge-color,
    color-mix(in srgb, var(--brand-card-text, #ffffff) 82%, transparent)
  );
  margin-bottom: 16px;
}

.hero-title {
  color: var(--hero-panel-title-color, var(--brand-card-text, #ffffff));
  font-size: clamp(34px, 6vw, 56px);
  line-height: 1.1;
  margin-bottom: 18px;
  text-transform: none;
}

.hero-subtitle {
  color: var(
    --hero-panel-body-color,
    color-mix(in srgb, var(--brand-card-text, #ffffff) 85%, transparent)
  );
  font-size: clamp(16px, 3.5vw, 20px);
  line-height: 1.5;
  margin-bottom: 28px;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 480px) {
  .hero-copy {
    padding: 20px;
  }

  .hero-actions {
    flex-direction: column;
  }
}

</style>
