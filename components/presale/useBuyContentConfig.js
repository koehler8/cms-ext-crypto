import { computed } from 'vue';
import {
  sanitizeText,
  replaceAssetTokens,
  formatFromConfig,
  sanitizeBenefitText,
  sanitizeIcon,
  sanitizeUrl,
} from './buyTextHelpers.js';

// ─── DEFAULT constants ──────────────────────────────────────────────

const DEFAULT_CONNECT_HEADLINE = 'Connect your wallet to get started';
const DEFAULT_CONNECT_PROMPT =
  'MetaMask, WalletConnect, and Coinbase Wallet are supported. Connect to unlock the presale.';
const DEFAULT_CONNECT_BUTTON_LABEL = 'Buy With Crypto';
const DEFAULT_HOW_IT_WORKS_BUTTON = 'How it works';
const DEFAULT_HOW_IT_WORKS_TITLE = 'How it works';
const DEFAULT_NEED_ETH_LABEL = 'Need ETH?';
const DEFAULT_CHOOSE_AMOUNT_TITLE = 'Choose your amount';
const DEFAULT_CONFIRM_PURCHASE_TITLE = 'Confirm your purchase';
const DEFAULT_WALLET_CONNECTED_LABEL = 'Wallet connected';
const DEFAULT_WRONG_NETWORK_LABEL = 'Wrong network';
const DEFAULT_SWITCHING_LABEL = 'Switching…';
const DEFAULT_SWITCH_BUTTON_LABEL = 'Switch to Ethereum Mainnet';
const DEFAULT_NETWORK_ALERT_TITLE = 'Network mismatch';
const DEFAULT_NETWORK_ALERT_MESSAGE =
  "You're connected to {network}. Switch to Ethereum Mainnet to keep the presale firing.";
const DEFAULT_NETWORK_ALERT_CTA = 'Switch network';
const DEFAULT_CHOOSE_AMOUNT_SUBTITLE = 'Enter {asset} to see live {token} equivalents.';
const DEFAULT_AMOUNT_LABEL = 'Amount';
const DEFAULT_FILL_MAX_LABEL = 'Fill with maximum available {asset}';
const DEFAULT_MAX_BUTTON_LABEL = 'MAX';
const DEFAULT_ESTIMATE_NOTICE = 'You’ll receive approximately {amount} {token}*';
const DEFAULT_SUMMARY_LABEL = 'Summary';
const DEFAULT_STATUS_LABEL = 'Status';
const DEFAULT_PAUSED_MESSAGE = 'The presale is paused right now. Check back soon for the next round.';
const DEFAULT_CONFIRM_PURCHASE_SUBTITLE =
  'Choose your path. We’ll show progress and a success receipt with links to Etherscan.';
const DEFAULT_PENDING_TITLE = 'Lighting the fuse…';
const DEFAULT_PENDING_OVERLAY_TITLE = 'Transaction pending…';
const DEFAULT_PENDING_LINK_LABEL = 'View on Etherscan';
const DEFAULT_PENDING_BUY_LABEL = 'Purchasing…';
const DEFAULT_PENDING_BUY_STAKE_LABEL = 'Buying & Staking…';
const DEFAULT_PENDING_MESSAGES = {
  short: 'Awaiting confirmation on Ethereum (~15 seconds).',
  medium: 'Still pending… Ethereum is a bit busy. Hang tight.',
  long: 'Still pending… the network is busy, but your transaction is queued.',
};
const DEFAULT_SUCCESS_TITLE = 'Presale purchase confirmed';
const DEFAULT_SUCCESS_DESCRIPTION = 'You secured {tokens} {tokenSymbol} ({amount}).';
const DEFAULT_SUCCESS_LINK_LABEL = 'View transaction on Etherscan';
const DEFAULT_ERROR_TITLE = 'We couldn’t complete that';
const DEFAULT_ERROR_BUTTON_LABEL = 'Try again';
const DEFAULT_SUCCESS_EYEBROW = 'Presale success';
const DEFAULT_SUCCESS_HEADLINE = 'Boom! You secured {tokens} {tokenSymbol}';
const DEFAULT_SUCCESS_BODY_DEFAULT =
  'Ready to turn that haul into slow-burn rewards? Stake it and let the glow build.';
const DEFAULT_SUCCESS_BODY_STAKE = 'Your {tokenSymbol} is already staking and earning APY heat.';
const DEFAULT_SUCCESS_TRANSACTION_LABEL = 'Transaction';
const DEFAULT_SUCCESS_ETH_SPENT_LABEL = 'Amount Spent';
const DEFAULT_SUCCESS_STAKE_CTA = 'Stake my {tokenSymbol}';
const DEFAULT_SUCCESS_COMMUNITY_FALLBACK = 'Join the Telegram afterparty';
const DEFAULT_SUCCESS_FOOTER = 'Welcome aboard — the fuse is officially lit.';
const DEFAULT_DISMISS_ALERT_LABEL = 'Dismiss message';
const DEFAULT_HIDE_INSTRUCTIONS_LABEL = 'Hide instructions';
const DEFAULT_CLOSE_NEED_ETH_LABEL = 'Close';
const DEFAULT_SUCCESS_DISMISS_LABEL = 'Dismiss success message';
const DEFAULT_STATUS_PRESALE_COMPLETE = 'Presale is Complete';
const DEFAULT_STATUS_CLAIM_LIVE = 'Unstaked Claim is Live';
const DEFAULT_STATUS_STAKED_CLAIM = 'Token Claim is Live';
const DEFAULT_STATUS_COUNTDOWN_LOADING = 'Countdown is loading';
const DEFAULT_STATUS_PRICE_LOADING = 'Token price is loading';
const DEFAULT_STATUS_EMPTY_METRICS = 'Presale metrics will appear once activity starts.';
const DEFAULT_STAKE_ARIA_LABEL = 'Stake purchased tokens';
const DEFAULT_CLAIM_LABEL = 'Claim {token}';
const DEFAULT_CLAIM_ALL_LABEL = 'Claim All {token}';
const DEFAULT_EMAIL_SUBMITTING_LABEL = 'Submitting…';
const DEFAULT_STAKE_AFTER_LABEL = 'Stake after purchase';

// ─── Composable ─────────────────────────────────────────────────────

export function useBuyContentConfig(options) {
  const {
    presaleConfig,
    pageContent,
    siteData,
    tokenSymbol,
    selectedPaymentAsset,
    displayChainName,
    isWalletConnected,
    shortWalletAddress,
    networkMismatch,
    transactionState,
    transactionDetails,
    successTokensDisplay,
    successSpendDisplay,
    successAssetDisplay,
    successIsStakeCombo,
    pendingInteraction,
    pendingElapsedSeconds,
    normalizedToken,
  } = options;

  // ─── Config sub-object computeds ────────────────────────────────

  const helperSurfacesConfig = computed(() => presaleConfig.value.helperSurfaces || {});
  const howItWorksEnabled = computed(
    () => helperSurfacesConfig.value?.howItWorks?.enabled === true
  );
  const needEthEnabled = computed(
    () => helperSurfacesConfig.value?.needEth?.enabled === true
  );
  const sparkbangCtaEnabled = computed(
    () => helperSurfacesConfig.value?.sparkbangCta?.enabled === true
  );
  const howItWorksConfig = computed(() => presaleConfig.value.howItWorks || {});
  const walletStatusConfig = computed(() => presaleConfig.value.walletStatus || {});
  const networkAlertConfig = computed(() => presaleConfig.value.networkAlert || {});
  const formCopyConfig = computed(() => presaleConfig.value.formCopy || {});
  const sectionLabelsConfig = computed(() => presaleConfig.value.sectionLabels || {});
  const transactionStatusConfig = computed(() => presaleConfig.value.transactionStatus || {});
  const successCelebrationConfig = computed(() => presaleConfig.value.successCelebration || {});
  const accessibilityConfig = computed(() => presaleConfig.value.accessibility || {});

  // ─── Wallet status labels ──────────────────────────────────────

  const walletConnectedLabel = computed(
    () => sanitizeText(walletStatusConfig.value.connected) || DEFAULT_WALLET_CONNECTED_LABEL
  );
  const wrongNetworkLabel = computed(
    () => sanitizeText(walletStatusConfig.value.wrongNetwork) || DEFAULT_WRONG_NETWORK_LABEL
  );
  const switchingNetworkLabel = computed(
    () => sanitizeText(walletStatusConfig.value.switching) || DEFAULT_SWITCHING_LABEL
  );
  const networkSwitchButtonLabel = computed(
    () => sanitizeText(walletStatusConfig.value.switchButton) || DEFAULT_SWITCH_BUTTON_LABEL
  );

  // ─── Network alert labels ─────────────────────────────────────

  const networkAlertTitle = computed(
    () => sanitizeText(networkAlertConfig.value.title) || DEFAULT_NETWORK_ALERT_TITLE
  );
  const networkAlertMessage = computed(() => {
    const replacements = { network: displayChainName.value };
    return formatFromConfig(networkAlertConfig.value.message, replacements) ||
      formatFromConfig(DEFAULT_NETWORK_ALERT_MESSAGE, replacements);
  });
  const networkAlertCta = computed(
    () => sanitizeText(networkAlertConfig.value.ctaLabel) || DEFAULT_NETWORK_ALERT_CTA
  );

  // ─── Form copy labels ─────────────────────────────────────────

  const chooseAmountSubtitle = computed(() => {
    const asset = selectedPaymentAsset.value;
    const symbol = asset?.symbol || 'ETH';
    const replacements = { token: tokenSymbol.value, asset: symbol };
    const base =
      formatFromConfig(formCopyConfig.value.chooseAmountSubtitle, replacements) ||
      formatFromConfig(DEFAULT_CHOOSE_AMOUNT_SUBTITLE, replacements);
    return replaceAssetTokens(base, symbol);
  });
  const amountLabel = computed(() => {
    const asset = selectedPaymentAsset.value;
    const symbol = asset?.symbol || 'ETH';
    return replaceAssetTokens(
      sanitizeText(formCopyConfig.value.amountLabel) || DEFAULT_AMOUNT_LABEL,
      symbol
    );
  });
  const fillMaxLabel = computed(() => {
    const asset = selectedPaymentAsset.value;
    const symbol = asset?.symbol || 'ETH';
    return replaceAssetTokens(
      sanitizeText(formCopyConfig.value.fillMaxLabel) || DEFAULT_FILL_MAX_LABEL,
      symbol
    );
  });
  const maxButtonLabel = computed(
    () => sanitizeText(formCopyConfig.value.maxButtonLabel) || DEFAULT_MAX_BUTTON_LABEL
  );

  // ─── Section labels ────────────────────────────────────────────

  const summaryLabel = computed(
    () => sanitizeText(sectionLabelsConfig.value.summary) || DEFAULT_SUMMARY_LABEL
  );
  const statusLabel = computed(
    () => sanitizeText(sectionLabelsConfig.value.status) || DEFAULT_STATUS_LABEL
  );
  const pausedCopy = computed(
    () => sanitizeText(presaleConfig.value.pausedMessage) || DEFAULT_PAUSED_MESSAGE
  );
  const confirmPurchaseSubtitle = computed(() => {
    const replacements = { token: tokenSymbol.value };
    return formatFromConfig(presaleConfig.value.confirmPurchaseSubtitle, replacements) ||
      formatFromConfig(DEFAULT_CONFIRM_PURCHASE_SUBTITLE, replacements);
  });

  // ─── Accessibility labels ─────────────────────────────────────

  const dismissAlertLabel = computed(
    () => sanitizeText(accessibilityConfig.value.dismissAlert) || DEFAULT_DISMISS_ALERT_LABEL
  );
  const hideInstructionsLabel = computed(
    () => sanitizeText(accessibilityConfig.value.hideInstructions) || DEFAULT_HIDE_INSTRUCTIONS_LABEL
  );
  const closeNeedEthLabel = computed(
    () => sanitizeText(accessibilityConfig.value.closeNeedEth) || DEFAULT_CLOSE_NEED_ETH_LABEL
  );
  const successDismissLabel = computed(
    () => sanitizeText(successCelebrationConfig.value.dismissLabel) || DEFAULT_SUCCESS_DISMISS_LABEL
  );

  // ─── Transaction status labels ────────────────────────────────

  const pendingTitle = computed(
    () => sanitizeText(transactionStatusConfig.value.pendingTitle) || DEFAULT_PENDING_TITLE
  );
  const pendingOverlayTitle = computed(
    () =>
      sanitizeText(transactionStatusConfig.value.pendingOverlayTitle) || DEFAULT_PENDING_OVERLAY_TITLE
  );
  const pendingLinkLabel = computed(
    () => sanitizeText(transactionStatusConfig.value.pendingLinkLabel) || DEFAULT_PENDING_LINK_LABEL
  );
  const pendingBuyLabel = computed(
    () => sanitizeText(transactionStatusConfig.value.pendingBuyLabel) || DEFAULT_PENDING_BUY_LABEL
  );
  const pendingBuyAndStakeLabel = computed(
    () =>
      sanitizeText(transactionStatusConfig.value.pendingBuyAndStakeLabel) ||
      DEFAULT_PENDING_BUY_STAKE_LABEL
  );
  const successTitle = computed(
    () => sanitizeText(transactionStatusConfig.value.successTitle) || DEFAULT_SUCCESS_TITLE
  );
  const successLinkLabel = computed(
    () => sanitizeText(transactionStatusConfig.value.successLinkLabel) || DEFAULT_SUCCESS_LINK_LABEL
  );
  const errorTitle = computed(
    () => sanitizeText(transactionStatusConfig.value.errorTitle) || DEFAULT_ERROR_TITLE
  );
  const errorButtonLabel = computed(
    () => sanitizeText(transactionStatusConfig.value.errorButtonLabel) || DEFAULT_ERROR_BUTTON_LABEL
  );

  // ─── Connect / presale top-level labels ───────────────────────

  const connectButtonLabel = computed(
    () => sanitizeText(presaleConfig.value.connectButtonLabel) || DEFAULT_CONNECT_BUTTON_LABEL
  );
  const howItWorksButtonLabel = computed(
    () => sanitizeText(howItWorksConfig.value.buttonLabel) || DEFAULT_HOW_IT_WORKS_BUTTON
  );
  const howItWorksTitle = computed(
    () => sanitizeText(howItWorksConfig.value.title) || DEFAULT_HOW_IT_WORKS_TITLE
  );
  const needEthButtonLabel = computed(() => {
    const explicit = sanitizeText(presaleConfig.value.needEthButtonLabel);
    if (explicit) return explicit;
    const needEthConfig = presaleConfig.value.needEth || {};
    return sanitizeText(needEthConfig.shortLabel || needEthConfig.title) || DEFAULT_NEED_ETH_LABEL;
  });
  const chooseAmountTitle = computed(
    () => sanitizeText(presaleConfig.value.chooseAmountTitle) || DEFAULT_CHOOSE_AMOUNT_TITLE
  );
  const confirmPurchaseTitle = computed(
    () => sanitizeText(presaleConfig.value.confirmPurchaseTitle) || DEFAULT_CONFIRM_PURCHASE_TITLE
  );

  // ─── How it works steps ────────────────────────────────────────

  const howItWorksStepsDefaults = computed(() => {
    const steps = Array.isArray(howItWorksConfig.value.steps) ? howItWorksConfig.value.steps : [];
    return [
      sanitizeText(steps[0]) || DEFAULT_CONNECT_PROMPT,
      sanitizeText(steps[1]) || 'Enter the ETH you want to spend to see live token and USD estimates.',
      sanitizeText(steps[2]) || 'Review the totals, confirm in your wallet, and lock today’s presale price.',
    ];
  });

  const howItWorksStepTitles = computed(() => {
    const titles = Array.isArray(howItWorksConfig.value.stepTitles)
      ? howItWorksConfig.value.stepTitles
      : [];
    return [
      sanitizeText(titles[0]) || 'Connect wallet',
      sanitizeText(titles[1]) || 'Enter amount',
      sanitizeText(titles[2]) || 'Confirm purchase',
    ];
  });

  const howItWorksStepOne = computed(() => {
    if (isWalletConnected.value) {
      return `Connected to ${shortWalletAddress.value}`;
    }
    return howItWorksStepsDefaults.value[0];
  });
  const howItWorksStepTwo = computed(() => {
    if (networkMismatch.value) {
      return sanitizeText(howItWorksConfig.value.switchNetworkPrompt) ||
        'Switch to Ethereum Mainnet, then continue.';
    }
    return howItWorksStepsDefaults.value[1];
  });
  const howItWorksStepThree = computed(() => {
    if (transactionState.value === 'pending') {
      return sanitizeText(howItWorksConfig.value.pendingPrompt) ||
        'Approve the transaction in your wallet and watch for the confirmation banner.';
    }
    if (transactionState.value === 'success') {
      return sanitizeText(howItWorksConfig.value.successPrompt) ||
        'Purchase confirmed—your receipt is on Etherscan and staking is available.';
    }
    return howItWorksStepsDefaults.value[2];
  });

  // ─── Benefits ─────────────────────────────────────────────────

  const benefitsConfig = computed(() => pageContent.value?.presaleBenefits || {});
  const benefitsEyebrow = computed(() =>
    sanitizeText(benefitsConfig.value?.eyebrow || benefitsConfig.value?.badge || '')
  );
  const benefitsTitleFallback = computed(() => {
    const symbol = tokenSymbol.value;
    return symbol ? `${symbol} Makes the Fun Real` : 'Why holders lock in now';
  });
  const benefitsTitle = computed(() => {
    const override = sanitizeText(benefitsConfig.value?.title);
    return override || benefitsTitleFallback.value;
  });
  const benefitsSectionId = computed(() => `${normalizedToken}-presale-benefits`);
  const howItWorksId = computed(() => `${normalizedToken}-how-it-works`);
  const benefitItems = computed(() => {
    const items = Array.isArray(benefitsConfig.value?.items) ? benefitsConfig.value.items : [];
    return items
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const icon = sanitizeIcon(item.icon);
        const text = sanitizeBenefitText(item.text);
        if (!text) return null;
        return {
          id: item.id || `benefit-${index}`,
          icon,
          text,
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  });
  const benefitsCta = computed(() => {
    const href = sanitizeUrl(benefitsConfig.value?.cta?.href || benefitsConfig.value?.ctaHref);
    const text = sanitizeText(benefitsConfig.value?.cta?.text || benefitsConfig.value?.ctaText || '');
    if (!href || !text) return { href: '', text: '' };
    return { href, text };
  });

  // ─── Success celebration computeds ────────────────────────────

  const successDescription = computed(() => {
    const replacements = {
      tokens: transactionDetails.value?.tokens || successTokensDisplay.value,
      tokenSymbol: tokenSymbol.value,
      amount: successSpendDisplay.value,
      asset: successAssetDisplay.value,
    };
    return formatFromConfig(transactionStatusConfig.value.successDescription, replacements) ||
      formatFromConfig(DEFAULT_SUCCESS_DESCRIPTION, replacements);
  });
  const successEyebrow = computed(
    () => sanitizeText(successCelebrationConfig.value.eyebrow) || DEFAULT_SUCCESS_EYEBROW
  );
  const successHeadline = computed(() => {
    const replacements = { tokens: successTokensDisplay.value, tokenSymbol: tokenSymbol.value };
    return formatFromConfig(successCelebrationConfig.value.headline, replacements) ||
      formatFromConfig(DEFAULT_SUCCESS_HEADLINE, replacements);
  });
  const successBodyDefault = computed(() => {
    const replacements = { tokenSymbol: tokenSymbol.value };
    return formatFromConfig(successCelebrationConfig.value.bodyDefault, replacements) ||
      formatFromConfig(DEFAULT_SUCCESS_BODY_DEFAULT, replacements);
  });
  const successBodyStake = computed(() => {
    const replacements = { tokenSymbol: tokenSymbol.value };
    return formatFromConfig(successCelebrationConfig.value.bodyStakeCombo, replacements) ||
      formatFromConfig(DEFAULT_SUCCESS_BODY_STAKE, replacements);
  });
  const successBodyText = computed(() =>
    successIsStakeCombo.value ? successBodyStake.value : successBodyDefault.value
  );
  const successTransactionLabel = computed(
    () =>
      sanitizeText(successCelebrationConfig.value.transactionLabel) ||
      DEFAULT_SUCCESS_TRANSACTION_LABEL
  );
  const successEthSpentLabel = computed(() =>
    replaceAssetTokens(
      sanitizeText(successCelebrationConfig.value.ethSpentLabel) || DEFAULT_SUCCESS_ETH_SPENT_LABEL,
      successAssetDisplay.value
    )
  );
  const successStakeCta = computed(() => {
    const replacements = { tokenSymbol: tokenSymbol.value };
    return formatFromConfig(successCelebrationConfig.value.stakeCta, replacements) ||
      formatFromConfig(DEFAULT_SUCCESS_STAKE_CTA, replacements);
  });
  const successCommunityFallback = computed(
    () =>
      sanitizeText(successCelebrationConfig.value.communityFallback) ||
      DEFAULT_SUCCESS_COMMUNITY_FALLBACK
  );
  const successFooter = computed(
    () => sanitizeText(successCelebrationConfig.value.footer) || DEFAULT_SUCCESS_FOOTER
  );

  // ─── Pending status ───────────────────────────────────────────

  const pendingButtonLabel = computed(() =>
    pendingInteraction.value === 'buy_and_stake'
      ? pendingBuyAndStakeLabel.value
      : pendingBuyLabel.value
  );

  const pendingMessages = computed(() => {
    const pendingConfig = transactionStatusConfig.value.pendingMessages || {};
    return {
      short: sanitizeText(pendingConfig.short) || DEFAULT_PENDING_MESSAGES.short,
      medium: sanitizeText(pendingConfig.medium) || DEFAULT_PENDING_MESSAGES.medium,
      long: sanitizeText(pendingConfig.long) || DEFAULT_PENDING_MESSAGES.long,
    };
  });

  const pendingStatusText = computed(() => {
    const seconds = pendingElapsedSeconds.value;
    if (seconds >= 180) {
      return pendingMessages.value.long;
    }
    if (seconds >= 60) {
      return pendingMessages.value.medium;
    }
    return pendingMessages.value.short;
  });

  // ─── Community / telegram ─────────────────────────────────────

  const communityLinks = computed(() => {
    const root = pageContent.value || {};
    if (Array.isArray(root.community?.links)) return root.community.links;
    if (Array.isArray(root.presale?.community?.links)) return root.presale.community.links;
    if (Array.isArray(siteData.value?.site?.community?.links)) return siteData.value.site.community.links;
    return [];
  });

  const telegramLink = computed(() => {
    const links = communityLinks.value;
    if (!Array.isArray(links)) return null;
    return (
      links.find((entry) =>
        typeof entry === 'object' && entry && typeof entry.id === 'string'
          ? entry.id.toLowerCase().includes('telegram')
          : false
      ) || null
    );
  });

  // ─── Asset picker title ───────────────────────────────────────

  const assetPickerTitle = computed(() => {
    const asset = selectedPaymentAsset.value;
    const symbol = asset?.symbol || 'ETH';
    const base = sanitizeText(formCopyConfig.value.assetSelectLabel) || 'Select currency';
    return replaceAssetTokens(base, symbol);
  });

  return {
    // DEFAULT constants
    DEFAULT_CONNECT_HEADLINE,
    DEFAULT_CONNECT_PROMPT,
    DEFAULT_CONNECT_BUTTON_LABEL,
    DEFAULT_HOW_IT_WORKS_BUTTON,
    DEFAULT_HOW_IT_WORKS_TITLE,
    DEFAULT_NEED_ETH_LABEL,
    DEFAULT_CHOOSE_AMOUNT_TITLE,
    DEFAULT_CONFIRM_PURCHASE_TITLE,
    DEFAULT_WALLET_CONNECTED_LABEL,
    DEFAULT_WRONG_NETWORK_LABEL,
    DEFAULT_SWITCHING_LABEL,
    DEFAULT_SWITCH_BUTTON_LABEL,
    DEFAULT_NETWORK_ALERT_TITLE,
    DEFAULT_NETWORK_ALERT_MESSAGE,
    DEFAULT_NETWORK_ALERT_CTA,
    DEFAULT_CHOOSE_AMOUNT_SUBTITLE,
    DEFAULT_AMOUNT_LABEL,
    DEFAULT_FILL_MAX_LABEL,
    DEFAULT_MAX_BUTTON_LABEL,
    DEFAULT_ESTIMATE_NOTICE,
    DEFAULT_SUMMARY_LABEL,
    DEFAULT_STATUS_LABEL,
    DEFAULT_PAUSED_MESSAGE,
    DEFAULT_CONFIRM_PURCHASE_SUBTITLE,
    DEFAULT_PENDING_TITLE,
    DEFAULT_PENDING_OVERLAY_TITLE,
    DEFAULT_PENDING_LINK_LABEL,
    DEFAULT_PENDING_BUY_LABEL,
    DEFAULT_PENDING_BUY_STAKE_LABEL,
    DEFAULT_PENDING_MESSAGES,
    DEFAULT_SUCCESS_TITLE,
    DEFAULT_SUCCESS_DESCRIPTION,
    DEFAULT_SUCCESS_LINK_LABEL,
    DEFAULT_ERROR_TITLE,
    DEFAULT_ERROR_BUTTON_LABEL,
    DEFAULT_SUCCESS_EYEBROW,
    DEFAULT_SUCCESS_HEADLINE,
    DEFAULT_SUCCESS_BODY_DEFAULT,
    DEFAULT_SUCCESS_BODY_STAKE,
    DEFAULT_SUCCESS_TRANSACTION_LABEL,
    DEFAULT_SUCCESS_ETH_SPENT_LABEL,
    DEFAULT_SUCCESS_STAKE_CTA,
    DEFAULT_SUCCESS_COMMUNITY_FALLBACK,
    DEFAULT_SUCCESS_FOOTER,
    DEFAULT_DISMISS_ALERT_LABEL,
    DEFAULT_HIDE_INSTRUCTIONS_LABEL,
    DEFAULT_CLOSE_NEED_ETH_LABEL,
    DEFAULT_SUCCESS_DISMISS_LABEL,
    DEFAULT_STATUS_PRESALE_COMPLETE,
    DEFAULT_STATUS_CLAIM_LIVE,
    DEFAULT_STATUS_STAKED_CLAIM,
    DEFAULT_STATUS_COUNTDOWN_LOADING,
    DEFAULT_STATUS_PRICE_LOADING,
    DEFAULT_STATUS_EMPTY_METRICS,
    DEFAULT_STAKE_ARIA_LABEL,
    DEFAULT_CLAIM_LABEL,
    DEFAULT_CLAIM_ALL_LABEL,
    DEFAULT_EMAIL_SUBMITTING_LABEL,
    DEFAULT_STAKE_AFTER_LABEL,

    // Config sub-object computeds
    helperSurfacesConfig,
    howItWorksEnabled,
    needEthEnabled,
    sparkbangCtaEnabled,
    howItWorksConfig,
    walletStatusConfig,
    networkAlertConfig,
    formCopyConfig,
    sectionLabelsConfig,
    transactionStatusConfig,
    successCelebrationConfig,
    accessibilityConfig,

    // Wallet status labels
    walletConnectedLabel,
    wrongNetworkLabel,
    switchingNetworkLabel,
    networkSwitchButtonLabel,

    // Network alert labels
    networkAlertTitle,
    networkAlertMessage,
    networkAlertCta,

    // Form copy labels
    chooseAmountSubtitle,
    amountLabel,
    fillMaxLabel,
    maxButtonLabel,
    assetPickerTitle,

    // Section labels
    summaryLabel,
    statusLabel,
    pausedCopy,
    confirmPurchaseSubtitle,

    // Accessibility labels
    dismissAlertLabel,
    hideInstructionsLabel,
    closeNeedEthLabel,
    successDismissLabel,

    // Transaction status labels
    pendingTitle,
    pendingOverlayTitle,
    pendingLinkLabel,
    pendingBuyLabel,
    pendingBuyAndStakeLabel,
    successTitle,
    successLinkLabel,
    errorTitle,
    errorButtonLabel,

    // Connect / presale top-level labels
    connectButtonLabel,
    howItWorksButtonLabel,
    howItWorksTitle,
    needEthButtonLabel,
    chooseAmountTitle,
    confirmPurchaseTitle,

    // How it works steps
    howItWorksStepsDefaults,
    howItWorksStepTitles,
    howItWorksStepOne,
    howItWorksStepTwo,
    howItWorksStepThree,

    // Benefits
    benefitsConfig,
    benefitsEyebrow,
    benefitsTitleFallback,
    benefitsTitle,
    benefitsSectionId,
    howItWorksId,
    benefitItems,
    benefitsCta,

    // Success celebration
    successDescription,
    successEyebrow,
    successHeadline,
    successBodyDefault,
    successBodyStake,
    successBodyText,
    successTransactionLabel,
    successEthSpentLabel,
    successStakeCta,
    successCommunityFallback,
    successFooter,

    // Pending status
    pendingButtonLabel,
    pendingMessages,
    pendingStatusText,

    // Community
    communityLinks,
    telegramLink,
  };
}
