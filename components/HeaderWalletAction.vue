<template>
  <div class="header-wallet">
    <button
      type="button"
      class="header-wallet__button primary-button"
      :class="{
        'header-wallet__button--connected': isWalletConnected,
        'header-wallet__button--loading': isModalBusy
      }"
      :disabled="isModalBusy"
      :aria-busy="isModalBusy ? 'true' : 'false'"
      @click="handleWalletButtonClick"
    >
      <span class="header-wallet__icon" aria-hidden="true">
        <svg
          v-if="!isWalletConnected"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2.5"
            y="5"
            width="13"
            height="8"
            rx="2"
            ry="2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            d="M15.5 7.5h-4a1.5 1.5 0 0 0 0 3h4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="12.5" cy="9" r="1" fill="currentColor" />
        </svg>
        <svg
          v-else
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="m7.25 10.25 2.25 2.25 3.75-4.75"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span class="header-wallet__label">
        <span v-if="isModalBusy" class="header-wallet__spinner" aria-hidden="true"></span>
        {{ walletButtonLabel }}
      </span>
    </button>
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChainController, CoreHelperUtil, ModalController } from '@reown/appkit-controllers';
import { useAppKitAccount } from '@reown/appkit/vue';
import { trackEvent, trackFunnelEvent } from '@koehler8/cms/utils/analytics';
import { markWalletDisconnected, peekPendingWalletConnectContext, setPendingWalletConnectContext, trackWalletConnectedOnce } from '../utils/walletTracking.js';
import { requestScrollToPresale } from '../utils/scrollToPresale.js';

const appKitAccount = useAppKitAccount();
const DEFAULT_CONNECT_LABEL = 'Connect Wallet';
const DEFAULT_LOADING_LABEL = 'Connecting\u2026';
const walletConnectLabel = ref(DEFAULT_CONNECT_LABEL);
const walletLoadingLabel = ref(DEFAULT_LOADING_LABEL);
const walletConnectedLabel = ref('');
const walletAddress = ref('');
const walletProfileName = ref('');
const isModalBusy = ref(false);
let caipAddressUnsubscribe;
let profileNameUnsubscribe;
let modalUnsubscribe;
let connectedWalletInfoUnsubscribe;
let hasTrackedAccountAddress = false;

const shortWalletAddress = computed(() => {
  const value = walletAddress.value;
  if (!value) return '';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}\u2026${value.slice(-4)}`;
});

const isWalletConnected = computed(() => Boolean(walletAddress.value));

const walletButtonLabel = computed(() => {
  if (isModalBusy.value) return walletLoadingLabel.value;
  if (isWalletConnected.value) {
    const baseName = walletProfileName.value || shortWalletAddress.value || walletAddress.value || '';
    if (walletConnectedLabel.value) {
      return walletConnectedLabel.value
        .replace(/\{name\}/g, walletProfileName.value || baseName)
        .replace(/\{address\}/g, shortWalletAddress.value || walletAddress.value || '');
    }
    return baseName || walletConnectLabel.value;
  }
  return walletConnectLabel.value;
});

const injectedSiteData = inject('siteData', ref({}));
const pageContent = inject('pageContent', ref({}));

function pickLabel(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

const normalizeWalletAddress = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    if (CoreHelperUtil && typeof CoreHelperUtil.getPlainAddress === 'function') {
      const plain = CoreHelperUtil.getPlainAddress(trimmed);
      if (plain && typeof plain === 'string' && plain.trim()) return plain.trim();
    }
  } catch {}
  return trimmed;
};

const normalizeChainId = (value) => {
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
};

const prettifyWalletProvider = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'metamask') return 'MetaMask';
  if (lower === 'walletconnect') return 'WalletConnect';
  if (lower === 'coinbase' || lower === 'coinbase wallet' || lower === 'coinbase_wallet') return 'Coinbase Wallet';
  if (lower === 'trust wallet' || lower === 'trust_wallet') return 'Trust Wallet';
  return trimmed;
};

const resolveWalletProviderName = () => {
  let accountState;
  if (typeof ChainController?.getAccountData === 'function') {
    accountState = ChainController.getAccountData();
  } else if (ChainController?.state?.activeChain && ChainController?.state?.chains?.get) {
    accountState = ChainController.state.chains.get(ChainController.state.activeChain)?.accountState;
  }
  const info = accountState?.connectedWalletInfo;
  const candidates = [info?.name, info?.label, info?.title, info?.id, info?.type];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return prettifyWalletProvider(candidate);
  }
  return 'AppKit';
};

const dispatchScrollToPresale = (source = 'header') => {
  requestScrollToPresale({ source, target: '#centerPresale', trigger: 'wallet_connected' });
};

const emitWalletConnectedAnalytics = () => {
  if (!isWalletConnected.value) return;
  const address = walletAddress.value;
  if (!address) return;
  const providerName = resolveWalletProviderName();
  const activeChainId = normalizeChainId(ChainController?.state?.activeCaipNetwork?.id);
  const pendingContext = peekPendingWalletConnectContext();
  const resolvedSource = pendingContext?.source || 'header';
  trackWalletConnectedOnce({
    address,
    providerName,
    chainId: activeChainId,
    source: resolvedSource,
    onFirstConnect: dispatchScrollToPresale,
  });
};

const setWalletAddress = (value, { skipAnalytics = false } = {}) => {
  const normalized = normalizeWalletAddress(value);
  if (!normalized) { resetWalletState(); return; }
  walletAddress.value = normalized;
  if (!skipAnalytics) emitWalletConnectedAnalytics();
};

const setWalletProfileName = (value, { skipAnalytics = false } = {}) => {
  walletProfileName.value = typeof value === 'string' ? value.trim() : '';
  if (!skipAnalytics) emitWalletConnectedAnalytics();
};

const resetWalletState = () => {
  const previousAddress = walletAddress.value;
  if (previousAddress) markWalletDisconnected(previousAddress);
  walletAddress.value = '';
  walletProfileName.value = '';
};

watch(() => appKitAccount.value.address, (nextAddress) => {
  const hasAddress = typeof nextAddress === 'string' && nextAddress.trim();
  if (hasAddress) {
    const shouldSkipAnalytics = !hasTrackedAccountAddress;
    setWalletAddress(nextAddress, { skipAnalytics: shouldSkipAnalytics });
    hasTrackedAccountAddress = true;
  } else if (!ChainController.state.activeCaipAddress) {
    resetWalletState();
  }
}, { immediate: true });

watch(() => appKitAccount.value.isConnected, (connected) => {
  if (!connected && !ChainController.state.activeCaipAddress) {
    resetWalletState();
    hasTrackedAccountAddress = false;
  }
});

const applySettings = () => {
  const pageHeader = pageContent.value?.header;
  const headerSettings = (pageHeader && typeof pageHeader === 'object') ? pageHeader
    : (injectedSiteData.value?.header && typeof injectedSiteData.value.header === 'object') ? injectedSiteData.value.header
    : {};

  const connectLabel = typeof headerSettings.walletButtonLabel === 'string' ? headerSettings.walletButtonLabel.trim() : '';
  const fallbackConnectLabel = pickLabel(
    pageContent.value?.presale?.connectButtonLabel,
    injectedSiteData.value?.shared?.content?.presale?.connectButtonLabel,
  );
  walletConnectLabel.value = connectLabel || fallbackConnectLabel || DEFAULT_CONNECT_LABEL;
  walletLoadingLabel.value = (typeof headerSettings.walletLoadingLabel === 'string' ? headerSettings.walletLoadingLabel.trim() : '') || DEFAULT_LOADING_LABEL;
  walletConnectedLabel.value = typeof headerSettings.walletConnectedLabel === 'string' ? headerSettings.walletConnectedLabel.trim() : '';
};

watch(() => [pageContent.value?.header, injectedSiteData.value?.header], applySettings, { immediate: true });

const handleWalletButtonClick = async () => {
  trackEvent('header_wallet_cta_click', { source: 'header' });
  if (typeof window === 'undefined' || !ModalController) return;
  if (isModalBusy.value) return;
  try {
    if (ModalController.state?.open) { ModalController.close(); return; }
    if (!isWalletConnected.value) {
      setPendingWalletConnectContext({ source: 'header', connector: 'appkit' });
      trackFunnelEvent('wallet_connect_initiated', { wallet_provider: 'appkit', source: 'header' });
    }
    await ModalController.open({
      namespace: ChainController?.state?.activeChain,
      ...(isWalletConnected.value ? {} : { view: 'Connect' }),
    });
  } catch (error) {
    if (import.meta.env.DEV) console.error('Header wallet CTA failed', error);
    setPendingWalletConnectContext(null);
  }
};

onMounted(() => {
  if (typeof window === 'undefined') return;
  if (ChainController?.state) {
    if (ChainController.state.activeCaipAddress) {
      setWalletAddress(ChainController.state.activeCaipAddress, { skipAnalytics: true });
    }
    const activeChain = ChainController.state.activeChain;
    if (activeChain && ChainController.state.chains?.get) {
      const accountState = ChainController.state.chains.get(activeChain)?.accountState;
      if (accountState) {
        if (accountState.address || accountState.caipAddress) setWalletAddress(accountState.address || accountState.caipAddress, { skipAnalytics: true });
        if (accountState.profileName) setWalletProfileName(accountState.profileName, { skipAnalytics: true });
      }
    }
  }
  emitWalletConnectedAnalytics();
  isModalBusy.value = Boolean(ModalController?.state?.loading);
  if (!caipAddressUnsubscribe && ChainController?.subscribeKey) {
    caipAddressUnsubscribe = ChainController.subscribeKey('activeCaipAddress', (next) => {
      if (typeof next === 'string' && next.trim()) setWalletAddress(next);
      else resetWalletState();
    });
  }
  if (!profileNameUnsubscribe && ChainController?.subscribeAccountStateProp) {
    profileNameUnsubscribe = ChainController.subscribeAccountStateProp('profileName', (next) => setWalletProfileName(next, { skipAnalytics: true }));
  }
  if (!modalUnsubscribe && ModalController?.subscribe) {
    modalUnsubscribe = ModalController.subscribe((state) => { isModalBusy.value = Boolean(state.loading); });
  }
  if (!connectedWalletInfoUnsubscribe && ChainController?.subscribeAccountStateProp) {
    connectedWalletInfoUnsubscribe = ChainController.subscribeAccountStateProp('connectedWalletInfo', () => {
      if (isWalletConnected.value) emitWalletConnectedAnalytics();
      else resetWalletState();
    });
  }
});

onBeforeUnmount(() => {
  if (caipAddressUnsubscribe) { caipAddressUnsubscribe(); caipAddressUnsubscribe = undefined; }
  if (profileNameUnsubscribe) { profileNameUnsubscribe(); profileNameUnsubscribe = undefined; }
  if (modalUnsubscribe) { modalUnsubscribe(); modalUnsubscribe = undefined; }
  if (connectedWalletInfoUnsubscribe) { connectedWalletInfoUnsubscribe(); connectedWalletInfoUnsubscribe = undefined; }
});
</script>

<style scoped>
.header-wallet {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
}

.header-wallet__button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.75rem;
  min-height: 44px;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  min-width: 0;
  flex: 0 1 auto;
}

.header-wallet__button--loading { cursor: progress; }
.header-wallet__button--connected { letter-spacing: 0.04em; }
.header-wallet__button--connected .header-wallet__label { text-transform: none; font-size: 0.78rem; }

.header-wallet__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: currentColor;
}

.header-wallet__icon svg { width: 100%; height: 100%; }

.header-wallet__label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: clamp(120px, 32vw, 220px);
}

.header-wallet__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid color-mix(in srgb, currentColor 65%, transparent);
  border-top-color: color-mix(in srgb, var(--brand-header-bg, #04060c) 85%, currentColor 15%);
  border-radius: 50%;
  animation: headerWalletSpin 0.9s linear infinite;
}

@media (max-width: 767px) {
  .header-wallet__button { padding: 0.55rem 1.4rem; gap: 0.6rem; }
}

@media (max-width: 520px) {
  .header-wallet__button { padding: 0.45rem 1.05rem; gap: 0.5rem; letter-spacing: 0.08em; font-size: 0.68rem; }
  .header-wallet__icon { width: 18px; height: 18px; }
  .header-wallet__label { max-width: clamp(100px, 38vw, 180px); }
}

@media (prefers-reduced-motion: reduce) {
  .header-wallet__button { transition: none; }
  .header-wallet__spinner { animation: none; }
}

@keyframes headerWalletSpin {
  to { transform: rotate(360deg); }
}
</style>
