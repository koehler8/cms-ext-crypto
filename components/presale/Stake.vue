<template>
  <div id="rightPresale" class="stake-layout text-center equal-height">
    <div class="stake-card brand-card ui-card">
      <section class="stake-section stake-section--global">
        <p class="stake-section__title ui-label-sm">{{ globalStakeTitle }}</p>
        <div class="stake-section__metrics ui-grid-sm-2" role="list">
          <StatusMetric
            v-for="metric in globalStakeMetrics"
            :key="metric.id"
            :label="metric.label"
            :icon="metric.icon"
            :tooltip="metric.tooltip"
            :loading="metric.loading"
            :loader-width="metric.loaderWidth || '8ch'"
            :value="metric.value"
            :unit="metric.unit"
          />
        </div>
      </section>

      <section class="stake-section stake-section--personal">
        <p class="stake-section__title ui-label-sm">{{ personalStakeTitle }}</p>
        <div
          v-if="showPersonalMetrics"
          class="stake-section__metrics stake-section__metrics--personal ui-grid-sm-2"
          role="list"
        >
          <template v-for="(metric, index) in personalStakeMetrics" :key="metric.id">
            <StatusMetric
              :label="metric.label"
              :icon="metric.icon"
              :value="metric.value"
              :unit="metric.unit"
              :class="metric.isPersonal ? 'status-metric--personal' : ''"
            />
            <div
              v-if="index === 0"
              class="stake-section__actions stake-section__actions--inline"
              role="presentation"
            >
              <button
                id="stakeAvailable"
                class="primary-button stake-primary-button"
                @click="stakePurchasedTokensFromPresale"
                :style="{ display: presaleStakeTokenDisplay }"
                :aria-label="stakeAriaLabel"
              >
                {{ stake || `Stake ${tokenUnitLabel}` }}
              </button>
            </div>
          </template>
        </div>
        <p v-else class="stake-section__empty ui-label-sm">
          {{ personalEmptyState }}
        </p>

        <div
          v-if="stakeAlert"
          :class="['stake-alert', `stake-alert--${stakeAlert.type || 'info'}`]"
          :role="stakeAlert.type === 'error' ? 'alert' : 'status'"
          :aria-live="stakeAlert.type === 'error' ? 'assertive' : 'polite'"
        >
          <button
            v-if="stakeAlert.dismissible !== false"
            class="stake-alert__close"
            type="button"
            aria-label="Dismiss staking message"
            @click="clearStakeAlert()"
          >
            ×
          </button>
          <p v-if="stakeAlert.title" class="stake-alert__title">{{ stakeAlert.title }}</p>
          <p class="stake-alert__message">{{ stakeAlert.message }}</p>
        </div>

        <div class="stake-section__actions">
          <button
            id="claimAvailable"
            class="stake-card__button"
            @click="claimNonStakedToken"
            :style="{ display: claimTokenDisplay }"
          >
            {{ claimTokenLabel }}
          </button>
        </div>



        <div
          v-if="claimAllTokensDisplay !== 'none'"
          class="stake-section__actions stake-section__actions--secondary"
        >
          <button
            id="claimAllTokens"
            class="stake-card__button stake-card__button--full"
            @click="claimAllToken"
          >
            {{ claimAllTokensLabel }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
  import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';
  import { BrowserProvider, ethers } from 'ethers';
  import { useAppKitProvider } from "@reown/appkit/vue";
  import { trackEvent, trackFunnelEvent } from '@koehler8/cms/utils/analytics';
  import { formatPercent, formatTokenAmount } from '@koehler8/cms/utils/formatNumber';
  import StatusMetric from './StatusMetric.vue';
  import { getPresaleReadContract, getPresaleWriteContract, getRegistryContract } from '../../utils/presaleContracts';

  const appKitProvider = useAppKitProvider("eip155");

  let writeProvider;
  let readProvider;
  let rewardsRefreshTimerId = null;
  let walletRefreshInFlight = null;

  const REWARDS_REFRESH_INTERVAL_MS = 45000;

  class WalletContextError extends Error {
    constructor(code, message = '') {
      super(message || code);
      this.name = 'WalletContextError';
      this.code = code;
    }
  }

  async function getWalletContext({ silent = false } = {}) {
    const provider = await ensureWriteProvider();
    if (!provider) {
      isWalletConnected.value = false;
      if (silent) return null;
      throw new WalletContextError('no_provider', 'Wallet provider unavailable');
    }

    let accounts;
    try {
      accounts = await provider.listAccounts();
    } catch (error) {
      console.error('Failed to list wallet accounts', error);
      isWalletConnected.value = false;
      if (silent) return null;
      throw new WalletContextError('no_accounts', 'Unable to list wallet accounts');
    }

    const hasAccounts = Array.isArray(accounts) && accounts.length > 0;
    isWalletConnected.value = hasAccounts;
    if (!hasAccounts) {
      if (silent) return null;
      throw new WalletContextError('no_accounts', 'No wallet accounts available');
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return { provider, signer, address };
  }

  function showWalletActionRequiredAlert({ actionKey, intent = 'general', reason }) {
    const title = reason === 'no_accounts' ? 'Wallet required' : 'Connect wallet';
    let message = 'Connect your wallet to continue.';
    if (intent === 'stake') {
      message =
        reason === 'no_accounts'
          ? 'Connect your wallet to finish staking.'
          : 'Connect your wallet to stake your tokens.';
    } else if (intent === 'claim') {
      message = 'Connect your wallet to claim your tokens.';
    }
    const suffix = reason === 'no_accounts' ? 'no-accounts' : 'wallet-required';
    showStakeAlert({
      type: 'info',
      title,
      message,
      code: `${actionKey}-${suffix}`,
    });
  }

  let presaleContractAddress;
  const availableToStakeValue = ref('0');
  const currentRewardsValue = ref('0');
  const stakingApyValue = ref('—');
  const isApyLoading = ref(true);
  const totalStakedTokensValue = ref('—');
  const isGlobalStakeLoading = ref(true);
  const stakedTokensValue = ref('0');
  const availableToStakeAmount = ref(0);
  const currentRewardsAmount = ref(0);
  const stakedTokensAmount = ref(0);
  const isWalletConnected = ref(false);
  const hasPersonalStakeActivity = computed(() =>
    availableToStakeAmount.value > 0 ||
    stakedTokensAmount.value > 0 ||
    currentRewardsAmount.value > 0
  );
  function toSafeTokenAmount(value) {
    if (!Number.isFinite(value)) return 0;
    return value > 0 ? value : 0;
  }
  function formatStakeAmount(value) {
    return formatTokenAmount(value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function sanitizeText(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim();
  }
  function formatTemplate(value, replacements = {}) {
    const base = sanitizeText(value);
    if (!base) return '';
    return base.replace(/\{(\w+)\}/g, (_, key) => (key in replacements ? replacements[key] : ''));
  }
  const DEFAULT_STAKE_ARIA_LABEL = 'Stake purchased tokens';
  const DEFAULT_CLAIM_LABEL_TEMPLATE = 'Claim {token}';
  const DEFAULT_CLAIM_ALL_LABEL_TEMPLATE = 'Claim All {token}';

  const claimTokenDisplay = ref('none');
  const claimAllTokensDisplay = ref('none');
  const presaleStakeTokenDisplay = ref('');
  const TOKEN_TICKER = import.meta.env.VITE_TOKEN;
  const tokenUnitLabel = computed(() => {
    const ticker = (TOKEN_TICKER || '').trim();
    return ticker ? `$${ticker.toUpperCase()}` : '$TOKEN';
  });
  const stakeAriaLabel = ref(DEFAULT_STAKE_ARIA_LABEL);
  const claimTokenLabel = ref(formatTemplate(DEFAULT_CLAIM_LABEL_TEMPLATE, { token: tokenUnitLabel.value }));
  const claimAllTokensLabel = ref(
    formatTemplate(DEFAULT_CLAIM_ALL_LABEL_TEMPLATE, { token: tokenUnitLabel.value })
  );
  const stakeAlert = ref(null);
  let stakeAlertTimeoutId = null;

  function clearStakeAlert(code) {
    if (!stakeAlert.value) return;
    if (!code || stakeAlert.value.code === code) {
      stakeAlert.value = null;
      if (stakeAlertTimeoutId !== null && typeof window !== 'undefined') {
        window.clearTimeout(stakeAlertTimeoutId);
        stakeAlertTimeoutId = null;
      }
    }
  }

  function showStakeAlert({
    type = 'info',
    title = '',
    message = '',
    code = '',
    dismissible = true,
    autoCloseMs = 0,
  } = {}) {
    const safeMessage = sanitizeText(message);
    if (!safeMessage) return;
    const safeTitle = sanitizeText(title);
    stakeAlert.value = {
      id: Date.now(),
      type,
      title: safeTitle,
      message: safeMessage,
      code,
      dismissible,
    };
    if (stakeAlertTimeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(stakeAlertTimeoutId);
      stakeAlertTimeoutId = null;
    }
    if (autoCloseMs > 0 && typeof window !== 'undefined') {
      stakeAlertTimeoutId = window.setTimeout(() => {
        stakeAlert.value = null;
        stakeAlertTimeoutId = null;
      }, autoCloseMs);
    }
  }

  function resolveStakeErrorCopy(error) {
    const code = typeof error?.code === 'number' ? String(error.code) : error?.code;
    const tokenLabel = tokenUnitLabel.value || '$TOKEN';
    if (code === 'ACTION_REJECTED' || code === '4001') {
      return {
        type: 'warning',
        title: 'Stake cancelled',
        message: 'The request was cancelled in your wallet. Nothing has been staked.',
        code: 'stake-cancelled',
        autoCloseMs: 6000,
      };
    }
    if (code === 'INSUFFICIENT_FUNDS') {
      return {
        type: 'error',
        title: 'Not enough ETH for gas',
        message: 'Add a little more ETH to cover gas fees, then try staking again.',
        code: 'stake-gas',
      };
    }
    if (code === 'CALL_EXCEPTION' || code === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        type: 'error',
        title: 'Stake rejected',
        message: `The contract could not stake your ${tokenLabel}. Refresh your balances and confirm you still have stakeable tokens.`,
        code: 'stake-contract-reject',
      };
    }
    const fallbackDetail = sanitizeText(
      error?.shortMessage ||
        error?.info?.error?.message ||
        error?.message ||
        ''
    );
    const detailSuffix = fallbackDetail ? ` (${fallbackDetail})` : '';
    return {
      type: 'error',
      title: 'Stake failed',
      message: detailSuffix
        ? `Something went wrong while staking.${detailSuffix} Try again or reconnect your wallet.`
        : 'Something went wrong while staking. Try again or reconnect your wallet.',
      code: 'stake-unknown-error',
    };
  }

  function showClaimSuccessAlert(scope) {
    const unitLabel = tokenUnitLabel.value || '$TOKEN';
    const isAllScope = scope === 'all';
    const title = isAllScope ? 'All tokens claimed' : 'Tokens claimed';
    const message = isAllScope
      ? `Your remaining ${unitLabel} (staked and unstaked) has been claimed. Wallet totals refresh after the block confirms.`
      : `Your unstaked ${unitLabel} is on the way. Wallet totals refresh after the block confirms.`;
    showStakeAlert({
      type: 'success',
      title,
      message,
      code: `claim-${scope}-success`,
      autoCloseMs: 12000,
    });
  }

  function resolveClaimErrorCopy(scope, error) {
    const code = typeof error?.code === 'number' ? String(error.code) : error?.code;
    const unitLabel = tokenUnitLabel.value || '$TOKEN';
    const audience = scope === 'all' ? `remaining ${unitLabel}` : `${unitLabel}`;
    if (code === 'ACTION_REJECTED' || code === '4001') {
      return {
        type: 'warning',
        title: 'Claim cancelled',
        message: 'You dismissed the claim request in your wallet. No tokens were claimed.',
        code: `claim-${scope}-cancelled`,
        autoCloseMs: 6000,
      };
    }
    if (code === 'INSUFFICIENT_FUNDS') {
      return {
        type: 'error',
        title: 'Not enough ETH for gas',
        message: 'Add a little more ETH for gas fees, then try claiming again.',
        code: `claim-${scope}-gas`,
      };
    }
    if (code === 'CALL_EXCEPTION' || code === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        type: 'error',
        title: 'Claim rejected',
        message: `The contract could not release your ${audience}. Refresh balances and confirm you still have claimable tokens.`,
        code: `claim-${scope}-contract-reject`,
      };
    }
    const fallbackDetail = sanitizeText(
      error?.shortMessage || error?.info?.error?.message || error?.message || ''
    );
    const detailSuffix = fallbackDetail ? ` (${fallbackDetail})` : '';
    return {
      type: 'error',
      title: 'Claim failed',
      message: detailSuffix
        ? `Something went wrong while claiming your ${audience}.${detailSuffix} Try again or reconnect your wallet.`
        : `Something went wrong while claiming your ${audience}. Try again or reconnect your wallet.`,
      code: `claim-${scope}-unknown-error`,
    };
  }
  const apyTooltip = computed(() => {
    const unit = tokenUnitLabel.value || '$TOKEN';
    return `Annual Percentage Yield on locked ${unit} — compounding rewards over time.`;
  });

  function resetWalletDependentState() {
    isWalletConnected.value = false;
    availableToStakeAmount.value = 0;
    availableToStakeValue.value = formatStakeAmount(0);
    stakedTokensAmount.value = 0;
    stakedTokensValue.value = formatStakeAmount(0);
    currentRewardsAmount.value = 0;
    currentRewardsValue.value = formatStakeAmount(0);
    claimTokenDisplay.value = 'none';
    claimAllTokensDisplay.value = 'none';
    clearStakeAlert();
  }

  resetWalletDependentState();

  const globalStakeMetrics = computed(() => {
    const tokenLabel = tokenUnitLabel.value;
    return [
      {
        id: 'stake-global-apy',
        label: stakingApy.value || 'Staking APY',
        value: stakingApyValue.value,
        unit: 'APY',
        icon: 'yield',
        loading: isApyLoading.value,
        tooltip: apyTooltip.value,
        loaderWidth: '6ch',
      },
      {
        id: 'stake-global-total',
        label: globalTokens.value || (tokenLabel ? `Global ${tokenLabel} Staked` : 'Global tokens staked'),
        value: totalStakedTokensValue.value,
        unit: tokenLabel,
        icon: 'token',
        loading: isGlobalStakeLoading.value,
        loaderWidth: '10ch',
      },
    ];
  });

  const personalStakeMetrics = computed(() => {
    if (!hasPersonalStakeActivity.value) return [];
    const tokenLabel = tokenUnitLabel.value;
    return [
      {
        id: 'stake-personal-available',
        label: availableStake.value || (tokenLabel ? `Stakeable ${tokenLabel}` : 'Stakeable Tokens'),
        value: availableToStakeValue.value,
        unit: tokenLabel,
        icon: 'token',
        loading: false,
        isPersonal: true,
      },
      {
        id: 'stake-personal-staked',
        label: yourStaked.value || (tokenLabel ? `Staked ${tokenLabel}` : 'Staked Tokens'),
        value: stakedTokensValue.value,
        unit: tokenLabel,
        icon: 'lock',
        loading: false,
        isPersonal: true,
      },
      {
        id: 'stake-personal-rewards',
        label: yourRewards.value || (tokenLabel ? `${tokenLabel} Rewards` : 'Rewards'),
        value: currentRewardsValue.value,
        unit: tokenLabel,
        icon: 'rewards',
        loading: false,
        isPersonal: true,
      },
    ];
  });

  const showPersonalMetrics = computed(() => personalStakeMetrics.value.length > 0);

  const cleanupFns = [];
  let walletProviderCleanup;

  function registerCleanup(fn) {
    cleanupFns.push(fn);
  }

  registerCleanup(() => {
    if (stakeAlertTimeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(stakeAlertTimeoutId);
      stakeAlertTimeoutId = null;
    }
  });

  const CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
  const RPC_READ = import.meta.env.VITE_RPC_READ;

  function detachWalletListeners() {
    if (walletProviderCleanup) {
      try { walletProviderCleanup(); } catch (_) {}
      walletProviderCleanup = undefined;
    }
  }

  function attachWalletListeners() {
    const provider = appKitProvider?.walletProvider;
    if (!provider || typeof provider.on !== 'function') return;

    detachWalletListeners();

    const handleAccountsChanged = async (accounts) => {
      if (accounts && accounts.length > 0) {
        await initializeWalletProvider({ refreshSnapshot: true });
      } else {
        resetWalletDependentState();
        writeProvider = undefined;
      }
    };

    const handleChainChanged = async () => {
      await initializeWalletProvider({ refreshSnapshot: true });
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

  async function initializeWalletProvider({ refreshSnapshot = false } = {}) {
    if (!appKitProvider || !appKitProvider.walletProvider) {
      detachWalletListeners();
      writeProvider = undefined;
      resetWalletDependentState();
      return;
    }

    try {
      writeProvider = new BrowserProvider(appKitProvider.walletProvider);
      attachWalletListeners();
      const accounts = await writeProvider.listAccounts();
      const hasAccounts = Array.isArray(accounts) && accounts.length > 0;
      isWalletConnected.value = hasAccounts;
      if (!hasAccounts) {
        resetWalletDependentState();
      }
      if (refreshSnapshot) {
        await refreshStakeSnapshot();
      }
    } catch (err) {
      console.error('Failed to initialize wallet provider', err);
      writeProvider = undefined;
      resetWalletDependentState();
    }
  }

  async function ensureWriteProvider() {
    if (!writeProvider) {
      await initializeWalletProvider();
    }
    return writeProvider;
  }

  const SNAPSHOT_TASKS = [
    { id: 'stake-global-apy', runner: updateStakingAPY },
    { id: 'stake-global-total', runner: updateGlobalStakedTokens },
    { id: 'stake-wallet-total', runner: updateStakedTokens, needsWallet: true },
    { id: 'stake-wallet-available', runner: getAvailableToStake, needsWallet: true },
    { id: 'stake-wallet-yield', runner: updateStakedTokenYield, needsWallet: true },
    { id: 'stake-presale-status', runner: checkPresaleStatus },
  ];

  const WALLET_SNAPSHOT_TASK_IDS = new Set(
    SNAPSHOT_TASKS.filter(({ needsWallet }) => needsWallet).map(({ id }) => id)
  );

  const WALLET_REFRESH_TASKS = SNAPSHOT_TASKS.filter(
    ({ id, needsWallet }) => needsWallet || id === 'stake-presale-status'
  );

  async function refreshStakeSnapshot() {
    if (!presaleContractAddress || !readProvider) {
      isApyLoading.value = false;
      isGlobalStakeLoading.value = false;
      return;
    }
    isApyLoading.value = true;
    isGlobalStakeLoading.value = true;

    let walletContextPromise = null;

    const results = await Promise.allSettled(
      SNAPSHOT_TASKS.map(({ id, runner, needsWallet }) => {
        const contextPromise = needsWallet
          ? walletContextPromise ||
            (walletContextPromise = getWalletContext({ silent: true }))
          : Promise.resolve(undefined);

        return contextPromise
          .then((context) => runner(context))
          .catch((error) => {
            throw { error, id };
          });
      })
    );

    handleStakeSnapshotResults(results);
  }

  function handleStakeSnapshotResults(results = []) {
    if (!Array.isArray(results) || results.length === 0) {
      clearStakeAlert('stake-refresh-failed');
      return;
    }

    const failures = results
      .filter((entry) => entry.status === 'rejected')
      .map((entry) => entry.reason || {});

    if (failures.length === 0) {
      clearStakeAlert('stake-refresh-failed');
      return;
    }

    failures.forEach(({ id, error }) => {
      console.warn(`Stake snapshot task "${id || 'unknown'}" failed`, error);
    });

    const walletFailure = failures.find(({ id }) => WALLET_SNAPSHOT_TASK_IDS.has(id));
    if (walletFailure) {
      if (stakeAlert.value?.code === 'stake-refresh-failed') {
        return;
      }
      showStakeAlert({
        type: 'warning',
        title: 'Wallet data unavailable',
        message: 'We could not refresh your staking balances. Reconnect your wallet or try again shortly.',
        code: 'stake-refresh-failed',
      });
    }
  }

  async function refreshWalletStakeMetrics() {
    if (walletRefreshInFlight) {
      return walletRefreshInFlight;
    }
    walletRefreshInFlight = (async () => {
      if (!presaleContractAddress || !readProvider) {
        return;
      }
      let walletContextPromise = null;
      const results = await Promise.allSettled(
        WALLET_REFRESH_TASKS.map(({ id, runner, needsWallet }) => {
          const contextPromise = needsWallet
            ? walletContextPromise ||
              (walletContextPromise = getWalletContext({ silent: true }))
            : Promise.resolve(undefined);
          return contextPromise
            .then((context) => runner(context))
            .catch((error) => {
              throw { error, id };
            });
        })
      );
      handleStakeSnapshotResults(results);
    })();
    try {
      await walletRefreshInFlight;
    } finally {
      walletRefreshInFlight = null;
    }
  }

  function stopRewardsRefreshLoop() {
    if (rewardsRefreshTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(rewardsRefreshTimerId);
      rewardsRefreshTimerId = null;
    }
  }

  function startRewardsRefreshLoop() {
    if (typeof window === 'undefined' || rewardsRefreshTimerId !== null) {
      return;
    }
    rewardsRefreshTimerId = window.setInterval(() => {
      refreshWalletStakeMetrics();
    }, REWARDS_REFRESH_INTERVAL_MS);
  }

  async function fetchPresaleContractAddress() {
    const registryContract = getRegistryContract(CONTRACT_REGISTRY_ADDRESS, readProvider);
    if (!registryContract) {
      throw new Error('Presale stake: registry contract could not be created.');
    }
    const resolvedAddress = await registryContract.getContractAddress(`${TOKEN_TICKER}-PRESALE`);
    if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
      throw new Error(`Presale stake: contract address missing for token "${TOKEN_TICKER}".`);
    }
    presaleContractAddress = resolvedAddress;
  }

  async function updateStakingAPY() {
    if (!presaleContractAddress || !readProvider) {
      stakingApyValue.value = '—';
      isApyLoading.value = false;
      return;
    }
    try {
      const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
      if (!presaleContract) return;
      const currentAPY = await presaleContract.getAPY();
      const numericApy = Number(currentAPY);
      if (!Number.isFinite(numericApy)) {
        stakingApyValue.value = '—';
        return;
      }
      let percentValue = numericApy;
      if (percentValue > 1000) {
        percentValue = percentValue / 100;
      }
      const assumeFraction = percentValue > 0 && percentValue < 1;
      stakingApyValue.value = formatPercent(percentValue, {
        maximumFractionDigits: percentValue >= 100 ? 0 : 1,
        assumeFraction,
      });
    } catch (error) {
      console.warn('Unable to fetch staking APY', error);
      stakingApyValue.value = '—';
    } finally {
      isApyLoading.value = false;
    }
  }

  async function updateGlobalStakedTokens() {
    if (!presaleContractAddress || !readProvider) {
      totalStakedTokensValue.value = '—';
      isGlobalStakeLoading.value = false;
      return;
    }
    try {
      const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
      if (!presaleContract) return;
      const globalStaked = await presaleContract.getTotalStakedTokensGlobal();
      const total = Number.parseFloat(ethers.formatUnits(globalStaked, 18));
      const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
      totalStakedTokensValue.value = formatTokenAmount(safeTotal, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      console.warn('Unable to fetch global staked tokens', error);
      totalStakedTokensValue.value = '—';
    } finally {
      isGlobalStakeLoading.value = false;
    }
  }

  async function updateStakedTokens(walletContext) {
    const context =
      walletContext === undefined ? await getWalletContext({ silent: true }) : walletContext;
    if (!context) {
      resetWalletDependentState();
      return;
    }
    const { signer, address } = context;
    const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
    if (!presaleContract) return;
    const totalStaked = await presaleContract.getTotalStakedTokens(address);

    const total = Number.parseFloat(ethers.formatUnits(totalStaked, 18));
    const safeTotal = toSafeTokenAmount(total);
    stakedTokensAmount.value = safeTotal;
    stakedTokensValue.value = formatStakeAmount(safeTotal);
  }

  async function getAvailableToStake(walletContext) {
    const context =
      walletContext === undefined ? await getWalletContext({ silent: true }) : walletContext;
    if (!context) {
      isWalletConnected.value = false;
      availableToStakeAmount.value = 0;
      availableToStakeValue.value = formatStakeAmount(0);
      return;
    }

    const { signer, address } = context;
    const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
    if (!presaleContract) return;

    const purchasedTokens = await presaleContract.getPurchasedTokens(address);
    const total = Number.parseFloat(ethers.formatUnits(purchasedTokens, 18));
    const safeTotal = toSafeTokenAmount(total);
    availableToStakeAmount.value = safeTotal;
    availableToStakeValue.value = formatStakeAmount(safeTotal);
  }

  async function updateStakedTokenYield(walletContext) {
    const context =
      walletContext === undefined ? await getWalletContext({ silent: true }) : walletContext;
    if (!context) {
      isWalletConnected.value = false;
      currentRewardsAmount.value = 0;
      currentRewardsValue.value = formatStakeAmount(0);
      return;
    }

    const { signer, address } = context;
    const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
    if (!presaleContract) return;
    const yieldValue = await presaleContract.getStakedTokenYield(address);
    const total = Number.parseFloat(ethers.formatUnits(yieldValue, 18));
    const safeTotal = toSafeTokenAmount(total);
    currentRewardsAmount.value = safeTotal;
    currentRewardsValue.value = formatStakeAmount(safeTotal);
  }

  async function checkPresaleStatus() {
    if (!presaleContractAddress || !readProvider) return;
    const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
    if (!presaleContract) return;
    const presaleFlag = await presaleContract.getPresaleFlag();
    const claimFlag = await presaleContract.getClaimFlag();
    const stakedClaimFlag = await presaleContract.getStakedClaimFlag();

    if (!presaleFlag && claimFlag) {
      if (stakedClaimFlag) {
        claimAllTokensDisplay.value = '';
        claimTokenDisplay.value = 'none';
        presaleStakeTokenDisplay.value = 'none';
      } else {
        claimTokenDisplay.value = '';
        claimAllTokensDisplay.value = 'none';
        presaleStakeTokenDisplay.value = '';
      }
    } else {
      claimTokenDisplay.value = 'none';
      claimAllTokensDisplay.value = 'none';
      presaleStakeTokenDisplay.value = '';
    }

    if (!isWalletConnected.value) {
      claimTokenDisplay.value = 'none';
      claimAllTokensDisplay.value = 'none';
    }
  }

  async function stakePurchasedTokensFromPresale() {
    clearStakeAlert();
    let walletContext;
    try {
      walletContext = await getWalletContext();
    } catch (error) {
      const reason = error?.code || 'no_provider';
      trackEvent('stake_tokens_blocked', {
        token: TOKEN_TICKER || 'unknown',
        reason,
      });
      showWalletActionRequiredAlert({
        actionKey: 'stake',
        intent: 'stake',
        reason,
      });
      return;
    }

    const availableStakeAmount = availableToStakeAmount.value;
    if (availableStakeAmount <= 0) {
      trackEvent('stake_tokens_blocked', {
        token: TOKEN_TICKER || 'unknown',
        reason: 'invalid_amount'
      });
      showStakeAlert({
        type: 'info',
        title: 'Nothing to stake yet',
        message: 'Buy tokens or refresh your wallet to load a stakeable balance.',
        code: 'stake-no-balance',
      });
      return;
    }

    let stakeFunnelPayload = {
      stake_type: 'manual',
      token_symbol: TOKEN_TICKER || 'unknown',
      stake_amount_token: Number(availableStakeAmount.toFixed(4)),
    };

    try {
      const { signer, address } = walletContext;
      const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
      if (!presaleContract) {
        showStakeAlert({
          type: 'error',
          title: 'Contract unavailable',
          message: 'Presale contract is unavailable. Refresh the page and try again.',
          code: 'stake-contract-missing',
        });
        return;
      }

      let stakeAmountWei = 0n;
      try {
        const availableTokens = await presaleContract.getPurchasedTokens(address);
        if (typeof availableTokens === 'bigint') {
          stakeAmountWei = availableTokens;
        } else if (availableTokens?._isBigNumber || typeof availableTokens === 'object') {
          // Fallback for legacy BigNumber shape
          stakeAmountWei = BigInt(availableTokens.toString());
        }
        const stakeAmount = Number.parseFloat(ethers.formatUnits(availableTokens, 18));
        if (Number.isFinite(stakeAmount) && stakeAmount > 0) {
          stakeFunnelPayload = {
            ...stakeFunnelPayload,
            stake_amount_token: Number(stakeAmount.toFixed(4)),
          };
        }
      } catch (error) {
        console.warn('Unable to resolve stake amount for analytics', error);
      }

      trackFunnelEvent('stake_initiated', { ...stakeFunnelPayload });
      trackFunnelEvent('stake_attempt', stakeFunnelPayload);

      trackEvent('stake_tokens_attempt', {
        token: TOKEN_TICKER || 'unknown',
        amount_token: stakeFunnelPayload.stake_amount_token
      });

      const hasStakeableBalance =
        (typeof stakeAmountWei === 'bigint' && stakeAmountWei > 0n) ||
        (typeof availableStakeAmount === 'number' && availableStakeAmount > 0);

      if (!hasStakeableBalance) {
        trackEvent('stake_tokens_blocked', {
          token: TOKEN_TICKER || 'unknown',
          reason: 'no_tokens'
        });
        showStakeAlert({
          type: 'warning',
          title: 'No stakeable tokens',
          message: 'We could not find any unstaked tokens. Refresh your wallet balances and try again.',
          code: 'stake-no-tokens',
        });
        return;
      }

      const tx = await presaleContract.stakePurchasedTokens();
      trackEvent('presale_transaction_submitted', {
        token: TOKEN_TICKER || 'unknown',
        type: 'stake',
        tx_hash: tx?.hash || 'unknown'
      });
      const receipt = await tx.wait();
      const transactionHash = receipt?.transactionHash || tx?.hash || 'unknown';
      trackEvent('stake_tokens_success', {
        token: TOKEN_TICKER || 'unknown',
        tx_hash: transactionHash,
        amount_token: stakeFunnelPayload.stake_amount_token
      });

      trackFunnelEvent('stake_success', {
        ...stakeFunnelPayload,
        transaction_hash: transactionHash,
      });
      trackFunnelEvent('stake_completed', {
        ...stakeFunnelPayload,
        transaction_hash: transactionHash,
      });

      window.dispatchEvent(new CustomEvent('refreshStakeData'));
      const amountDisplay = Number.isFinite(stakeFunnelPayload.stake_amount_token)
        ? formatStakeAmount(stakeFunnelPayload.stake_amount_token)
        : formatStakeAmount(availableStakeAmount);
      const unitLabel = tokenUnitLabel.value || '$TOKEN';
      showStakeAlert({
        type: 'success',
        title: 'Stake confirmed',
        message: `${amountDisplay} ${unitLabel} is now staked. Rewards update shortly after the block confirms.`,
        code: 'stake-success',
        autoCloseMs: 12000,
      });
    } catch (error) {
      console.error('Failed to stake purchased tokens', error);
      trackEvent('stake_tokens_error', {
        token: TOKEN_TICKER || 'unknown',
        amount_token: stakeFunnelPayload.stake_amount_token,
        error_code: error?.code || 'unknown',
        error_name: error?.name || 'unknown'
      });
      trackFunnelEvent('stake_error', {
        ...stakeFunnelPayload,
        error_code: error?.code || 'unknown',
        error_name: error?.name || 'unknown',
      });
      trackFunnelEvent('stake_failed', {
        ...stakeFunnelPayload,
        reason: 'error',
        error_code: error?.code || 'unknown',
        error_name: error?.name || 'unknown',
      });
      const errorCopy = resolveStakeErrorCopy(error);
      showStakeAlert({
        ...errorCopy,
        dismissible: true,
      });
    }
  }

  async function claimNonStakedToken() {
    let walletContext;
    try {
      walletContext = await getWalletContext();
    } catch (error) {
      const reason = error?.code || 'no_provider';
      trackEvent('claim_tokens_blocked', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'non_staked',
        reason,
      });
      showWalletActionRequiredAlert({
        actionKey: 'claim-non_staked',
        intent: 'claim',
        reason,
      });
      return;
    }

    try {
      const { signer } = walletContext;
      const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
      if (!presaleContract) return;
      trackEvent('claim_tokens_attempt', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'non_staked'
      });
      const tx = await presaleContract.claimTokens();
      trackEvent('presale_transaction_submitted', {
        token: TOKEN_TICKER || 'unknown',
        type: 'claim',
        scope: 'non_staked',
        tx_hash: tx?.hash || 'unknown'
      });
      const receipt = await tx.wait();
      trackEvent('claim_tokens_success', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'non_staked',
        tx_hash: receipt?.transactionHash || tx?.hash || 'unknown'
      });

      window.dispatchEvent(new CustomEvent('refreshStakeData'));

      showClaimSuccessAlert('non_staked');
    } catch (error) {
      console.error('Failed to claim tokens', error);
      trackEvent('claim_tokens_error', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'non_staked',
        error_code: error?.code || 'unknown',
        error_name: error?.name || 'unknown'
      });
      const claimErrorCopy = resolveClaimErrorCopy('non_staked', error);
      showStakeAlert(claimErrorCopy);
    }
  }

  async function claimAllToken() {
    let walletContext;
    try {
      walletContext = await getWalletContext();
    } catch (error) {
      const reason = error?.code || 'no_provider';
      trackEvent('claim_tokens_blocked', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'all',
        reason,
      });
      showWalletActionRequiredAlert({
        actionKey: 'claim-all',
        intent: 'claim',
        reason,
      });
      return;
    }

    try {
      const { signer } = walletContext;
      const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
      if (!presaleContract) return;
      trackEvent('claim_tokens_attempt', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'all'
      });
      const tx = await presaleContract.claimAllTokens();
      trackEvent('presale_transaction_submitted', {
        token: TOKEN_TICKER || 'unknown',
        type: 'claim_all',
        tx_hash: tx?.hash || 'unknown'
      });
      const receipt = await tx.wait();
      trackEvent('claim_tokens_success', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'all',
        tx_hash: receipt?.transactionHash || tx?.hash || 'unknown'
      });

      window.dispatchEvent(new CustomEvent('refreshStakeData'));

      showClaimSuccessAlert('all');
    } catch (error) {
      console.error('Failed to claim all tokens', error);
      trackEvent('claim_tokens_error', {
        token: TOKEN_TICKER || 'unknown',
        scope: 'all',
        error_code: error?.code || 'unknown',
        error_name: error?.name || 'unknown'
      });
      const claimErrorCopy = resolveClaimErrorCopy('all', error);
      showStakeAlert(claimErrorCopy);
    }
  }

  const stakingApy = ref('');
  const globalTokens = ref('');
  const availableStake = ref('');
  const stake = ref('');
  const yourStaked = ref('');
  const yourRewards = ref('');
  const globalStakeTitle = ref('Global Staking Stats');
  const personalStakeTitle = ref('Your Stake');
  const personalEmptyState = ref('No stakes yet. Connect your wallet or complete a purchase to unlock these totals.');

  const pageContent = inject('pageContent', ref({}));

  watch(
    () => pageContent.value,
    (content) => {
      const presaleContent = content?.presale || {};
      const unitLabel = tokenUnitLabel.value || '$TOKEN';
      stakingApy.value = sanitizeText(presaleContent.stakingApy) || 'Staking APY';
      globalTokens.value = sanitizeText(presaleContent.globalTokens) || `Global ${unitLabel} Staked`;
      availableStake.value = sanitizeText(presaleContent.availableStake) || `Stakeable ${unitLabel}`;
      stake.value = sanitizeText(presaleContent.stake) || `Stake ${unitLabel}`;
      yourStaked.value = sanitizeText(presaleContent.yourStaked) || `Staked ${unitLabel}`;
      yourRewards.value = sanitizeText(presaleContent.yourRewards) || `${unitLabel} Rewards`;
      globalStakeTitle.value = sanitizeText(presaleContent.globalStakeTitle) || 'Global Staking Stats';
      personalStakeTitle.value = sanitizeText(presaleContent.personalStakeTitle) || 'Your Stake';
      personalEmptyState.value = sanitizeText(presaleContent.personalEmptyState) || 'No stakes yet. Connect your wallet or complete a purchase to unlock these totals.';
      const stakeCopy = presaleContent.stakeCopy || {};
      stakeAriaLabel.value =
        sanitizeText(stakeCopy.stakeAriaLabel) || DEFAULT_STAKE_ARIA_LABEL;
      claimTokenLabel.value =
        formatTemplate(stakeCopy.claimLabel, { token: unitLabel }) ||
        formatTemplate(DEFAULT_CLAIM_LABEL_TEMPLATE, { token: unitLabel });
      claimAllTokensLabel.value =
        formatTemplate(stakeCopy.claimAllLabel, { token: unitLabel }) ||
        formatTemplate(DEFAULT_CLAIM_ALL_LABEL_TEMPLATE, { token: unitLabel });
    },
    { immediate: true }
  );

  watch(
    () => isWalletConnected.value,
    (connected) => {
      if (connected) {
        startRewardsRefreshLoop();
        refreshWalletStakeMetrics();
      } else {
        stopRewardsRefreshLoop();
      }
    },
    { immediate: true }
  );

  watch(
    () => appKitProvider?.walletProvider,
    async (provider) => {
      if (provider) {
        await initializeWalletProvider({ refreshSnapshot: true });
      } else {
        detachWalletListeners();
        writeProvider = undefined;
        resetWalletDependentState();
      }
    }
  );

  const handleRefreshStakeData = async () => {
    await refreshStakeSnapshot();
  };

  onMounted(async () => {
    if (!TOKEN_TICKER || !TOKEN_TICKER.trim()) {
      throw new Error('Presale stake: VITE_TOKEN is not configured.');
    }
    if (!CONTRACT_REGISTRY_ADDRESS || !CONTRACT_REGISTRY_ADDRESS.trim()) {
      throw new Error('Presale stake: VITE_REGISTRY_ADDRESS is not configured.');
    }
    if (!RPC_READ || !RPC_READ.trim()) {
      throw new Error('Presale stake: VITE_RPC_READ is not configured.');
    }

    try {
      readProvider = new ethers.JsonRpcProvider(RPC_READ);
      await fetchPresaleContractAddress();
      await initializeWalletProvider();
      await refreshStakeSnapshot();
    } catch (error) {
      console.error('Failed to bootstrap stake module', error);
      isApyLoading.value = false;
      isGlobalStakeLoading.value = false;
    }

    window.addEventListener('refreshStakeData', handleRefreshStakeData);
    registerCleanup(() => window.removeEventListener('refreshStakeData', handleRefreshStakeData));

    registerCleanup(() => detachWalletListeners());
    registerCleanup(() => stopRewardsRefreshLoop());
  });

  onUnmounted(() => {
    cleanupFns.splice(0).forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    detachWalletListeners();
    window.removeEventListener('refreshStakeData', handleRefreshStakeData);
  });
</script>

<style scoped>
.stake-layout {
  width: 100%;
}

.equal-height {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.text-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stake-card {
  min-height: 100%;
  justify-content: flex-start;
  gap: 24px;
}

.stake-section {
  display: grid;
  gap: 16px;
  text-align: left;
  position: relative;
}

.stake-section + .stake-section {
  margin-top: 16px;
  padding-top: 24px;
}

.stake-section:last-of-type {
  padding-bottom: 0;
  margin-bottom: 0;
}

.stake-section + .stake-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in srgb, var(--brand-fg-100) 12%, transparent);
  pointer-events: none;
}

.stake-section__title {
  margin: 0;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--brand-fg-300);
}

.stake-section__metrics {
  gap: clamp(8px, 1vw, 14px);
}

.stake-section__metrics--personal {
  margin-top: clamp(10px, 1.4vw, 16px);
}

.stake-section__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.stake-section__actions--inline {
  margin: 16px 0;
}

.stake-alert {
  margin: 18px auto;
  max-width: 540px;
}

.stake-section__actions--secondary {
  justify-content: center;
  margin-bottom: 0;
}

.stake-section:last-of-type .stake-section__actions--secondary {
  margin-bottom: 0;
}

.stake-section__empty {
  margin: 0;
  color: var(--brand-fg-300);
  line-height: 1.5;
}

.stake-primary-button {
  flex: 1 1 220px;
  min-width: 0;
}

.stake-card__button {
  width: auto;
  flex: 1 1 0;
  min-width: 140px;
  margin: 0;
  padding: 0 20px;
  border-radius: var(--brand-button-radius, 14px);
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric) 28%, transparent);
  background: color-mix(in srgb, var(--brand-bg-900) 85%, transparent);
  color: var(--brand-fg-100);
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stake-card__button + .stake-card__button {
  margin-top: 0;
}

.stake-card__button--full {
  width: 100%;
  flex: none;
}

.stake-primary-button.primary-button + .stake-card__button {
  margin-top: 0;
}

.stake-card__button:not(.primary-button):hover,
.stake-card__button:not(.primary-button):focus {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--brand-bg-900) 70%, var(--brand-accent-electric) 30%);
  border-color: color-mix(in srgb, var(--brand-accent-electric) 40%, transparent);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--brand-accent-electric) 25%, transparent);
}

.stake-card__button--primary {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(135deg, #4f6cf0 0%, #243a80 100%);
  color: var(--brand-primary-cta-text, #ffffff);
  box-shadow: 0 16px 32px rgba(32, 46, 104, 0.35);
}

.stake-card__button--primary:not(.primary-button):hover,
.stake-card__button--primary:not(.primary-button):focus {
  box-shadow: 0 18px 36px rgba(28, 42, 96, 0.4);
}

.stake-card__button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-accent-electric) 60%, transparent);
  outline-offset: 3px;
}

@media (max-width: 600px) {
  .stake-section__metrics {
    gap: 12px;
    margin-top: 4px;
  }

}

@media (max-width: 640px) {
  .stake-primary-button {
    width: 100%;
    flex: 0 0 auto;
    flex-basis: auto;
    box-sizing: border-box;
  }
}

@media (max-width: 768px) {
  .stake-section__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .stake-section__actions--secondary {
    flex-direction: column;
  }

  .stake-section__actions .stake-card__button {
    width: 100%;
    flex: none;
  }
}

</style>
