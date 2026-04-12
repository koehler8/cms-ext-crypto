import { ref, computed, reactive, watch } from 'vue';
import { sanitizeOnboardingStepEntry } from './buyTextHelpers.js';

/**
 * Composable that encapsulates all onboarding-modal state and logic
 * extracted from Buy.vue.
 *
 * @param {Object} options
 * @param {string} options.normalizedToken - lowercase site token (e.g. 'disrupt')
 * @param {string} options.tokenTicker - raw VITE_TOKEN value
 * @param {import('vue').ComputedRef<string>} options.tokenSymbol - computed token symbol
 * @param {import('vue').Ref<boolean>} options.isWalletConnected
 * @param {import('vue').Ref<boolean>} options.showPurchaseControls
 * @param {import('vue').ComputedRef<boolean>} options.hasPersonalPresaleActivity
 * @param {import('vue').Ref<string>} options.transactionState
 * @param {(name: string, params?: object) => void} options.trackEvent
 * @param {(text: string) => string} options.sanitizeText
 */
export function useBuyOnboarding(options) {
  const {
    normalizedToken,
    tokenTicker,
    tokenSymbol,
    isWalletConnected,
    showPurchaseControls,
    hasPersonalPresaleActivity,
    transactionState,
    trackEvent,
    sanitizeText,
  } = options;

  const DEFAULT_ONBOARDING_DELAY_MS = 900;
  const DEFAULT_ONBOARDING_STORAGE_KEY = `presale-onboarding-${normalizedToken}`;

  const onboardingTitleFallback = computed(() => {
    const symbol = tokenSymbol.value;
    return symbol ? `How to ignite your ${symbol}` : 'How to ignite your presale';
  });

  const onboardingAmountFallback = computed(() => {
    const symbol = tokenSymbol.value;
    return symbol
      ? `Decide how much ETH to spend to preview exactly how much ${symbol} you will receive.`
      : 'Decide how much ETH to spend to preview exactly how many tokens you will receive.';
  });

  const onboardingIgniteFallback = computed(() => {
    const symbol = tokenSymbol.value;
    return symbol
      ? `Hit Buy ${symbol} and approve the transaction — the widget handles rates and receipts.`
      : 'Hit Buy and approve the transaction — the widget handles rates and receipts.';
  });

  function defaultOnboardingSteps() {
    return [
      {
        id: 'connect',
        title: 'Connect wallet',
        text: 'Connect your crypto wallet — MetaMask, WalletConnect, or Coinbase Wallet all work.',
      },
      {
        id: 'amount',
        title: 'Enter ETH',
        text: onboardingAmountFallback.value,
      },
      {
        id: 'ignite',
        title: 'Light the fuse',
        text: onboardingIgniteFallback.value,
      },
    ];
  }

  function sanitizeOnboardingStepsArray(raw) {
    const source = Array.isArray(raw) && raw.length ? raw : defaultOnboardingSteps();
    const cleaned = source
      .map((entry, index) => sanitizeOnboardingStepEntry(entry, index))
      .filter(Boolean);
    if (cleaned.length) {
      return cleaned.slice(0, 4);
    }
    return defaultOnboardingSteps()
      .map((entry, index) => sanitizeOnboardingStepEntry(entry, index))
      .filter(Boolean);
  }

  const onboardingContent = reactive({
    eyebrow: 'First time lighting the fuse?',
    title: onboardingTitleFallback.value,
    description: 'Three quick steps so your first buy feels more party than homework.',
    steps: sanitizeOnboardingStepsArray(defaultOnboardingSteps()),
    ctaLabel: 'Got it — let me buy',
    dismissAriaLabel: 'Dismiss onboarding prompt',
    connectLabel: 'Connect Wallet',
  });
  const onboardingVisible = ref(false);
  const onboardingEnabled = ref(false);
  const onboardingSkipOnMobile = ref(true);
  const onboardingDelayMs = ref(DEFAULT_ONBOARDING_DELAY_MS);
  const onboardingStorageKey = ref(DEFAULT_ONBOARDING_STORAGE_KEY);
  const onboardingHasSeen = ref(false);
  const onboardingHasTrackedShow = ref(false);
  const isMobileViewport = ref(false);
  const onboardingStepsForDisplay = computed(() => onboardingContent.steps);
  const onboardingTimerId = ref(null);
  let onboardingMediaQuery = null;

  function readOnboardingPreference(storageKey) {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(storageKey) === 'dismissed';
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Unable to access localStorage for onboarding preference', error);
      }
      return false;
    }
  }

  function markOnboardingSeen(reason) {
    if (onboardingHasSeen.value) return;
    onboardingHasSeen.value = true;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(onboardingStorageKey.value, 'dismissed');
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Unable to persist onboarding dismissal', error);
        }
      }
    }
    trackEvent('presale_onboarding_dismissed', {
      token: tokenTicker || 'unknown',
      reason,
    });
  }

  function hideOnboarding(reason, persist) {
    if (onboardingVisible.value) {
      onboardingVisible.value = false;
    }
    if (persist) {
      markOnboardingSeen(reason);
    }
  }

  function cancelOnboardingTimer() {
    if (onboardingTimerId.value && typeof window !== 'undefined') {
      window.clearTimeout(onboardingTimerId.value);
    }
    onboardingTimerId.value = null;
  }

  function shouldDisplayOnboarding() {
    if (!onboardingEnabled.value) return false;
    if (onboardingHasSeen.value) return false;
    if (!showPurchaseControls.value) return false;
    if (isWalletConnected.value) return false;
    if (hasPersonalPresaleActivity.value) return false;
    if (transactionState.value !== 'idle') return false;
    if (onboardingSkipOnMobile.value && isMobileViewport.value) return false;
    return true;
  }

  function showOnboarding(trigger = 'delay') {
    if (!shouldDisplayOnboarding()) return;
    onboardingVisible.value = true;
    if (!onboardingHasTrackedShow.value) {
      trackEvent('presale_onboarding_shown', {
        token: tokenTicker || 'unknown',
        trigger,
      });
      onboardingHasTrackedShow.value = true;
    }
  }

  function scheduleOnboarding(trigger = 'delay') {
    cancelOnboardingTimer();
    if (!shouldDisplayOnboarding()) return;
    if (typeof window === 'undefined') {
      showOnboarding(trigger);
      return;
    }
    onboardingTimerId.value = window.setTimeout(() => {
      onboardingTimerId.value = null;
      if (shouldDisplayOnboarding()) {
        showOnboarding(trigger);
      }
    }, Math.max(0, Number(onboardingDelayMs.value) || 0));
  }

  function reevaluateOnboarding(trigger = 'state_change') {
    if (shouldDisplayOnboarding()) {
      scheduleOnboarding(trigger);
    } else {
      cancelOnboardingTimer();
      if (onboardingVisible.value) {
        hideOnboarding('eligibility_lost', false);
      }
    }
  }

  function dismissOnboarding(reason = 'dismissed') {
    cancelOnboardingTimer();
    hideOnboarding(reason, true);
  }

  function handleOnboardingDismissEvent(reason) {
    const map = {
      cta: 'cta_acknowledged',
      connect_cta: 'connect_wallet',
      cta_disabled: 'cta_disabled',
      close: 'close_button',
      backdrop: 'backdrop_click',
      escape: 'escape_key',
    };
    const finalReason = typeof reason === 'string' && reason ? map[reason] || reason : 'user_dismiss';
    dismissOnboarding(finalReason);
  }

  function applyOnboardingConfig(raw) {
    const config = raw && typeof raw === 'object' ? raw : {};
    onboardingEnabled.value = config.enabled !== false;
    onboardingSkipOnMobile.value =
      config.skipOnMobile === undefined ? true : Boolean(config.skipOnMobile);

    const delayCandidate =
      config.delayMs ?? config.delay ?? config.showDelayMs ?? DEFAULT_ONBOARDING_DELAY_MS;
    const parsedDelay = Number.parseInt(delayCandidate, 10);
    onboardingDelayMs.value =
      Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : DEFAULT_ONBOARDING_DELAY_MS;

    const nextStorageKey =
      typeof config.storageKey === 'string' && config.storageKey.trim()
        ? config.storageKey.trim()
        : DEFAULT_ONBOARDING_STORAGE_KEY;
    let storageKeyChanged = false;
    if (onboardingStorageKey.value !== nextStorageKey) {
      onboardingStorageKey.value = nextStorageKey;
      onboardingHasSeen.value = readOnboardingPreference(nextStorageKey);
      storageKeyChanged = true;
    } else if (!onboardingHasSeen.value) {
      onboardingHasSeen.value = readOnboardingPreference(nextStorageKey);
    }

    if (storageKeyChanged || config.resetTracking === true) {
      onboardingHasTrackedShow.value = false;
    }

    const eyebrow = sanitizeText(config.eyebrow || config.badge || '');
    onboardingContent.eyebrow = eyebrow || 'First time lighting the fuse?';

    const title = sanitizeText(config.title || config.headline || '');
    onboardingContent.title = title || onboardingTitleFallback.value;

    const description = sanitizeText(config.description || config.body || config.copy || '');
    onboardingContent.description =
      description || 'Three quick steps so your first buy feels more party than homework.';

    const ctaLabel = sanitizeText(config.ctaLabel || config.primaryCta || config.primaryLabel || '');
    onboardingContent.ctaLabel = ctaLabel || 'Got it — let me buy';

    const connectCta = sanitizeText(config.connectLabel || config.connectCta || '');
    onboardingContent.connectLabel = connectCta || 'Connect Wallet';

    const dismissLabel = sanitizeText(
      config.dismissAriaLabel || config.dismissLabel || config.closeAriaLabel || ''
    );
    onboardingContent.dismissAriaLabel = dismissLabel || 'Dismiss onboarding prompt';

    const stepsRaw =
      Array.isArray(config.steps) && config.steps.length ? config.steps : defaultOnboardingSteps();
    onboardingContent.steps = sanitizeOnboardingStepsArray(stepsRaw);
  }

  function attachOnboardingViewportListener() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      isMobileViewport.value = false;
      return;
    }
    const query = window.matchMedia('(max-width: 900px)');
    const handler = (event) => {
      isMobileViewport.value = event.matches;
      reevaluateOnboarding('viewport_change');
    };
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler);
    } else if (typeof query.addListener === 'function') {
      query.addListener(handler);
    }
    isMobileViewport.value = query.matches;
    onboardingMediaQuery = { query, handler };
  }

  function detachOnboardingViewportListener() {
    if (!onboardingMediaQuery) return;
    const { query, handler } = onboardingMediaQuery;
    if (typeof query.removeEventListener === 'function') {
      query.removeEventListener('change', handler);
    } else if (typeof query.removeListener === 'function') {
      query.removeListener(handler);
    }
    onboardingMediaQuery = null;
  }

  function initOnboardingOnMount() {
    onboardingHasSeen.value = readOnboardingPreference(onboardingStorageKey.value);
    attachOnboardingViewportListener();
    reevaluateOnboarding('mounted');
  }

  return {
    // Reactive state
    onboardingVisible,
    onboardingEnabled,
    onboardingContent,
    onboardingStepsForDisplay,
    onboardingSkipOnMobile,
    onboardingHasSeen,
    isMobileViewport,

    // Functions
    defaultOnboardingSteps,
    sanitizeOnboardingStepsArray,
    shouldDisplayOnboarding,
    showOnboarding,
    scheduleOnboarding,
    reevaluateOnboarding,
    dismissOnboarding,
    handleOnboardingDismissEvent,
    applyOnboardingConfig,
    attachOnboardingViewportListener,
    detachOnboardingViewportListener,
    cancelOnboardingTimer,
    readOnboardingPreference,
    initOnboardingOnMount,
  };
}
