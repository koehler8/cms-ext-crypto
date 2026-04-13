import { ref, computed, watch } from 'vue';
import { BrowserProvider } from 'ethers';
import { useAppKitProvider, useAppKit, useAppKitAccount } from '@reown/appkit/vue';
import { ChainController } from '@reown/appkit-controllers';
import {
  normalizeWalletAddress,
  normalizeChainId,
  shortAddress,
  resolveError,
} from './buyTextHelpers.js';
import { trackEvent, trackFunnelEvent } from '@koehler8/cms/utils/analytics';
import {
  markWalletDisconnected,
  peekPendingWalletConnectContext,
  setPendingWalletConnectContext,
  trackWalletConnectedOnce,
} from '../../utils/walletTracking';

const EXPECTED_CHAIN_ID = 1; // Ethereum mainnet

/**
 * Composable encapsulating wallet connection state and logic for the Buy widget.
 *
 * @param {Object} options
 * @param {string} options.normalizedToken - Lowercase token identifier (e.g. 'disrupt')
 * @param {string} options.tokenTicker - Raw VITE_TOKEN value
 * @param {import('vue').Ref} options.formAlert - Reactive ref for form alert state
 * @param {Function} options.showFormAlert - Show a form alert ({ type, title, message, code, dismissible })
 * @param {Function} options.clearFormAlert - Clear a form alert by code
 * @param {Function} options.onDisconnected - Callback when wallet disconnects (reset Buy.vue internal state)
 * @param {Function} options.onConnected - Callback when wallet connects (optional)
 * @param {Function} options.refreshPresaleData - Callback to refresh presale contract data after provider init
 * @param {Function} options.dismissOnboarding - Callback to dismiss onboarding overlay
 */
export function useBuyWallet({
  normalizedToken,
  tokenTicker,
  showFormAlert,
  clearFormAlert,
  onDisconnected,
  onConnected,
  refreshPresaleData,
  dismissOnboarding,
} = {}) {
  const appKitProvider = useAppKitProvider('eip155');
  const appKit = useAppKit();
  const appKitAccount = useAppKitAccount();

  const isWalletConnected = ref(false);
  const lastWalletConnector = ref('appkit');
  const walletAddress = ref('');
  const currentChainId = ref(null);
  const networkMismatch = ref(false);
  const switchingNetwork = ref(false);
  const connectionError = ref('');

  let hasTrackedAccountAddress = false;
  let writeProvider;
  let walletProviderCleanup;

  // ─── Computeds ──────────────────────────────────────────────────────

  const shortWalletAddress = computed(() => shortAddress(walletAddress.value));
  const displayChainName = computed(() => {
    if (!currentChainId.value) return 'Not connected';
    if (currentChainId.value === EXPECTED_CHAIN_ID) return 'Ethereum Mainnet';
    return `Chain ID ${currentChainId.value}`;
  });

  const networkAlertVisible = computed(
    () => isWalletConnected.value && networkMismatch.value
  );

  const walletReadyForSummary = computed(
    () => isWalletConnected.value && !networkMismatch.value
  );

  // ─── Core wallet state functions ────────────────────────────────────

  function setDisconnectedState() {
    if (walletAddress.value) {
      markWalletDisconnected(walletAddress.value, normalizedToken);
    }
    hasTrackedAccountAddress = false;
    walletAddress.value = '';
    isWalletConnected.value = false;
    currentChainId.value = null;
    networkMismatch.value = false;
    if (typeof onDisconnected === 'function') {
      onDisconnected();
    }
  }

  function applyWalletAddress(nextAddress, { chainId, accountsConnected = 1, shouldTrack = true } = {}) {
    const normalized = normalizeWalletAddress(nextAddress);
    if (!normalized) {
      setDisconnectedState();
      return;
    }

    walletAddress.value = normalized;
    isWalletConnected.value = true;
    if (shouldTrack) {
      trackWalletConnectedOnce({
        address: normalized,
        providerName: resolveWalletProviderName(),
        chainId: normalizeChainId(chainId ?? ChainController?.state?.activeCaipNetwork?.id ?? currentChainId.value),
        accountsConnected,
        token: normalizedToken,
        source: 'buy_widget',
      });
    }
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
        return candidate;
      }
    }
    const appKitWalletName =
      appKit?.state?.selectedWallet?.name ||
      appKit?.state?.selectedConnector?.name ||
      appKit?.selectedConnector?.name ||
      '';
    if (appKitWalletName) return appKitWalletName;

    const metadataName =
      appKitProvider?.walletProvider?.session?.peer?.metadata?.name ||
      appKitProvider?.walletProvider?.name ||
      '';
    if (metadataName) return metadataName;

    const connector = (lastWalletConnector.value || '').toLowerCase();
    if (connector === 'metamask') return 'MetaMask';
    if (connector === 'walletconnect') return 'WalletConnect';
    if (connector === 'coinbase') return 'Coinbase Wallet';
    if (connector === 'appkit') return 'AppKit';
    if (connector) return connector;
    return 'unknown';
  }

  // ─── Provider management ────────────────────────────────────────────

  function detachWalletListeners() {
    if (walletProviderCleanup) {
      try {
        walletProviderCleanup();
      } catch (error) {}
      walletProviderCleanup = undefined;
    }
  }

  async function updateWalletState(provider) {
    if (!provider) {
      setDisconnectedState();
      return;
    }

    try {
      const accounts = await provider.listAccounts();
      if (accounts && accounts.length > 0) {
        const resolvedAddress = accounts[0].address || accounts[0];
        applyWalletAddress(resolvedAddress, { accountsConnected: accounts.length, shouldTrack: false });
        clearFormAlert('wallet-not-connected');
        clearFormAlert('wallet-connect-error');
        clearFormAlert('wallet-connect-cancelled');
        let resolvedChainId = null;
        try {
          const network = await provider.getNetwork();
          resolvedChainId = Number(network.chainId);
          currentChainId.value = resolvedChainId;
          networkMismatch.value = resolvedChainId !== EXPECTED_CHAIN_ID;
        } catch (networkError) {
          console.warn('Unable to resolve network for wallet state', networkError);
          currentChainId.value = null;
          networkMismatch.value = false;
        }
        const pendingContext = peekPendingWalletConnectContext();
        const shouldDeferToExternalSource =
          pendingContext && typeof pendingContext.source === 'string' && pendingContext.source !== 'buy_widget';
        if (!shouldDeferToExternalSource) {
          const trackingOptions = {
            address: walletAddress.value,
            providerName: resolveWalletProviderName(),
            chainId: resolvedChainId,
            accountsConnected: accounts.length,
            token: normalizedToken,
          };
          if (!pendingContext) {
            trackingOptions.source = 'buy_widget';
          }
          trackWalletConnectedOnce(trackingOptions);
        }
      } else {
        setDisconnectedState();
      }
    } catch (error) {
      console.warn('Unable to update wallet state', error);
    }
  }

  function attachWalletListeners() {
    const provider = appKitProvider?.walletProvider;
    if (!provider || typeof provider.on !== 'function') return;

    detachWalletListeners();

    const handleAccountsChanged = async (accounts) => {
      if (accounts && accounts.length > 0) {
        await initializeWalletProvider({ refreshBalances: true });
      } else {
        writeProvider = undefined;
        setDisconnectedState();
      }
    };

    const handleChainChanged = async () => {
      await initializeWalletProvider({ refreshBalances: true });
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    walletProviderCleanup = () => {
      const remover = provider.removeListener || provider.off;
      if (typeof remover === 'function') {
        remover.call(provider, 'accountsChanged', handleAccountsChanged);
        remover.call(provider, 'chainChanged', handleChainChanged);
      }
    };
  }

  async function initializeWalletProvider({ refreshBalances = false } = {}) {
    if (!appKitProvider || !appKitProvider.walletProvider) {
      detachWalletListeners();
      writeProvider = undefined;
      isWalletConnected.value = false;
      return;
    }

    try {
      writeProvider = new BrowserProvider(appKitProvider.walletProvider);
      attachWalletListeners();
      await updateWalletState(writeProvider);
      if (refreshBalances && typeof refreshPresaleData === 'function') {
        await refreshPresaleData();
      }
    } catch (error) {
      console.error('Failed to initialize wallet provider', error);
      writeProvider = undefined;
    }
  }

  async function ensureWriteProvider() {
    if (!writeProvider) {
      await initializeWalletProvider();
    }
    return writeProvider;
  }

  // ─── User-facing actions ────────────────────────────────────────────

  async function connectWallet(connectorId = 'appkit') {
    connectionError.value = '';
    if (typeof dismissOnboarding === 'function') {
      dismissOnboarding('connect_clicked');
    }
    const rawConnector =
      typeof connectorId === 'string' && connectorId.trim() ? connectorId.trim() : 'appkit';
    const normalizedConnector = rawConnector.toLowerCase();
    lastWalletConnector.value = normalizedConnector;
    const connectSource = normalizedConnector === 'appkit' ? 'primary_button' : 'quick_connect';
    setPendingWalletConnectContext({
      source: 'buy_widget',
      connector: normalizedConnector,
    });
    trackFunnelEvent('wallet_connect_initiated', {
      wallet_provider: normalizedConnector,
      source: connectSource,
    });
    trackFunnelEvent('wallet_connect_clicked', {
      wallet_provider: normalizedConnector,
      source: connectSource,
    });
    trackEvent('wallet_connect_initiated', {
      token: tokenTicker || 'unknown',
      connector: normalizedConnector,
      source: connectSource,
    });

    try {
      if (appKit && typeof appKit.open === 'function') {
        const payload = { view: 'Connect' };
        if (normalizedConnector === 'metamask') payload.walletId = 'metamask';
        if (normalizedConnector === 'walletconnect') payload.connectorId = 'walletconnect';
        if (normalizedConnector === 'coinbase') payload.walletId = 'coinbase';
        appKit.open(payload);
      } else if (appKitProvider?.open) {
        appKitProvider.open();
      } else if (appKitProvider?.walletProvider?.request) {
        await appKitProvider.walletProvider.request({ method: 'eth_requestAccounts' });
      } else if (window?.ethereum?.request) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        connectionError.value = 'No compatible wallet provider was detected.';
      }
    } catch (error) {
      const resolved = resolveError(error, {
        fallbackMessage: 'Unable to connect. Check your wallet and try again.',
      });
      connectionError.value = resolved.message;
      setPendingWalletConnectContext(null);
      if (resolved.code === 'tx_rejected') {
        showFormAlert({
          type: 'info',
          title: 'Connection cancelled',
          message: resolved.message,
          code: 'wallet-connect-cancelled',
        });
      } else {
        showFormAlert({
          type: 'error',
          title: 'Connection issue',
          message: resolved.message,
          code: 'wallet-connect-error',
        });
      }
    }
  }

  async function switchToMainnet() {
    if (!appKitProvider?.walletProvider?.request) {
      connectionError.value = 'Wallet provider does not support network switching. Use your wallet UI to change networks.';
      return;
    }
    switchingNetwork.value = true;
    try {
      await appKitProvider.walletProvider.request({

        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      });
      networkMismatch.value = false;
      connectionError.value = '';
      clearFormAlert('network-switch-failed');
      clearFormAlert('network-mismatch');
    } catch (error) {
      const resolved = resolveError(error, {
        fallbackMessage: 'Could not switch networks. Use your wallet to select Ethereum Mainnet.',
      });
      connectionError.value = resolved.message;
      showFormAlert({
        type: 'error',
        title: 'Network switch failed',
        message: resolved.message,
        code: 'network-switch-failed',
      });
    } finally {
      switchingNetwork.value = false;
    }
  }

  async function ensureWalletReady() {
    connectionError.value = '';
    if (!isWalletConnected.value) {
      connectionError.value = 'Connect a wallet to continue.';
      showFormAlert({
        type: 'warning',
        title: 'Connect your wallet',
        message: 'Connect a wallet to ignite your purchase.',
        code: 'wallet-not-connected',
      });
      return false;
    }
    if (networkMismatch.value) {
      connectionError.value = 'Switch to Ethereum Mainnet to continue.';
      showFormAlert({
        type: 'warning',
        title: 'Wrong network',
        message: 'You need Ethereum Mainnet to take part in this presale.',
        code: 'network-mismatch',
        dismissible: false,
      });
      return false;
    }
    const providerInstance = await ensureWriteProvider();
    if (!providerInstance) {
      connectionError.value = 'Wallet provider unavailable. Reconnect and try again.';
      showFormAlert({
        type: 'error',
        title: 'Wallet unavailable',
        message: 'Wallet provider unavailable. Reconnect your wallet and try again.',
        code: 'wallet-provider-unavailable',
      });
      return false;
    }
    const accounts = await providerInstance.listAccounts();
    if (!accounts || accounts.length === 0) {
      connectionError.value = 'Unlock your wallet and reconnect.';
      showFormAlert({
        type: 'warning',
        title: 'Unlock wallet',
        message: 'Unlock your wallet and reconnect before purchasing.',
        code: 'wallet-locked',
      });
      return false;
    }
    clearFormAlert('wallet-not-connected');
    clearFormAlert('wallet-provider-unavailable');
    clearFormAlert('wallet-locked');
    connectionError.value = '';
    return true;
  }

  // ─── Watchers ───────────────────────────────────────────────────────

  watch(
    () => appKitAccount.value.address,
    (nextAddress) => {
      const normalized = typeof nextAddress === 'string' ? nextAddress.trim() : '';
      if (normalized) {
        const accountsConnected = Math.max(appKitAccount.value?.allAccounts?.length || 1, 1);
        const shouldTrack = hasTrackedAccountAddress;
        applyWalletAddress(normalized, {
          chainId: normalizeChainId(ChainController?.state?.activeCaipNetwork?.id ?? currentChainId.value),
          accountsConnected,
          shouldTrack,
        });
        hasTrackedAccountAddress = true;
      } else {
        hasTrackedAccountAddress = false;
        setDisconnectedState();
      }
    },
    { immediate: true }
  );

  watch(
    () => appKitAccount.value.isConnected,
    (connected) => {
      if (!connected) {
        hasTrackedAccountAddress = false;
        setDisconnectedState();
      }
    }
  );

  watch(
    () => appKitProvider?.walletProvider,
    (provider) => {
      if (provider) {
        initializeWalletProvider({ refreshBalances: true }).catch((error) => {
          if (import.meta.env.DEV) {
            console.warn('Failed to initialize wallet after provider change', error);
          }
        });
      } else {
        detachWalletListeners();
        writeProvider = undefined;
        isWalletConnected.value = false;
        if (typeof onDisconnected === 'function') {
          onDisconnected();
        }
      }
    }
  );

  // ─── Public API ─────────────────────────────────────────────────────

  return {
    // Reactive state
    isWalletConnected,
    walletAddress,
    currentChainId,
    networkMismatch,
    switchingNetwork,
    connectionError,
    lastWalletConnector,

    // Computeds
    shortWalletAddress,
    displayChainName,
    networkAlertVisible,
    walletReadyForSummary,

    // Functions
    setDisconnectedState,
    applyWalletAddress,
    resolveWalletProviderName,
    initializeWalletProvider,
    attachWalletListeners,
    detachWalletListeners,
    updateWalletState,
    ensureWriteProvider,
    ensureWalletReady,
    connectWallet,
    switchToMainnet,
  };
}
