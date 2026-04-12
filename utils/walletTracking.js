import { trackFunnelEvent } from '@d2sg/cms/utils/analytics';

const STORAGE_KEY = 'd2sg_wallet_connected_addresses';
const DEFAULT_CONNECTOR = 'appkit';

function getGlobalTrackingState() {
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : window;
  if (!globalObject.__d2sgWalletTracking) {
    globalObject.__d2sgWalletTracking = {
      loaded: false,
      tracked: new Set(),
      pendingConnect: null,
    };
  }
  return globalObject.__d2sgWalletTracking;
}

function normalizeAddress(address) {
  if (typeof address !== 'string') return '';
  const trimmed = address.trim();
  return trimmed ? trimmed.toLowerCase() : '';
}

function ensureLoaded() {
  const state = getGlobalTrackingState();
  if (state.loaded) return state;

  state.loaded = true;

  if (typeof sessionStorage === 'undefined') {
    return state;
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored);
      if (Array.isArray(entries)) {
        for (const key of entries) {
          if (typeof key === 'string' && key) {
            state.tracked.add(key);
          }
        }
      }
    }
  } catch {
    // ignore parse failures and fall back to an empty set
  }

  return state;
}

function persist() {
  if (typeof sessionStorage === 'undefined') return;
  const state = getGlobalTrackingState();
  try {
    const payload = JSON.stringify(Array.from(state.tracked));
    sessionStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // best-effort only; ignore storage errors (quota, privacy mode, etc.)
  }
}

function buildKey(address, token) {
  const normalizedToken = typeof token === 'string' && token.trim() ? token.trim().toLowerCase() : 'unknown';
  return `${normalizedToken}:${address}`;
}

function normalizePendingContext(context) {
  if (!context || typeof context !== 'object') return null;
  const source = typeof context.source === 'string' && context.source.trim() ? context.source.trim() : '';
  const connector = typeof context.connector === 'string' && context.connector.trim()
    ? context.connector.trim().toLowerCase()
    : '';
  const provider = typeof context.provider === 'string' && context.provider.trim()
    ? context.provider.trim()
    : connector;

  return {
    source: source || 'unknown',
    connector: connector || DEFAULT_CONNECTOR,
    provider: provider || 'unknown',
  };
}

export function setPendingWalletConnectContext(context) {
  const state = ensureLoaded();
  state.pendingConnect = normalizePendingContext(context);
}

export function consumePendingWalletConnectContext() {
  const state = ensureLoaded();
  const value = state.pendingConnect;
  state.pendingConnect = null;
  return value;
}

export function peekPendingWalletConnectContext() {
  const state = ensureLoaded();
  return state.pendingConnect;
}

export function markWalletDisconnected(address, token) {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return;

  const state = ensureLoaded();
  const key = buildKey(normalizedAddress, token);
  if (state.tracked.delete(key)) {
    persist();
  }
}

export function trackWalletConnectedOnce({
  address,
  providerName,
  chainId,
  accountsConnected = 1,
  token = (import.meta.env.VITE_TOKEN || '').toLowerCase(),
  source,
  onFirstConnect,
} = {}) {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return false;

  const state = ensureLoaded();
  const key = buildKey(normalizedAddress, token);
  const pendingPreview = peekPendingWalletConnectContext();

  if (state.tracked.has(key)) {
    if (pendingPreview) {
      consumePendingWalletConnectContext();
    }
    return false;
  }

  const pendingContext = consumePendingWalletConnectContext();

  state.tracked.add(key);
  persist();

  const resolvedProvider =
    typeof providerName === 'string' && providerName.trim()
      ? providerName.trim()
      : pendingContext?.provider || 'unknown';

  const resolvedSource =
    typeof source === 'string' && source.trim()
      ? source.trim()
      : pendingContext?.source || 'unknown';

  const payload = {
    wallet_provider: resolvedProvider,
    accounts_connected: Number.isFinite(accountsConnected) && accountsConnected > 0 ? accountsConnected : 1,
  };

  if (typeof chainId === 'number' && Number.isFinite(chainId)) {
    payload.chain_id = chainId;
  }

  if (resolvedSource) {
    payload.source = resolvedSource;
  }

  trackFunnelEvent('wallet_connected', payload);
  trackFunnelEvent('wallet_connected_success', payload);

  if (typeof onFirstConnect === 'function') {
    try {
      onFirstConnect();
    } catch {}
  }

  return true;
}
