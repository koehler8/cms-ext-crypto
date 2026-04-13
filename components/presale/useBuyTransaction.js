import { ref, computed } from 'vue';
import { ethers } from 'ethers';
import { resolveError } from './buyTextHelpers.js';
import { resolvePaymentAssetMeta } from './buyAssets.js';
import { formatDecimal, formatTokenAmount } from '@koehler8/cms/utils/formatNumber';
import { trackEvent, trackFunnelEvent } from '@koehler8/cms/utils/analytics';

const ETHERSCAN_TX_BASE = 'https://etherscan.io/tx/';

/**
 * Composable encapsulating the transaction state machine for the Buy widget.
 *
 * Late-bound dependencies (telegramLink, markHowItWorksComplete, refreshPresaleData,
 * setActivePresaleTab) are read from the options object at call time, not at setup time.
 * This means the caller can assign them after composable instantiation, e.g.:
 *
 *   const txOptions = { tokenTicker, pendingTxStorageKey, ... };
 *   const tx = useBuyTransaction(txOptions);
 *   // later, once the deps are defined:
 *   txOptions.markHowItWorksComplete = markHowItWorksComplete;
 *
 * @param {Object} options
 * @param {string}          options.tokenTicker            – VITE_TOKEN value (e.g. "DISRUPT")
 * @param {string}          options.pendingTxStorageKey     – sessionStorage key for pending tx persistence
 * @param {string}          options.rpcRead                – read-only JSON-RPC endpoint
 * @param {Object}          options.paymentAssetMap         – map returned by createPaymentAssetMap()
 * @param {Function}        options.getReadProvider        – getter returning the shared read provider (may be null)
 * @param {Function}        options.setReadProvider        – setter to cache the read provider
 * @param {import('vue').ComputedRef<string>} [options.tokenSymbol] – computed token display symbol (late-bound)
 * @param {Function|null}   [options.setActivePresaleTab]  – injected tab switcher (late-bound, nullable)
 * @param {import('vue').ComputedRef<Object|null>} [options.telegramLink] – computed telegram link (late-bound)
 * @param {Function}        [options.markHowItWorksComplete] – callback (late-bound)
 * @param {Function}        [options.refreshPresaleData]   – callback (late-bound)
 */
export function useBuyTransaction(options) {
  const {
    tokenTicker,
    pendingTxStorageKey,
    rpcRead,
    paymentAssetMap,
    getReadProvider,
    setReadProvider,
  } = options;

  // ─── Reactive state ──────────────────────────────────────────────

  const transactionState = ref('idle'); // idle | pending | success | error
  const transactionDetails = ref(null);
  const transactionMessage = ref('');
  const transactionErrorCode = ref('');
  const pendingTxHash = ref('');
  const pendingInteraction = ref('buy');
  const pendingTransactionMeta = ref(null);
  const pendingSince = ref(0);
  const pendingTicker = ref(0);
  let pendingIntervalId;

  const showSuccessCelebration = ref(false);
  const successCelebrationMeta = ref(null);

  // ─── Computed ────────────────────────────────────────────────────

  const isTransactionPending = computed(() => transactionState.value === 'pending');

  const pendingElapsedSeconds = computed(() =>
    pendingSince.value ? pendingTicker.value : 0
  );

  const etherscanPendingUrl = computed(() =>
    pendingTxHash.value ? `${ETHERSCAN_TX_BASE}${pendingTxHash.value}` : ''
  );

  const statusClass = computed(() => {
    switch (transactionState.value) {
      case 'pending':
        return 'status-panel--pending';
      case 'success':
        return 'status-panel--success';
      case 'error':
        return 'status-panel--error';
      default:
        return '';
    }
  });

  const successIsStakeCombo = computed(() => successCelebrationMeta.value?.interaction === 'buy_and_stake');
  const successTokensDisplay = computed(() => successCelebrationMeta.value?.tokensFormatted || transactionDetails.value?.tokens || '');
  const successSpendDisplay = computed(
    () =>
      successCelebrationMeta.value?.spendDisplay ||
      transactionDetails.value?.spendDisplay ||
      successCelebrationMeta.value?.spendFormatted ||
      transactionDetails.value?.spend ||
      ''
  );
  const successAssetDisplay = computed(
    () => successCelebrationMeta.value?.asset || transactionDetails.value?.spendCurrency || 'ETH'
  );
  const successTxHashShort = computed(() => {
    const hash = successCelebrationMeta.value?.txHash || transactionDetails.value?.txHash;
    if (!hash || typeof hash !== 'string') return '';
    return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
  });
  const successEtherscanUrl = computed(() => successCelebrationMeta.value?.etherscanUrl || transactionDetails.value?.etherscanUrl || '');

  // ─── Timer helpers ───────────────────────────────────────────────

  function startPendingTimer(startTimestamp = Date.now()) {
    pendingSince.value = startTimestamp;
    if (typeof window === 'undefined') return;
    const initialSeconds = Math.max(Math.floor((Date.now() - startTimestamp) / 1000), 0);
    pendingTicker.value = initialSeconds;
    if (pendingIntervalId) {
      window.clearInterval(pendingIntervalId);
    }
    pendingIntervalId = window.setInterval(() => {
      pendingTicker.value += 1;
    }, 1000);
  }

  function stopPendingTimer() {
    if (typeof window !== 'undefined' && pendingIntervalId) {
      window.clearInterval(pendingIntervalId);
    }
    pendingIntervalId = undefined;
    pendingSince.value = 0;
    pendingTicker.value = 0;
  }

  // ─── Storage helpers ─────────────────────────────────────────────

  function persistPendingTransaction(meta) {
    if (typeof window === 'undefined') return;
    if (!meta || !meta.hash) return;
    try {
      window.sessionStorage.setItem(
        pendingTxStorageKey,
        JSON.stringify({
          hash: meta.hash,
          spend: typeof meta.spend === 'number' ? meta.spend : null,
          asset:
            typeof meta.asset === 'string' && meta.asset
              ? meta.asset
              : typeof meta.asset === 'object' && typeof meta.asset?.symbol === 'string'
                ? meta.asset.symbol
                : 'ETH',
          tokens: typeof meta.tokens === 'number' ? meta.tokens : null,
          interaction: meta.interaction || 'buy',
          timestamp: meta.timestamp ?? Date.now(),
        })
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Unable to persist pending transaction', error);
      }
    }
  }

  function clearPendingTransactionStorage() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(pendingTxStorageKey);
  }

  async function restorePendingTransactionFromStorage() {
    if (typeof window === 'undefined') return;
    if (transactionState.value !== 'idle') return;
    const raw = window.sessionStorage.getItem(pendingTxStorageKey);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw);
      if (!stored || !stored.hash) {
        clearPendingTransactionStorage();
        return;
      }
      const storedSpend =
        typeof stored.spend === 'number'
          ? stored.spend
          : typeof stored.eth === 'number'
            ? stored.eth
            : null;
      const storedAsset =
        typeof stored.asset === 'string' && stored.asset
          ? stored.asset
          : typeof stored.currency === 'string' && stored.currency
            ? stored.currency
            : 'ETH';
      setTransactionPending({
        hash: stored.hash,
        spend: storedSpend,
        asset: storedAsset,
        tokens: typeof stored.tokens === 'number' ? stored.tokens : null,
        interaction: stored.interaction || 'buy',
        timestamp: stored.timestamp ?? Date.now(),
      });
      void monitorPendingTransaction(pendingTransactionMeta.value);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Unable to restore pending transaction', error);
      }
      clearPendingTransactionStorage();
    }
  }

  // ─── Transaction monitoring ──────────────────────────────────────

  async function monitorPendingTransaction(meta) {
    if (!meta || !meta.hash) return;
    try {
      let provider = getReadProvider();
      if (!provider) {
        provider = new ethers.JsonRpcProvider(rpcRead);
        setReadProvider(provider);
      }
      const receipt = await provider.waitForTransaction(meta.hash);
      if (!receipt) {
        setTransactionError({
          message: 'We could not locate the pending transaction. Double-check your wallet.',
          code: 'tx_not_found',
        });
        return;
      }
      setTransactionSuccess({
        hash: receipt.transactionHash || meta.hash,
        spend: meta.spend ?? 0,
        asset: meta.asset || 'ETH',
        tokens: meta.tokens ?? 0,
        type: meta.interaction || 'buy',
      });
      if (typeof options.refreshPresaleData === 'function') {
        await options.refreshPresaleData();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshStakeData'));
      }
    } catch (error) {
      console.error('Pending transaction wait failed', error);
      const resolved = resolveError(error);
      setTransactionError(resolved);
    }
  }

  // ─── State transitions ──────────────────────────────────────────

  function resetTransactionState() {
    transactionState.value = 'idle';
    transactionDetails.value = null;
    transactionMessage.value = '';
    transactionErrorCode.value = '';
    pendingTxHash.value = '';
    pendingInteraction.value = 'buy';
    pendingTransactionMeta.value = null;
    stopPendingTimer();
    clearPendingTransactionStorage();
    showSuccessCelebration.value = false;
    successCelebrationMeta.value = null;
  }

  function setTransactionPending({
    hash = '',
    spend = null,
    asset = 'ETH',
    tokens = null,
    interaction = 'buy',
    timestamp = Date.now(),
  } = {}) {
    transactionState.value = 'pending';
    transactionDetails.value = null;
    transactionMessage.value = '';
    pendingTxHash.value = hash;
    pendingInteraction.value = interaction;
    pendingTransactionMeta.value = {
      hash,
      spend,
      asset,
      tokens,
      interaction,
    };
    startPendingTimer(timestamp);
    persistPendingTransaction({
      hash,
      spend,
      asset,
      tokens,
      interaction,
      timestamp,
    });
  }

  function setTransactionSuccess({ hash, spend, asset, tokens, type }) {
    const safeSpend = Number.isFinite(spend) ? spend : 0;
    const safeTokens = Number.isFinite(tokens) ? tokens : 0;
    const resolvedAsset = resolvePaymentAssetMeta(asset, paymentAssetMap);
    const fallbackSymbol =
      typeof asset === 'string' && asset.trim() ? asset.trim().toUpperCase() : 'ETH';
    const assetSymbol = resolvedAsset?.symbol || fallbackSymbol || 'ETH';
    const resolvedDecimals = Number.isFinite(resolvedAsset?.decimals)
      ? resolvedAsset.decimals
      : assetSymbol === 'ETH'
        ? 18
        : 6;
    const isEthLike =
      (resolvedAsset?.type === 'native' ||
        resolvedAsset?.type === 'wrapped' ||
        assetSymbol === 'ETH') &&
      resolvedDecimals >= 6;
    const spendDigits = Math.min(isEthLike ? 6 : resolvedDecimals, 6);
    const spendFormatted = formatDecimal(safeSpend, {
      maximumFractionDigits: spendDigits,
      minimumFractionDigits: 0,
    });
    transactionState.value = 'success';
    const spendDisplay = `${spendFormatted} ${assetSymbol}`.trim();
    transactionDetails.value = {
      txHash: hash,
      spend: spendFormatted,
      spendDisplay,
      spendCurrency: assetSymbol,
      tokens: formatTokenAmount(safeTokens, { maximumFractionDigits: 4, minimumFractionDigits: 0 }),
      type,
      etherscanUrl: `${ETHERSCAN_TX_BASE}${hash}`,
    };
    transactionMessage.value = '';
    pendingTxHash.value = '';
    pendingInteraction.value = 'buy';
    pendingTransactionMeta.value = null;
    stopPendingTimer();
    clearPendingTransactionStorage();
    if (typeof options.markHowItWorksComplete === 'function') {
      options.markHowItWorksComplete();
    }
    successCelebrationMeta.value = {
      interaction: type,
      tokens: safeTokens,
      tokensFormatted: formatTokenAmount(safeTokens, { maximumFractionDigits: 4, minimumFractionDigits: 0 }),
      spend: safeSpend,
      spendFormatted,
      spendDisplay,
      asset: assetSymbol,
      txHash: hash,
      etherscanUrl: `${ETHERSCAN_TX_BASE}${hash}`,
    };
    showSuccessCelebration.value = true;
    trackEvent('purchase_success_modal_shown', {
      token: tokenTicker || 'unknown',
      interaction: type,
      amount_token: safeTokens,
      amount_spend: safeSpend,
      spend_currency: assetSymbol,
      ...(assetSymbol === 'ETH' ? { amount_eth: safeSpend } : {}),
    });
  }

  function setTransactionError(error) {
    const message = typeof error === 'string' ? error : error?.message;
    const code = typeof error === 'object' && error?.code ? error.code : 'unknown';
    transactionState.value = 'error';
    transactionMessage.value = message || 'Something fizzled before liftoff. Check your wallet and try again.';
    transactionDetails.value = null;
    transactionErrorCode.value = code;
    pendingTxHash.value = '';
    pendingInteraction.value = 'buy';
    pendingTransactionMeta.value = null;
    stopPendingTimer();
    clearPendingTransactionStorage();
    trackEvent('error_tx_failed', {
      token: tokenTicker || 'unknown',
      code,
    });
  }

  // ─── Success celebration handlers ────────────────────────────────

  function closeSuccessCelebration(reason = 'dismissed') {
    if (!showSuccessCelebration.value) return;
    showSuccessCelebration.value = false;
    successCelebrationMeta.value = null;
    trackEvent('purchase_success_modal_closed', {
      token: tokenTicker || 'unknown',
      reason,
    });
  }

  function handleSuccessStakeCta() {
    trackEvent('purchase_success_cta_stake', {
      token: tokenTicker || 'unknown',
    });
    if (typeof options.setActivePresaleTab === 'function') {
      options.setActivePresaleTab('stake');
    }
    closeSuccessCelebration('stake_cta');
  }

  function handleSuccessCommunityCta() {
    const href = options.telegramLink?.value?.href || '';
    trackEvent('purchase_success_cta_community', {
      token: tokenTicker || 'unknown',
      href,
    });
    const hrefLower = href.toLowerCase();
    if (hrefLower.includes('t.me') || hrefLower.includes('telegram')) {
      trackFunnelEvent('social_telegram_click', {
        source: 'purchase_success',
        href,
      });
    } else if (hrefLower.includes('twitter') || hrefLower.includes('x.com')) {
      trackFunnelEvent('social_twitter_click', {
        source: 'purchase_success',
        href,
      });
    }
    closeSuccessCelebration('community_cta');
  }

  // ─── Cleanup ─────────────────────────────────────────────────────

  function cleanupTransaction() {
    stopPendingTimer();
  }

  // ─── Public API ──────────────────────────────────────────────────

  return {
    // state
    transactionState,
    transactionDetails,
    transactionMessage,
    transactionErrorCode,
    pendingTxHash,
    pendingInteraction,
    pendingTransactionMeta,
    pendingSince,
    pendingTicker,
    showSuccessCelebration,
    successCelebrationMeta,

    // computed
    isTransactionPending,
    pendingElapsedSeconds,
    etherscanPendingUrl,
    statusClass,
    successIsStakeCombo,
    successTokensDisplay,
    successSpendDisplay,
    successAssetDisplay,
    successTxHashShort,
    successEtherscanUrl,

    // functions
    startPendingTimer,
    stopPendingTimer,
    persistPendingTransaction,
    clearPendingTransactionStorage,
    restorePendingTransactionFromStorage,
    monitorPendingTransaction,
    resetTransactionState,
    setTransactionPending,
    setTransactionSuccess,
    setTransactionError,
    closeSuccessCelebration,
    handleSuccessStakeCta,
    handleSuccessCommunityCta,
    cleanupTransaction,
  };
}
