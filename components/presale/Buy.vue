<template>
  <div id="centerPresale" class="buy-layout" ref="buyLayoutRef">
    <FirstTimeOnboarding
      :visible="onboardingVisible"
      :eyebrow="onboardingContent.eyebrow"
      :title="onboardingContent.title"
      :description="onboardingContent.description"
      :steps="onboardingStepsForDisplay"
      :enable-connect="!isWalletConnected"
      :cta-label="onboardingContent.ctaLabel"
      :connect-label="onboardingContent.connectLabel"
      :dismiss-aria-label="onboardingContent.dismissAriaLabel"
      @dismiss="handleOnboardingDismissEvent"
    />
    <div
      class="widget-card brand-card ui-card"
      :class="{ 'widget-card--pending': isTransactionPending }"
      :aria-busy="isTransactionPending"
    >
      <section
        class="connect-block"
        :class="{ 'connect-block--connected': isWalletConnected }"
        aria-live="polite"
      >
        <template v-if="!isWalletConnected">
          <div
            class="connect-banner"
            :class="{ 'connect-banner--glow': !isWalletConnected }"
            role="region"
            aria-label="Wallet connection required"
          >
            <div class="connect-banner__copy">
              <div class="connect-banner__lead">
                <span class="connect-banner__icon" aria-hidden="true">
                  <svg viewBox="0 0 32 32" focusable="false">
                    <rect
                      x="4.5"
                      y="9"
                      width="23"
                      height="14"
                      rx="3.5"
                      ry="3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M26.5 14.5h-5.25a2.5 2.5 0 0 0 0 5h5.25"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle cx="23.25" cy="17" r="1.5" fill="currentColor" />
                  </svg>
                </span>
                <p class="connect-banner__headline">{{ connectHeadline }}</p>
              </div>
              <p class="connect-banner__prompt ui-label-sm">{{ connectPrompt }}</p>
            </div>
            <button
              type="button"
              class="primary-button connect-banner__button"
              @click="connectWallet()"
            >
              <span class="connect-banner__button-icon" aria-hidden="true">
                <svg viewBox="0 0 18 18" focusable="false">
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
              </span>
              <span class="connect-banner__button-label">{{ connectButtonLabel }}</span>
            </button>
            <ul
              v-if="hasQuickConnectors"
              class="connect-banner__chips"
              aria-label="Quick connect options"
            >
              <li v-for="option in quickConnectorOptions" :key="option.id" class="connect-banner__chip">
                <button
                  type="button"
                  class="connect-banner__chip-button"
                  @click="connectWallet(option.id)"
                  :aria-label="`Connect with ${option.label}`"
                >
                  {{ option.label }}
                </button>
              </li>
            </ul>
          </div>
          <p v-if="connectionError" class="connect-block__error">{{ connectionError }}</p>
        </template>
        <template v-else>
          <div
            class="connect-badge"
            :class="{ 'connect-badge--alert': networkMismatch }"
          >
            <div class="connect-badge__line">
              <span class="connect-badge__status ui-label-sm">
                <span class="connect-badge__status-icon" aria-hidden="true">
                  <svg v-if="networkMismatch" viewBox="0 0 20 20" focusable="false">
                    <path
                      d="M10 3.5 17 17H3l7-13.5Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M10 8.25V12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                    />
                    <circle cx="10" cy="14.5" r="0.75" fill="currentColor" />
                  </svg>
                  <svg v-else viewBox="0 0 20 20" focusable="false">
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
                {{ networkMismatch ? wrongNetworkLabel : walletConnectedLabel }}
              </span>
              <span class="connect-badge__value ui-value-lg">{{ shortWalletAddress }}</span>
            </div>
            <div class="connect-badge__line">
              <span class="connect-badge__network ui-label-sm">{{ displayChainName }}</span>
              <button
                v-if="networkMismatch"
                class="link-button connect-badge__action"
                type="button"
                @click="switchToMainnet"
                :disabled="switchingNetwork"
              >
                {{ switchingNetwork ? switchingNetworkLabel : networkSwitchButtonLabel }}
              </button>
            </div>
          </div>
        </template>
      </section>

      <div v-if="howItWorksEnabled && !showHowItWorksCard" class="helper-strip">
        <button
          type="button"
          class="helper-strip__button"
          @click="restoreHowItWorks"
          :aria-controls="howItWorksId"
          :aria-expanded="showHowItWorksCard"
        >
          {{ howItWorksButtonLabel }}
        </button>
        <button
          type="button"
          class="helper-strip__link"
          @click="openNeedEthModal"
          aria-haspopup="dialog"
        >
          {{ needEthButtonLabel }}
        </button>
      </div>

      <transition v-if="howItWorksEnabled" name="fade">
        <div
          v-if="showHowItWorksCard"
          class="how-it-works"
          :id="howItWorksId"
        >
          <div class="how-it-works__header">
            <span class="how-it-works__title">{{ howItWorksTitle }}</span>
            <div class="how-it-works__actions">
              <button
                type="button"
                class="how-it-works__action"
                @click="openNeedEthModal"
                aria-haspopup="dialog"
              >
                {{ needEthButtonLabel }}
              </button>
              <button
                type="button"
                class="how-it-works__dismiss"
                :aria-label="hideInstructionsLabel"
                @click="dismissHowItWorks(true)"
                :aria-controls="howItWorksId"
              >
                ✕
              </button>
            </div>
          </div>
          <ol class="how-it-works__steps">
            <li class="how-it-works__step">
              <span class="how-it-works__badge">1</span>
              <div>
                <p class="how-it-works__step-title">{{ howItWorksStepTitles[0] }}</p>
                <p class="how-it-works__step-text">{{ howItWorksStepOne }}</p>
              </div>
            </li>
            <li class="how-it-works__step">
              <span class="how-it-works__badge">2</span>
              <div>
                <p class="how-it-works__step-title">{{ howItWorksStepTitles[1] }}</p>
                <p class="how-it-works__step-text">{{ howItWorksStepTwo }}</p>
              </div>
            </li>
            <li class="how-it-works__step">
              <span class="how-it-works__badge">3</span>
              <div>
                <p class="how-it-works__step-title">{{ howItWorksStepTitles[2] }}</p>
                <p class="how-it-works__step-text">{{ howItWorksStepThree }}</p>
              </div>
            </li>
          </ol>
        </div>
      </transition>

      <BonusIncentive
        v-if="bonusDisplay.enabled"
        :badge="bonusDisplay.badge"
        :headline="bonusDisplay.headline"
        :description="bonusDisplay.description"
        :bonus-label="bonusDisplay.bonusLabel"
        :bonus-value="bonusDisplay.bonusValue"
        :total="bonusDisplay.total"
        :remaining="bonusDisplay.remaining"
        :footnote="bonusDisplay.footnote"
        :cta="bonusDisplay.cta"
        :countdown-label="bonusDisplay.countdownLabel"
        :expires-at="bonusDisplay.expiresAt"
        @cta-click="handleBonusCta"
      />

      <transition name="fade">
        <div
          v-if="networkAlertVisible"
          class="network-alert"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div class="network-alert__copy">
            <p class="network-alert__title">{{ networkAlertTitle }}</p>
            <p class="network-alert__message">{{ networkAlertMessage }}</p>
          </div>
          <button
            type="button"
            class="network-alert__button"
            :disabled="switchingNetwork"
            @click="switchToMainnet"
          >
            {{ switchingNetwork ? switchingNetworkLabel : networkAlertCta }}
          </button>
        </div>
      </transition>

      <transition name="fade">
        <div
          v-if="formAlert"
          :class="['form-alert', `form-alert--${formAlert.type}`]"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <button
            v-if="formAlert.dismissible !== false"
            type="button"
            class="form-alert__close"
            :aria-label="dismissAlertLabel"
            @click="clearFormAlert()"
          >
            ✕
          </button>
          <p v-if="formAlert.title" class="form-alert__title">{{ formAlert.title }}</p>
          <p class="form-alert__message">{{ formAlert.message }}</p>
        </div>
      </transition>

      <ol class="stepper">
        <li :class="['step', stepTwoStatus, { 'step--active': isWalletConnected }]">
          <div class="step-header step-header--amount">
            <span class="step-icon step-icon--amount" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="7.5" r="3.5" fill="none" />
                <path d="M6 14.25c0 2.3 2.7 3.75 6 3.75s6-1.45 6-3.75" fill="none" />
                <path d="M6 17.25c0 2.3 2.7 3.75 6 3.75s6-1.45 6-3.75" fill="none" />
              </svg>
            </span>
            <div>
              <h3 class="step-title ui-title-sm">{{ chooseAmountTitle }}</h3>
              <p class="step-subtitle">{{ chooseAmountSubtitle }}</p>
            </div>
          </div>

          <section class="buy-group buy-group--amount">
            <p class="buy-group__label ui-label-sm sr-only" aria-hidden="true">
              {{ amountLabel }}
            </p>
            <div class="amount-section">
              <div class="amount-field">
                <label class="field-label ui-label-sm" for="ethBalance">{{ spendLabel }}</label>
                <div class="amount-row">
                <div
                  class="field-group amount-input__group"
                  :class="{ 'field-group--disabled': !isWalletConnected || networkMismatch || isTransactionPending }"
                >
                  <input
                    id="ethBalance"
                    class="field-input amount-input__field"
                    :disabled="!isWalletConnected || networkMismatch || isTransactionPending"
                    inputmode="decimal"
                    autocomplete="off"
                    v-model="ethBalance"
                    @focus="activeInput = 'eth'"
                    @blur="activeInput = null"
                    placeholder="0.00"
                  />
                  <button
                    ref="assetPickerButtonRef"
                    class="field-unit field-unit--inline unit-chip-button"
                    type="button"
                    :aria-haspopup="'dialog'"
                    :aria-expanded="isAssetPickerOpen ? 'true' : 'false'"
                  :aria-controls="assetPickerId"
                  :disabled="isTransactionPending"
                  @click="toggleAssetPicker"
                >
                  <UnitChip
                    :label="spendUnitLabel"
                    :icon="selectedPaymentIcon"
                    :icon-alt="`${spendUnitLabel} icon`"
                  />
                    <svg class="unit-chip-button__caret" viewBox="0 0 12 8" aria-hidden="true" focusable="false">
                      <path d="M2 2.5 6 6 10 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button
                    class="field-addon field-addon--max amount-input__max"
                    type="button"
                    :disabled="!isWalletConnected || isTransactionPending"
                    :aria-label="fillMaxLabel"
                    @click="loadEthFromWallet"
                  >
                    {{ maxButtonLabel }}
                  </button>
                </div>
                <transition name="fade">
                  <div
                    v-if="isAssetPickerOpen"
                    :id="assetPickerId"
                    class="asset-picker-popover"
                    ref="assetPickerPopoverRef"
                    role="dialog"
                    aria-modal="false"
                    :aria-label="assetPickerTitle"
                    @click.stop
                  >
                    <p class="asset-picker-popover__title">{{ assetPickerTitle }}</p>
                    <ul class="asset-picker-popover__list">
                      <li
                        v-for="asset in assetPickerOptions"
                        :key="asset.symbol"
                        class="asset-picker-popover__item"
                      >
        <button
          type="button"
          class="asset-picker-popover__button"
          :class="{ 'asset-picker-popover__button--active': asset.symbol === selectedPaymentSymbol }"
          @click="handleAssetSelect(asset.symbol)"
        >
          <span class="asset-picker-popover__icon" v-if="asset.icon">
            <img :src="asset.icon" :alt="`${asset.symbol} logo`" />
          </span>
          <span class="asset-picker-popover__symbol">{{ asset.symbol }}</span>
          <span class="asset-picker-popover__name">{{ asset.name }}</span>
          <span class="asset-picker-popover__balance">
            {{ asset.balanceDisplay }}
          </span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </transition>
                  <div class="balance-inline" aria-live="polite">
                    <div class="balance-inline__content">
                      <span class="balance-inline__label">{{ walletBalanceLabel }}:</span>
                      <span class="balance-inline__value" :title="walletBalanceDisplay">
                        {{ walletBalanceDisplay }}
                        <UnitChip class="balance-inline__unit" :label="spendUnitLabel" />
                      </span>
                    </div>
                  </div>
                </div>
            </div>
            <div class="amount-field">
              <label class="field-label ui-label-sm" :for="tokenEstimateId">{{ youReceiveLabel }}</label>
              <div class="amount-row">
              <div class="field-group amount-output__group">
                <input
                  :id="tokenEstimateId"
                  class="field-input amount-output__field"
                  type="text"
                  :disabled="!isWalletConnected || networkMismatch || isTransactionPending"
                  inputmode="decimal"
                  autocomplete="off"
                  v-model="tokensReceive"
                  @focus="activeInput = 'token'"
                  @blur="activeInput = null"
                  placeholder="0.00"
                />
                <UnitChip class="field-unit field-unit--inline" :label="tokenSymbol" />
              </div>
              </div>
            </div>
          </div>
          <div class="form-notice-slot" aria-live="polite" aria-atomic="true"></div>
          </section>
        </li>

        <li :class="['step', stepThreeStatus, { 'step--active': isWalletConnected }]">
          <div class="step-header step-header--confirm">
            <span class="step-icon step-icon--confirm" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4.5c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5-2.9-6.5-6.5-6.5Z" fill="none" />
                <path d="m9.75 11.75 1.95 1.95 3.55-4.7" fill="none" />
              </svg>
            </span>
            <div>
              <h3 class="step-title">{{ confirmPurchaseTitle }}</h3>
              <p class="step-subtitle">{{ confirmPurchaseSubtitle }}</p>
            </div>
            </div>

          <section class="buy-group">
            <div class="purchase-summary">
            <div class="purchase-actions">
                <div class="purchase-preview">
                  <p class="purchase-preview-label ui-label-sm">{{ youReceiveLabel }}</p>
                  <p class="purchase-preview-value ui-value-lg">
                    {{ liveTokenEstimate }}
                    <UnitChip class="purchase-preview__unit" :label="tokenSymbol" />
                  </p>
                </div>
                <div class="purchase-buttons">
                  <button
                    id="buyToken"
                    class="primary-button purchase-primary"
                    type="button"
                    :disabled="disableActions"
                    @click="submitPurchase"
                  >
                    <span
                      v-if="isTransactionPending"
                      class="purchase-primary__spinner"
                      aria-hidden="true"
                    ></span>
                    <span>{{ primaryButtonLabel }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="stake-toggle stake-toggle--summary">
              <label
                class="stake-toggle__control"
                :class="{ 'stake-toggle__control--disabled': stakeToggleDisabled }"
                :for="stakeToggleId"
              >
                <input
                  :id="stakeToggleId"
                  class="stake-toggle__input"
                  type="checkbox"
                  :disabled="stakeToggleDisabled"
                  v-model="stakeAfterPurchase"
                  @change="handleStakePreferenceChange"
                />
                <span class="stake-toggle__track" aria-hidden="true">
                  <span class="stake-toggle__thumb"></span>
                </span>
                <span class="stake-toggle__label ui-label-sm">{{ stakeAfterLabel }}</span>
              </label>
            </div>
          </section>

          <section v-if="!showPurchaseControls" class="buy-group">
            <p class="buy-group__label ui-label-sm" aria-hidden="true">{{ statusLabel }}</p>
            <p class="info-text">{{ pausedCopy }}</p>
            <div class="form-notice-slot" aria-live="polite" aria-atomic="true"></div>
          </section>

          <div v-if="showSecondaryCtas" class="micro-cta">
            <p v-if="secondaryCtaDescription" class="micro-cta__description">{{ secondaryCtaDescription }}</p>

            <div v-if="secondaryLinks.length" class="micro-cta__links">
              <a
                v-for="link in secondaryLinks"
                :key="link.id"
                class="micro-cta__link"
                :href="link.href"
                :target="linkTarget(link)"
                :rel="linkRel(link)"
                @click="handleSecondaryLinkClick(link)"
              >
                {{ link.text }}
                <span v-if="link.caption" class="micro-cta__caption">{{ link.caption }}</span>
              </a>
            </div>

            <div v-if="showEmailForm" class="micro-cta__email">
              <p v-if="emailSettings.description" class="micro-cta__email-description">
                {{ emailSettings.description }}
              </p>
              <form class="micro-cta__email-form" @submit.prevent="handleEmailSubmit" novalidate>
                <label class="sr-only" for="microCtaEmail">{{ emailSettings.label }}</label>
                <input
                  id="microCtaEmail"
                  class="micro-cta__email-input"
                  type="email"
                  :placeholder="emailSettings.placeholder"
                  autocomplete="email"
                  :disabled="emailStatus === 'submitting'"
                  v-model="emailValue"
                  required
                />
                <button
                  class="micro-cta__email-button"
                  type="submit"
                  :disabled="emailStatus === 'submitting'"
                >
                  {{ emailStatus === 'submitting' ? emailSubmittingLabel : emailSettings.buttonText }}
                </button>
              </form>
              <p
                v-if="emailStatus === 'success' && emailSuccessMessage"
                class="micro-cta__feedback micro-cta__feedback--success"
              >
                {{ emailSuccessMessage }}
              </p>
              <p
                v-if="emailStatus === 'error' && emailErrorMessage"
                class="micro-cta__feedback micro-cta__feedback--error"
              >
                {{ emailErrorMessage }}
              </p>
            </div>
          </div>
        </li>
      </ol>

      <transition name="fade">
        <div v-if="transactionState !== 'idle'" class="status-panel" :class="statusClass">
          <template v-if="transactionState === 'pending'">
            <p class="status-title">{{ pendingTitle }}</p>
            <p class="status-description">{{ pendingStatusText }}</p>
            <p class="status-description" v-if="etherscanPendingUrl">
              <a :href="etherscanPendingUrl" target="_blank" rel="noopener">
                {{ pendingLinkLabel }}
              </a>
            </p>
          </template>

          <template v-else-if="transactionState === 'success'">
            <p class="status-title">{{ successTitle }}</p>
            <p class="status-description">{{ successDescription }}</p>
            <p class="status-description">
              <a :href="transactionDetails?.etherscanUrl" target="_blank" rel="noopener">
                {{ successLinkLabel }}
              </a>
            </p>
          </template>

          <template v-else-if="transactionState === 'error'">
            <p class="status-title">{{ errorTitle }}</p>
            <p class="status-description">{{ transactionMessage }}</p>
            <button class="link-button" type="button" @click="resetTransactionState">
              {{ errorButtonLabel }}
            </button>
          </template>
        </div>
      </transition>
      <transition name="fade">
        <div
          v-if="isTransactionPending"
          class="buy-pending-overlay"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div class="buy-pending-overlay__content">
            <span class="buy-pending-overlay__spinner" aria-hidden="true"></span>
            <p class="buy-pending-overlay__headline">{{ pendingOverlayTitle }}</p>
            <p class="buy-pending-overlay__copy">{{ pendingStatusText }}</p>
            <p v-if="etherscanPendingUrl" class="buy-pending-overlay__link">
              <a :href="etherscanPendingUrl" target="_blank" rel="noopener">{{ pendingLinkLabel }}</a>
            </p>
          </div>
        </div>
      </transition>
      <transition name="fade">
        <div
          v-if="isAssetPickerOpen"
          class="asset-picker-overlay"
          @click="closeAssetPicker"
        ></div>
      </transition>
    </div>

  </div>

  <transition v-if="needEthEnabled" name="fade">
    <div
      v-if="needEthModalOpen"
      class="need-eth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="needEthModalTitle"
    >
      <div class="need-eth-modal__backdrop" @click="closeNeedEthModal"></div>
      <div class="need-eth-modal__content" tabindex="-1" ref="needEthModalContent">
        <button
          type="button"
          class="need-eth-modal__close"
          :aria-label="closeNeedEthLabel"
          @click="closeNeedEthModal"
        >
          ✕
        </button>
        <h2 id="needEthModalTitle" class="need-eth-modal__title">{{ needEthHelp.title }}</h2>
        <p v-if="needEthHelp.description" class="need-eth-modal__description">
          {{ needEthHelp.description }}
        </p>
        <ul class="need-eth-modal__links">
          <li v-for="link in needEthHelp.links" :key="link.href">
            <a :href="link.href" target="_blank" rel="noopener" @click="handleNeedEthLinkClick(link)">{{ link.label }}</a>
          </li>
        </ul>
        <p v-if="needEthHelp.note" class="need-eth-modal__note">{{ needEthHelp.note }}</p>
      </div>
    </div>
  </transition>

  <transition name="fade">
    <div
      v-if="showSuccessCelebration && successCelebrationMeta"
      class="success-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="successModalTitle"
      aria-describedby="successModalCopy"
    >
      <div class="success-modal__backdrop" @click="closeSuccessCelebration('backdrop')"></div>
      <div class="success-modal__content" tabindex="-1">
        <span class="success-modal__glow" aria-hidden="true"></span>
        <div class="success-modal__fireworks" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <button
          ref="successModalCloseBtn"
          type="button"
          class="success-modal__close"
          :aria-label="successDismissLabel"
          @click="closeSuccessCelebration('button')"
        >
          ✕
        </button>
        <p id="successModalTitle" class="success-modal__eyebrow">{{ successEyebrow }}</p>
        <h3 class="success-modal__headline">{{ successHeadline }}</h3>
        <p id="successModalCopy" class="success-modal__copy">
          {{ successBodyText }}
        </p>
        <div class="success-modal__details">
          <p class="success-modal__stat">
            <span class="success-modal__stat-label">{{ successTransactionLabel }}</span>
            <a v-if="successEtherscanUrl" :href="successEtherscanUrl" target="_blank" rel="noopener">
              {{ successTxHashShort }}
            </a>
          </p>
          <p class="success-modal__stat">
            <span class="success-modal__stat-label">{{ successEthSpentLabel }}</span>
            <span>{{ successSpendDisplay }}</span>
          </p>
        </div>
        <div class="success-modal__actions">
          <button
            v-if="!successIsStakeCombo"
            type="button"
            class="success-modal__cta"
            @click="handleSuccessStakeCta"
          >
            {{ successStakeCta }}
          </button>
          <a
            v-if="telegramLink"
            class="success-modal__secondary"
            :href="telegramLink.href"
            target="_blank"
            rel="noopener"
            @click="handleSuccessCommunityCta"
          >
            {{ telegramLink.text || successCommunityFallback }}
          </a>
        </div>
        <p class="success-modal__footer">{{ successFooter }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { inject, nextTick, onMounted, onUnmounted, ref, computed, watch, reactive } from 'vue';
import { ethers } from 'ethers';
import {
  sanitizeText,
  resolveAssetLabel,
  sanitizeUrl,
  defaultConnectorOptions,
  normalizeConnectorOptions,
  linkTarget,
  linkRel,
  resolveError,
} from './buyTextHelpers.js';
import { useBuyContentConfig } from './useBuyContentConfig.js';
import { trackEvent, trackFunnelEvent } from '@d2sg/cms/utils/analytics';
import { useBuyWallet } from './useBuyWallet.js';
import BonusIncentive from './BonusIncentive.vue';
import FirstTimeOnboarding from './FirstTimeOnboarding.vue';
import { useBuyOnboarding } from './useBuyOnboarding.js';
import { useBuyTransaction } from './useBuyTransaction.js';
import { useFomoProgress } from './useFomoProgress.js';
import UnitChip from '@d2sg/cms/components/ui/UnitChip.vue';
import { formatDecimal, formatUsd, formatTokenAmount, formatPercent } from '@d2sg/cms/utils/formatNumber';
import { getTokenSymbol } from '@d2sg/cms/utils/tokenFormat';
import {
  PAYMENT_ASSETS,
  createPaymentAssetMap,
  resolvePaymentAssetMeta,
} from './buyAssets.js';
import { buildPurchaseAnalyticsPayload } from './buyAnalytics.js';
import { createPriceSnapshotCache } from './priceSnapshotCache.js';
import { collectWalletBalanceSnapshot } from './walletBalanceHelper.js';
import {
  getPresaleReadContract,
  getPresaleWriteContract,
  getRegistryContract,
} from '@d2sg/cms/utils/presaleContracts';

const ETHERSCAN_TX_BASE = 'https://etherscan.io/tx/';
const ETHERSCAN_ADDRESS_BASE = 'https://etherscan.io/address/';
const tokenIconModules = import.meta.glob('../../../../src/assets/img/*.{png,svg,webp}', {
  eager: true,
  import: 'default',
});

let readProvider;
let presaleContractAddress;

const TOKEN_TICKER = import.meta.env.VITE_TOKEN;
const STATIC_TOKEN_SYMBOL = getTokenSymbol('');
const CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
const RPC_READ = import.meta.env.VITE_RPC_READ;
const HAS_CUSTOM_RPC = Boolean(RPC_READ && RPC_READ.trim());
const normalizedToken = (TOKEN_TICKER || 'unknown').toLowerCase();
const HOW_IT_WORKS_STORAGE_KEY = `presale-how-it-works-${normalizedToken}`;
const PENDING_TX_STORAGE_KEY = `presale-pending-tx-${normalizedToken}`;
const DEFAULT_NEED_ETH_LINK = 'https://www.coinbase.com/buy/ethereum';

const paymentAssetOptions = PAYMENT_ASSETS;
const paymentAssetMap = createPaymentAssetMap(paymentAssetOptions);
const selectedPaymentSymbol = ref('ETH');
const isAssetPickerOpen = ref(false);
const assetPickerButtonRef = ref(null);
const assetPickerPopoverRef = ref(null);
const activeInput = ref(null);
const ethBalance = ref('');
const tokensReceive = ref('');
let lastAutoPrefillValue = '';
let lastAutoPrefillSymbol = null;
const totalUsdRaisedRaw = ref(0n);
const purchasedTokensRaw = ref(0);
const DEFAULT_ETH_USD_PRICE = Number(import.meta.env.VITE_ETH_USD_FALLBACK || 4000);
const lastKnownEthUsdPrice = ref(DEFAULT_ETH_USD_PRICE);
const lastKnownTokenPrice = ref(null);
const personalStakedRaw = ref(0);
const personalUnstakedRaw = ref(0);
const personalRewardsRaw = ref(0);
const personalSummaryReady = ref(false);
const PRICE_REFRESH_WINDOW_MS = 12000;
const priceCache = createPriceSnapshotCache({
  initialEthPrice: DEFAULT_ETH_USD_PRICE,
  hasCustomRpc: HAS_CUSTOM_RPC,
  windowMs: PRICE_REFRESH_WINDOW_MS,
  fetchEthPrice: () => fetchEthUsdFromContract(),
  fetchTokenPrice: () => fetchTokenPriceFromContract(),
  onEthPriceUpdate: (value) => {
    lastKnownEthUsdPrice.value = value;
  },
  onTokenPriceUpdate: (value) => {
    lastKnownTokenPrice.value = value;
  },
});
const walletStableBalances = reactive(
  paymentAssetOptions
    .filter((asset) => asset.symbol !== 'ETH')
    .reduce((acc, asset) => {
      acc[asset.symbol] = 0;
      return acc;
    }, {})
);
const userHasSelectedPaymentAsset = ref(false);
let isAutoSelectingPaymentAsset = false;
let isRefreshingWalletBalances = false;
const selectedPaymentAsset = computed(
  () => paymentAssetOptions.find((asset) => asset.symbol === selectedPaymentSymbol.value) || paymentAssetOptions[0]
);
const isNativePayment = computed(() => selectedPaymentAsset.value?.type === 'native');
const selectedPaymentIcon = computed(() => resolveAssetIcon(selectedPaymentAsset.value?.symbol || ''));
const assetPickerId = computed(() => `${normalizedToken}-asset-picker`);
const assetPickerOptions = computed(() =>
  paymentAssetOptions.map((asset) => {
    const balance =
      asset.symbol === 'ETH'
        ? (Number.isFinite(walletBalanceEth.value) ? walletBalanceEth.value : 0)
        : walletStableBalances[asset.symbol] ?? 0;
  const digits = asset.symbol === 'ETH' ? 6 : Math.min(asset.decimals, 6);
  const isConnected = isWalletConnected.value && !networkMismatch.value;
  const formattedBalance = isConnected
    ? formatDecimal(balance || 0, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      })
    : '—';
    const icon = asset.icon || resolveAssetIcon(asset.symbol);
    return {
      ...asset,
      balanceValue: balance,
      balanceDisplay: formattedBalance,
      icon,
      type: asset.type,
    };
  })
);
function getAssetBalance(asset) {
  if (!asset) return 0;
  if (asset.symbol === 'ETH') {
    return Number.isFinite(walletBalanceEth.value) ? walletBalanceEth.value : 0;
  }
  const balance = walletStableBalances[asset.symbol];
  return Number.isFinite(balance) ? balance : 0;
}

function computeAssetUsdValue(asset) {
  const balance = getAssetBalance(asset);
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  const ethPrice = Number.isFinite(lastKnownEthUsdPrice.value) && lastKnownEthUsdPrice.value > 0
    ? lastKnownEthUsdPrice.value
    : DEFAULT_ETH_USD_PRICE;
  const price = asset?.type === 'native' || asset?.type === 'wrapped' ? ethPrice : 1;
  return balance * price;
}

function autoSelectPaymentAsset() {
  if (userHasSelectedPaymentAsset.value) return;
  let bestAsset = paymentAssetOptions[0];
  let bestValue = -Infinity;
  for (const asset of paymentAssetOptions) {
    const value = computeAssetUsdValue(asset);
    if (value > bestValue + 1e-9) {
      bestAsset = asset;
      bestValue = value;
    }
  }
  if (bestAsset && bestAsset.symbol && bestAsset.symbol !== selectedPaymentSymbol.value) {
    isAutoSelectingPaymentAsset = true;
    selectedPaymentSymbol.value = bestAsset.symbol;
  }
}

function clearAmountInputsForAutoPrefill() {
  initializedEthFromWallet.value = false;
  hasTrackedInsufficientFunds.value = false;
  clearFormAlert('insufficient-funds');
  ethBalance.value = '';
  tokensReceive.value = '';
  if (activeInput.value === 'token') {
    debounceUpdateEthBalanceFromTokens();
  } else {
    debounceUpdateTokensReceive();
  }
}

function restoreLatestAutoPrefill() {
  if (!lastAutoPrefillValue) return;
  const currentSymbol = selectedPaymentAsset.value?.symbol || null;
  if (!currentSymbol || currentSymbol !== lastAutoPrefillSymbol) return;
  if (ethBalance.value && ethBalance.value.trim()) return;
  ethBalance.value = lastAutoPrefillValue;
}

function resetFormForSelectedAsset() {
  if (isAutoSelectingPaymentAsset) {
    return;
  }
  clearAmountInputsForAutoPrefill();
}

function focusAssetPickerFirstOption() {
  nextTick(() => {
    const el = assetPickerPopoverRef.value?.querySelector('button');
    if (el && typeof el.focus === 'function') {
      el.focus();
    }
  });
}

function openAssetPicker() {
  if (isAssetPickerOpen.value) return;
  isAssetPickerOpen.value = true;
  focusAssetPickerFirstOption();
}

function closeAssetPicker(reason = 'manual') {
  if (!isAssetPickerOpen.value) return;
  isAssetPickerOpen.value = false;
  if (reason !== 'button' && reason !== 'selection') {
    assetPickerButtonRef.value?.focus?.();
  }
}

function toggleAssetPicker() {
  if (isAssetPickerOpen.value) {
    closeAssetPicker('button');
  } else {
    openAssetPicker();
  }
}

function handleAssetSelect(symbol) {
  userHasSelectedPaymentAsset.value = true;
  if (selectedPaymentSymbol.value !== symbol) {
    selectedPaymentSymbol.value = symbol;
  }
  closeAssetPicker('selection');
  focusSpendInput();
}

function onAssetPickerKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeAssetPicker('escape');
  }
}

function focusSpendInput() {
  nextTick(() => {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('ethBalance');
    input?.focus?.();
  });
}

const assetIconCache = new Map();

function resolveAssetIcon(symbol) {
  const cacheKey = symbol || '';
  if (assetIconCache.has(cacheKey)) {
    return assetIconCache.get(cacheKey);
  }
  const normalized = (symbol || '').toLowerCase();
  const variants = new Set([
    normalized,
    (symbol || '').toUpperCase(),
    (symbol || '').toLowerCase(),
  ]);
  const extensions = ['png', 'svg', 'webp'];
  for (const variant of variants) {
    if (!variant) continue;
    for (const ext of extensions) {
      const key = `../../../../src/assets/img/${variant}.${ext}`;
      const url = tokenIconModules[key];
      if (typeof url === 'string') {
        assetIconCache.set(cacheKey, url);
        return url;
      }
    }
  }
  assetIconCache.set(cacheKey, null);
  return null;
}

const buyTransactionOptions = {
  tokenTicker: TOKEN_TICKER,
  pendingTxStorageKey: PENDING_TX_STORAGE_KEY,
  rpcRead: RPC_READ,
  paymentAssetMap,
  getReadProvider: () => readProvider,
  setReadProvider: (p) => { readProvider = p; },
};
const {
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
} = useBuyTransaction(buyTransactionOptions);

const showPurchaseControls = ref(true);
const initializedEthFromWallet = ref(false);
const isBuyAndStakeProcessing = ref(false);

const cleanupFns = [];
const PERSONAL_SUMMARY_REFRESH_INTERVAL_MS = 45000;
let personalSummaryRefreshIntervalId = null;

function registerCleanup(fn) {
  cleanupFns.push(fn);
}

function startPersonalSummaryRefreshLoop() {
  if (typeof window === 'undefined') return;
  if (personalSummaryRefreshIntervalId !== null) return;
  personalSummaryRefreshIntervalId = window.setInterval(() => {
    refreshPersonalStakeSummary({ rewardsOnly: true }).catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('Failed to refresh personal rewards summary', error);
      }
    });
  }, PERSONAL_SUMMARY_REFRESH_INTERVAL_MS);
}

function stopPersonalSummaryRefreshLoop() {
  if (personalSummaryRefreshIntervalId === null) return;
  if (typeof window !== 'undefined' && typeof window.clearInterval === 'function') {
    window.clearInterval(personalSummaryRefreshIntervalId);
  } else {
    clearInterval(personalSummaryRefreshIntervalId);
  }
  personalSummaryRefreshIntervalId = null;
}

const pageContent = inject('pageContent', ref({}));
const siteData = inject('siteData', ref({}));
const fomoProgressOverride = inject('fomoProgress', null);
const presalePulse = inject('presalePulse', null);
const personalPresaleSummary = inject(
  'personalPresaleSummary',
  ref({
    isHydrated: false,
    purchased: 0,
    purchasedFormatted: '0',
    staked: 0,
    stakedFormatted: '0',
  })
);
const setActivePresaleTab = inject('setActivePresaleTab', null);

const {
  fomoConfig,
  priceTimeline,
  bonusState,
  bonusDisplay,
  priceTimelineId,
  priceTimelineTitle,
  priceTimelineSubtitle,
  priceTimelineEntries,
  showPriceTimeline,
  syncPresalePulse,
  updateFomoProgress,
  resetBonusState,
  applyBonusConfig,
  applyBonusOverride,
  applyFomoConfig,
  startLiveMetrics,
  stopLiveMetrics,
} = useFomoProgress({
  presalePulse,
  showPurchaseControls,
  getPresaleContractAddress: () => presaleContractAddress,
  getReadProvider: () => readProvider,
  hasCustomRpc: HAS_CUSTOM_RPC,
  normalizedToken,
  fomoProgressOverride,
});

const buyLayoutRef = ref(null);

const showHowItWorksCard = ref(true);
const needEthModalOpen = ref(false);
const needEthModalContent = ref(null);
const needEthHelp = reactive({
  title: 'Need ETH?',
  description: 'Use a trusted on-ramp to buy ETH, then send it to the wallet you connect here.',
  links: [
    {
      label: 'Buy ETH on Coinbase',
      href: DEFAULT_NEED_ETH_LINK,
    },
  ],
  note: 'Once your wallet is funded, return here to finish the presale.',
});

const MIN_GAS_BUFFER = 0.002;
const formAlert = ref(null);
const hasTrackedNetworkMismatch = ref(false);
const hasTrackedInsufficientFunds = ref(false);
const successModalCloseBtn = ref(null);

function resetPersonalStatus() {
  purchasedTokensRaw.value = 0;
  personalStakedRaw.value = 0;
  personalUnstakedRaw.value = 0;
  personalRewardsRaw.value = 0;
  personalSummaryReady.value = false;
}

function showFormAlert({ type = 'error', title = '', message = '', code = '', dismissible = true } = {}) {
  if (!message) return;
  formAlert.value = {
    id: Date.now(),
    type,
    title,
    message,
    code,
    dismissible,
  };
}

function clearFormAlert(code) {
  if (!formAlert.value) return;
  if (!code || formAlert.value.code === code) {
    formAlert.value = null;
  }
}

const {
  isWalletConnected,
  walletAddress,
  currentChainId,
  networkMismatch,
  switchingNetwork,
  connectionError,
  lastWalletConnector,
  shortWalletAddress,
  displayChainName,
  networkAlertVisible,
  walletReadyForSummary,
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
} = useBuyWallet({
  normalizedToken,
  tokenTicker: TOKEN_TICKER,
  showFormAlert,
  clearFormAlert,
  onDisconnected() {
    closeAssetPicker('disconnect');
    userHasSelectedPaymentAsset.value = false;
    walletBalanceEth.value = 0;
    resetPersonalStatus();
  },
  refreshPresaleData() {
    return refreshPresaleData();
  },
  dismissOnboarding(reason) {
    dismissOnboarding(reason);
  },
});

function formAlertMatches(code) {
  if (!formAlert.value) return false;
  return formAlert.value.code === code;
}

function showInsufficientFundsAlert() {
  const asset = selectedPaymentAsset.value;
  const symbol = asset?.symbol || 'ETH';
  const isNative = asset?.type === 'native';
  showFormAlert({
    type: 'error',
    title: isNative ? 'Insufficient ETH' : `Insufficient ${symbol}`,
    message: isNative
      ? "Insufficient ETH — your wallet's feeling a bit empty. Top up or lower the amount (we keep a little extra for gas)."
      : `Insufficient ${symbol} — top up or lower the amount before confirming your purchase.`,
    code: 'insufficient-funds',
  });
}

const tokenSymbol = computed(() => {
  if (STATIC_TOKEN_SYMBOL) return STATIC_TOKEN_SYMBOL;
  const ticker = (TOKEN_TICKER || '').toUpperCase();
  return ticker ? `$${ticker}` : '';
});
const presaleConfig = computed(() => pageContent.value?.presale || {});
const {
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
  walletConnectedLabel,
  wrongNetworkLabel,
  switchingNetworkLabel,
  networkSwitchButtonLabel,
  networkAlertTitle,
  networkAlertMessage,
  networkAlertCta,
  chooseAmountSubtitle,
  amountLabel,
  fillMaxLabel,
  maxButtonLabel,
  assetPickerTitle,
  summaryLabel,
  statusLabel,
  pausedCopy,
  confirmPurchaseSubtitle,
  dismissAlertLabel,
  hideInstructionsLabel,
  closeNeedEthLabel,
  successDismissLabel,
  pendingTitle,
  pendingOverlayTitle,
  pendingLinkLabel,
  pendingBuyLabel,
  pendingBuyAndStakeLabel,
  successTitle,
  successLinkLabel,
  errorTitle,
  errorButtonLabel,
  connectButtonLabel,
  howItWorksButtonLabel,
  howItWorksTitle,
  needEthButtonLabel,
  chooseAmountTitle,
  confirmPurchaseTitle,
  howItWorksStepsDefaults,
  howItWorksStepTitles,
  howItWorksStepOne,
  howItWorksStepTwo,
  howItWorksStepThree,
  benefitsConfig,
  benefitsEyebrow,
  benefitsTitleFallback,
  benefitsTitle,
  benefitsSectionId,
  howItWorksId,
  benefitItems,
  benefitsCta,
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
  pendingButtonLabel,
  pendingMessages,
  pendingStatusText,
  communityLinks,
  telegramLink,
} = useBuyContentConfig({
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
});
const ethSpend = ref('ETH to Spend');
const balance = ref('Balance');
const youReceive = ref('You Will Receive');
const buyCta = ref('Buy');
const stakeAfterBaseLabel = ref(DEFAULT_STAKE_AFTER_LABEL);
const stakingApyDisplay = ref('');
const stakeAfterLabel = computed(() => {
  const baseRaw = stakeAfterBaseLabel.value || DEFAULT_STAKE_AFTER_LABEL;
  const baseLabel = baseRaw.trim() || DEFAULT_STAKE_AFTER_LABEL;
  const apyLabel = stakingApyDisplay.value;
  return apyLabel ? `${baseLabel} (${apyLabel})` : baseLabel;
});
const stakeAfterPurchase = ref(true);
const stakePreferenceInitialized = ref(false);
const tokenEstimateId = `${normalizedToken}-token-estimate`;
const stakeToggleId = `${normalizedToken}-stake-after-toggle`;
const walletBalanceEth = ref(0);
const currentWalletBalance = computed(() => {
  if (selectedPaymentAsset.value?.type === 'native') {
    return Number.isFinite(walletBalanceEth.value) ? walletBalanceEth.value : 0;
  }
  const symbol = selectedPaymentAsset.value?.symbol;
  if (!symbol) return 0;
  const balance = walletStableBalances[symbol];
  return Number.isFinite(balance) ? balance : 0;
});
const spendUnitLabel = computed(() => selectedPaymentAsset.value?.symbol || 'ETH');
const walletBalanceDisplay = computed(() => {
  const asset = selectedPaymentAsset.value;
  if (!asset) return '0';
  const digits = asset.type === 'native' ? 6 : Math.min(asset.decimals, 6);
  return formatDecimal(currentWalletBalance.value || 0, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
});
const spendLabel = computed(() => {
  const asset = selectedPaymentAsset.value;
  const symbol = asset?.symbol || 'ETH';
  const fallback = `${symbol} to Spend`;
  return resolveAssetLabel(ethSpend.value, fallback, symbol) || fallback;
});
const walletBalanceLabel = computed(() => {
  const asset = selectedPaymentAsset.value;
  const symbol = asset?.symbol || 'ETH';
  const fallback =
    asset && asset.type === 'native' ? 'Your ETH Balance' : `Your ${symbol} Balance`;
  return resolveAssetLabel(balance.value, fallback, symbol) || fallback;
});
const youReceiveLabel = computed(() => {
  const base = sanitizeText(youReceive.value) || 'You Will Receive';
  const symbol = (tokenSymbol.value || '').trim();
  if (!symbol) return base;
  const lowerBase = base.toLowerCase();
  if (lowerBase.includes(symbol.toLowerCase())) {
    return base;
  }
  return `${symbol} ${base}`.replace(/\s+/g, ' ').trim();
});
const connectPrompt = ref(DEFAULT_CONNECT_PROMPT);
const connectHeadline = ref(DEFAULT_CONNECT_HEADLINE);
const quickConnectorOptions = ref(defaultConnectorOptions.map((option) => ({ ...option })));
const hasQuickConnectors = computed(() => quickConnectorOptions.value.length > 0);

const primaryButtonLabel = computed(() =>
  isTransactionPending.value ? pendingButtonLabel.value : buyCta.value
);

const availableBalance = computed(() => {
  if (!isWalletConnected.value) return 0;
  const asset = selectedPaymentAsset.value;
  if (!asset) return 0;
  const balance = currentWalletBalance.value;
  if (asset.type === 'native') {
    return Math.max(balance - MIN_GAS_BUFFER, 0);
  }
  return Math.max(balance, 0);
});

const insufficientFunds = computed(() => {
  if (!isWalletConnected.value) return false;
  const trimmed = (ethBalance.value || '').trim();
  const amount = parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const available = availableBalance.value;
  if (!Number.isFinite(available)) return false;
  const asset = selectedPaymentAsset.value;
  const epsilon = asset?.type === 'native' ? 1e-6 : 1e-4;
  return amount - available > epsilon;
});

const showTokenEstimateNotice = computed(() => {
  const amount = parseFloat((tokensReceive.value || '').trim());
  return Number.isFinite(amount) && amount > 0;
});

const formattedTokenEstimate = computed(() => {
  const amount = parseFloat((tokensReceive.value || '').trim());
  if (!Number.isFinite(amount) || amount <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: amount < 100 ? 2 : 0,
    maximumFractionDigits: amount < 100 ? 2 : 0,
  }).format(amount);
});

const showTokenEstimate = computed(() => {
  const amount = parseFloat((tokensReceive.value || '').trim());
  return Number.isFinite(amount) && amount > 0;
});

const tokenEstimateDisplay = computed(() => {
  const amount = parseFloat((tokensReceive.value || '').trim());
  if (!Number.isFinite(amount) || amount <= 0) return '0';
  return formatTokenAmount(amount, {
    minimumFractionDigits: amount < 100 ? 2 : 0,
    maximumFractionDigits: amount < 100 ? 2 : 0,
  });
});
const liveTokenEstimate = computed(() => {
  const amount = parseFloat(tokensReceive.value) || 0;
  return formatTokenAmount(amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

const personalPurchasedDisplay = computed(() =>
  formatTokenAmount(purchasedTokensRaw.value ?? 0, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

const personalStakedDisplay = computed(() =>
  formatTokenAmount(personalStakedRaw.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

const personalUnstakedDisplay = computed(() =>
  formatTokenAmount(personalUnstakedRaw.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

const personalRewardsDisplay = computed(() =>
  formatTokenAmount(personalRewardsRaw.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

watch(
  () => ({
    isConnected: isWalletConnected.value && !networkMismatch.value,
    isHydrated: personalSummaryReady.value,
    purchased: Number(purchasedTokensRaw.value ?? 0),
    purchasedDisplay: personalPurchasedDisplay.value,
    staked: Number(personalStakedRaw.value ?? 0),
    stakedDisplay: personalStakedDisplay.value,
    stakeable: Number(personalUnstakedRaw.value ?? 0),
    stakeableDisplay: personalUnstakedDisplay.value,
    rewards: Number(personalRewardsRaw.value ?? 0),
    rewardsDisplay: personalRewardsDisplay.value,
  }),
  (snapshot) => {
    if (!personalPresaleSummary || typeof personalPresaleSummary !== 'object') return;
    personalPresaleSummary.value = {
      isConnected: Boolean(snapshot.isConnected),
      isHydrated: Boolean(snapshot.isConnected && snapshot.isHydrated),
      purchased: snapshot.purchased,
      purchasedFormatted: snapshot.purchasedDisplay,
      staked: snapshot.staked,
      stakedFormatted: snapshot.stakedDisplay,
      stakeable: snapshot.stakeable,
      stakeableFormatted: snapshot.stakeableDisplay,
      rewards: snapshot.rewards,
      rewardsFormatted: snapshot.rewardsDisplay,
    };
  },
  { immediate: true }
);
const hasPersonalPresaleActivity = computed(() => {
  const purchased = Number(purchasedTokensRaw.value ?? 0);
  const staked = Number(personalStakedRaw.value ?? 0);
  const unstaked = Number(personalUnstakedRaw.value ?? 0);
  return purchased > 0 || staked > 0 || unstaked > 0;
});

const {
  onboardingVisible,
  onboardingEnabled,
  onboardingContent,
  onboardingStepsForDisplay,
  onboardingSkipOnMobile,
  onboardingHasSeen,
  isMobileViewport,
  dismissOnboarding,
  handleOnboardingDismissEvent,
  applyOnboardingConfig,
  reevaluateOnboarding,
  detachOnboardingViewportListener,
  cancelOnboardingTimer,
  initOnboardingOnMount,
} = useBuyOnboarding({
  normalizedToken,
  tokenTicker: TOKEN_TICKER,
  tokenSymbol,
  isWalletConnected,
  showPurchaseControls,
  hasPersonalPresaleActivity,
  transactionState,
  trackEvent,
  sanitizeText,
});

const secondaryCtaDescription = ref('');
const secondaryLinks = ref([]);
const emailSettings = reactive({
  enabled: false,
  endpoint: '',
  method: 'POST',
  placeholder: 'you@example.com',
  buttonText: 'Get updates',
  successMessage: 'Thanks! Check your inbox shortly.',
  errorMessage: 'We could not submit your email. Try again.',
  description: '',
  label: 'Email address',
  headers: null,
  extraFields: null,
  payloadFieldName: 'email',
  submittingLabel: DEFAULT_EMAIL_SUBMITTING_LABEL,
});
const emailValue = ref('');
const emailStatus = ref('idle'); // idle | submitting | success | error
const emailErrorMessage = ref('');
const emailSuccessMessage = ref('');
const emailSubmittingLabel = computed(
  () => sanitizeText(emailSettings.submittingLabel) || DEFAULT_EMAIL_SUBMITTING_LABEL
);

const showEmailForm = computed(() => emailSettings.enabled && emailSettings.endpoint);
const showSecondaryCtas = computed(
  () =>
    sparkbangCtaEnabled.value && (secondaryLinks.value.length > 0 || showEmailForm.value)
);

watch(insufficientFunds, (value) => {
  if (value && !networkMismatch.value) {
    if (!formAlertMatches('insufficient-funds')) {
      showInsufficientFundsAlert();
    }
    if (!hasTrackedInsufficientFunds.value) {
      const asset = selectedPaymentAsset.value;
      const symbol = asset?.symbol || 'ETH';
      const enteredAmount = parseFloat((ethBalance.value || '').trim()) || 0;
      const walletBalance = currentWalletBalance.value || 0;
      const walletEthNumeric = Number.isFinite(walletBalanceEth.value) ? walletBalanceEth.value : 0;
      trackEvent('error_insufficient_funds', {
        token: TOKEN_TICKER || 'unknown',
        entered_amount_asset: Number(enteredAmount.toFixed(Math.min(asset?.decimals || 6, 6))),
        wallet_balance_asset: Number(walletBalance.toFixed(Math.min(asset?.decimals || 6, 6))),
        spend_currency: symbol,
        ...(asset?.type === 'native'
          ? {
              entered_amount_eth: Number(enteredAmount.toFixed(6)),
              wallet_balance_eth: Number(walletEthNumeric.toFixed(6)),
            }
          : {}),
      });
      hasTrackedInsufficientFunds.value = true;
    }
  } else {
    clearFormAlert('insufficient-funds');
    hasTrackedInsufficientFunds.value = false;
  }
});

watch(networkAlertVisible, (visible) => {
  if (visible) {
    clearFormAlert('insufficient-funds');
    hasTrackedInsufficientFunds.value = false;
    if (!hasTrackedNetworkMismatch.value) {
      trackEvent('error_network_mismatch', {
        token: TOKEN_TICKER || 'unknown',
        chain_id: currentChainId.value ?? null,
      });
      hasTrackedNetworkMismatch.value = true;
    }
  } else {
    hasTrackedNetworkMismatch.value = false;
    clearFormAlert('network-mismatch');
    connectionError.value = '';
    if (insufficientFunds.value) {
      showInsufficientFundsAlert();
    }
  }
});

watch(
  () => (ethBalance.value || '').trim(),
  (value) => {
    if (formAlertMatches('invalid-amount') && parseFloat(value) > 0) {
      clearFormAlert('invalid-amount');
    }
    if (formAlertMatches('tx-rejected') && value) {
      clearFormAlert('tx-rejected');
    }
  }
);

watch(showSuccessCelebration, (visible) => {
  if (visible) {
    nextTick(() => {
      successModalCloseBtn.value?.focus();
    });
  }
});

const stepTwoStatus = computed(() => {
  if (!isWalletConnected.value) return 'disabled';
  return networkMismatch.value ? 'current' : 'current';
});
const stepThreeStatus = computed(() => {
  if (!isWalletConnected.value || networkMismatch.value) return 'disabled';
  return 'current';
});

const disableActions = computed(() => {
  if (!isWalletConnected.value || networkMismatch.value) return true;
  if (!showPurchaseControls.value) return true;
  if (transactionState.value === 'pending') return true;
  if (insufficientFunds.value) return true;
  const ethAmount = parseFloat(ethBalance.value);
  return Number.isNaN(ethAmount) || ethAmount <= 0;
});

const stakeToggleDisabled = computed(() => {
  if (!isWalletConnected.value || networkMismatch.value) return true;
  if (!showPurchaseControls.value) return true;
  return transactionState.value === 'pending';
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildLinkEntry(link, index) {
  if (!link || typeof link !== 'object') return null;
  const text = typeof link.text === 'string' ? link.text.trim() : '';
  const href = typeof link.href === 'string' ? link.href.trim() : '';
  if (!text || !href) return null;

  const caption =
    typeof link.caption === 'string' && link.caption.trim() ? link.caption.trim() : '';
  const analyticsLabel =
    typeof link.analyticsLabel === 'string' && link.analyticsLabel.trim()
      ? link.analyticsLabel.trim()
      : text;
  const openInNewTab =
    typeof link.openInNewTab === 'boolean'
      ? link.openInNewTab
      : /^https?:\/\//i.test(href);

  const relRaw =
    typeof link.rel === 'string' && link.rel.trim() ? link.rel.trim().split(/\s+/) : [];
  const relSet = new Set(relRaw);
  if (openInNewTab) {
    relSet.add('noopener');
    relSet.add('noreferrer');
  }

  return {
    id: `${index}-${text.replace(/\s+/g, '-').toLowerCase()}`,
    text,
    href,
    caption,
    openInNewTab,
    rel: Array.from(relSet).join(' ').trim(),
    analyticsLabel,
  };
}

function loadHowItWorksPreference() {
  if (!howItWorksEnabled.value) {
    showHowItWorksCard.value = false;
    return;
  }
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(HOW_IT_WORKS_STORAGE_KEY);
  if (stored === 'hidden') {
    showHowItWorksCard.value = false;
  }
}

function persistHowItWorksPreference(hidden) {
  if (!howItWorksEnabled.value) return;
  if (typeof window === 'undefined') return;
  if (hidden) {
    window.localStorage.setItem(HOW_IT_WORKS_STORAGE_KEY, 'hidden');
  } else {
    window.localStorage.removeItem(HOW_IT_WORKS_STORAGE_KEY);
  }
}

function dismissHowItWorks(manual = false) {
  if (!howItWorksEnabled.value) return;
  if (!showHowItWorksCard.value) return;
  showHowItWorksCard.value = false;
  persistHowItWorksPreference(true);
  if (manual) {
    trackEvent('buy_how_it_works_dismissed', {
      token: TOKEN_TICKER || 'unknown',
    });
  }
}

function restoreHowItWorks() {
  if (!howItWorksEnabled.value) return;
  showHowItWorksCard.value = true;
  persistHowItWorksPreference(false);
  trackEvent('buy_how_it_works_shown', {
    token: TOKEN_TICKER || 'unknown',
    source: 'manual',
  });
}

function markHowItWorksComplete() {
  if (!howItWorksEnabled.value) return;
  if (!showHowItWorksCard.value) return;
  showHowItWorksCard.value = false;
  persistHowItWorksPreference(true);
  trackEvent('buy_how_it_works_completed', {
    token: TOKEN_TICKER || 'unknown',
  });
}

function openNeedEthModal() {
  if (!needEthEnabled.value) return;
  needEthModalOpen.value = true;
  trackEvent('need_eth_modal_opened', {
    token: TOKEN_TICKER || 'unknown',
  });
}

function closeNeedEthModal() {
  if (!needEthEnabled.value) return;
  if (!needEthModalOpen.value) return;
  needEthModalOpen.value = false;
  trackEvent('need_eth_modal_closed', {
    token: TOKEN_TICKER || 'unknown',
  });
}

function handleNeedEthLinkClick(link) {
  if (!needEthEnabled.value) return;
  trackEvent('need_eth_link_clicked', {
    token: TOKEN_TICKER || 'unknown',
    href: (link?.href || '').toLowerCase(),
    label: (link?.label || '').toLowerCase(),
  });
  closeNeedEthModal();
}

function handleGlobalKeydown(event) {
  if (!needEthEnabled.value) return;
  if (event.key === 'Escape' && needEthModalOpen.value) {
    closeNeedEthModal();
  }
}

function scrollBuySectionToTop() {
  if (typeof window === 'undefined') return;
  const target = buyLayoutRef.value;
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function handleSecondaryLinkClick(link) {
  const label = (link?.analyticsLabel || link?.text || '').toLowerCase();
  const href = link?.href || '';
  trackEvent('secondary_cta_link_click', {
    token: TOKEN_TICKER || 'unknown',
    label,
    href,
  });
  if (label.includes('playbook') || href.toLowerCase().includes('playbook')) {
    trackFunnelEvent('playbook_view', {
      source: 'presale_secondary_cta',
      label: link?.analyticsLabel || link?.text || '',
      href,
    });
  }
}

function handleBonusCta() {
  trackEvent('bonus_incentive_cta_click', {
    token: TOKEN_TICKER || 'unknown',
    href: bonusState.cta?.href || '',
    remaining: bonusState.remaining ?? null,
  });
}

async function handleEmailSubmit() {
  if (!showEmailForm.value) {
    return;
  }

  const email = emailValue.value.trim();
  if (!EMAIL_REGEX.test(email)) {
    emailStatus.value = 'error';
    emailErrorMessage.value =
      emailSettings.errorMessage || 'Please enter a valid email address.';
    return;
  }

  emailStatus.value = 'submitting';
  emailErrorMessage.value = '';
  emailSuccessMessage.value = '';

  const payloadField = emailSettings.payloadFieldName || 'email';
  const payload = {
    [payloadField]: email,
  };

  if (emailSettings.extraFields && typeof emailSettings.extraFields === 'object') {
    Object.entries(emailSettings.extraFields).forEach(([key, value]) => {
      if (key) {
        payload[key] = value;
      }
    });
  }

  const headers =
    emailSettings.headers && typeof emailSettings.headers === 'object'
      ? { ...emailSettings.headers }
      : {};
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const contentType = headers['Content-Type'] || headers['content-type'] || '';
  let body;
  if (contentType.includes('application/json')) {
    body = JSON.stringify(payload);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    body = new URLSearchParams(payload).toString();
  } else {
    body = JSON.stringify(payload);
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(emailSettings.endpoint, {
      method: (emailSettings.method || 'POST').toUpperCase(),
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Email subscription failed with status ${response.status}`);
    }

    emailStatus.value = 'success';
    emailSuccessMessage.value =
      emailSettings.successMessage || 'Thanks! Check your inbox shortly.';
    emailValue.value = '';

    trackEvent('secondary_cta_email_success', {
      token: TOKEN_TICKER || 'unknown',
      endpoint: emailSettings.endpoint,
    });
  } catch (error) {
    console.error('Failed to submit email signup', error);
    emailStatus.value = 'error';
    emailErrorMessage.value =
      emailSettings.errorMessage || 'We could not submit your email. Try again.';

    trackEvent('secondary_cta_email_error', {
      token: TOKEN_TICKER || 'unknown',
      endpoint: emailSettings.endpoint || 'unknown',
      error_name: error?.name || 'unknown',
    });
  }
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debounceUpdateTokensReceive = debounce(() => {
  updateTokensReceive().catch((error) => console.warn('Failed to update token estimate', error));
}, 250);

const debounceUpdateEthBalanceFromTokens = debounce(() => {
  updateEthBalanceFromTokens().catch((error) => console.warn('Failed to update ETH estimate', error));
}, 250);

async function fetchEthUsdFromContract() {
  if (!presaleContractAddress || !readProvider) return lastKnownEthUsdPrice.value;
  if (!HAS_CUSTOM_RPC) {
    return lastKnownEthUsdPrice.value;
  }
  try {
    const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
    if (!presaleContract) return lastKnownEthUsdPrice.value;
    const rawPrice = await presaleContract.getEthUsdPrice();
    const formatted = parseFloat(ethers.formatUnits(rawPrice, 18));
    if (!Number.isNaN(formatted) && formatted > 0) {
      priceCache.primePrices({ ethUsdPrice: formatted });
      return formatted;
    }
  } catch (error) {
    console.warn('Unable to refresh ETH/USD price for analytics', error);
  }
  return lastKnownEthUsdPrice.value;
}

async function fetchTokenPriceFromContract() {
  if (!presaleContractAddress || !readProvider) return lastKnownTokenPrice.value;
  if (!HAS_CUSTOM_RPC) {
    return lastKnownTokenPrice.value;
  }
  try {
    const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
    if (!presaleContract) return lastKnownTokenPrice.value;
    const rawPrice = await presaleContract.getCurrentTokenPrice();
    const formatted = parseFloat(ethers.formatUnits(rawPrice, 18));
    if (!Number.isNaN(formatted) && formatted > 0) {
      priceCache.primePrices({ tokenPrice: formatted });
      return formatted;
    }
  } catch (error) {
    console.warn('Unable to refresh token price', error);
  }
  return lastKnownTokenPrice.value;
}

async function ensurePriceSnapshot({ force = false } = {}) {
  const snapshot = await priceCache.ensurePriceSnapshot({ force });
  if (Number.isFinite(snapshot.ethUsdPrice) && snapshot.ethUsdPrice > 0) {
    lastKnownEthUsdPrice.value = snapshot.ethUsdPrice;
  }
  if (Number.isFinite(snapshot.tokenPrice) && snapshot.tokenPrice > 0) {
    lastKnownTokenPrice.value = snapshot.tokenPrice;
  }
  return snapshot;
}

async function getEthUsdPriceForAnalytics() {
  const snapshot = await ensurePriceSnapshot();
  return snapshot.ethUsdPrice;
}

async function fetchPresaleContractAddress() {
  const registryContract = getRegistryContract(CONTRACT_REGISTRY_ADDRESS, readProvider);
  if (!registryContract) {
    throw new Error('Presale buy: registry contract could not be created.');
  }
  const resolvedAddress = await registryContract.getContractAddress(`${TOKEN_TICKER}-PRESALE`);
  if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
    throw new Error(`Presale buy: contract address missing for token "${TOKEN_TICKER}".`);
  }
  presaleContractAddress = resolvedAddress;
}

async function getTotalUsdRaised() {
  const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
  if (!presaleContract) return;
  totalUsdRaisedRaw.value = await presaleContract.getTotalUsdRaised();
}

async function getTotalPurchasedTokens() {
  const provider = await ensureWriteProvider();
  if (!provider) return;
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) return;

  const signer = await provider.getSigner();
  const wallet = await signer.getAddress();
  const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
  if (!presaleContract) return;
  const totalTokensPurchased = await presaleContract.getTotalTokensPurchased(wallet);
  purchasedTokensRaw.value = parseFloat(ethers.formatUnits(totalTokensPurchased.toString(), 18));
  await refreshPersonalStakeSummary();
}

async function refreshPersonalStakeSummary({ rewardsOnly = false } = {}) {
  if (!presaleContractAddress) return;
  const provider = await ensureWriteProvider();
  if (!provider) {
    if (!rewardsOnly) {
      resetPersonalStatus();
    }
    return;
  }
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    if (!rewardsOnly) {
      resetPersonalStatus();
    }
    return;
  }

  if (rewardsOnly) {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
      if (!presaleContract) return;
      const rewardTokens = await presaleContract.getStakedTokenYield(address);
      const rewards = Number.parseFloat(ethers.formatUnits(rewardTokens, 18));
      personalRewardsRaw.value = Number.isFinite(rewards) && rewards > 0 ? rewards : 0;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Unable to refresh personal rewards summary', error);
      }
    }
    return;
  }

  personalSummaryReady.value = false;
  try {
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
    if (!presaleContract) {
      personalRewardsRaw.value = 0;
      personalSummaryReady.value = false;
      return;
    }
    const [stakedTokens, availableTokens, rewardTokens] = await Promise.all([
      presaleContract.getTotalStakedTokens(address),
      presaleContract.getPurchasedTokens(address),
      presaleContract.getStakedTokenYield(address),
    ]);
    const staked = Number.parseFloat(ethers.formatUnits(stakedTokens, 18));
    const available = Number.parseFloat(ethers.formatUnits(availableTokens, 18));
    const rewards = Number.parseFloat(ethers.formatUnits(rewardTokens, 18));
    personalStakedRaw.value = Number.isFinite(staked) && staked > 0 ? staked : 0;
    personalUnstakedRaw.value = Number.isFinite(available) && available > 0 ? available : 0;
    personalRewardsRaw.value = Number.isFinite(rewards) && rewards > 0 ? rewards : 0;
    personalSummaryReady.value = true;
  } catch (error) {
    console.warn('Unable to refresh personal stake summary', error);
    personalRewardsRaw.value = 0;
    personalSummaryReady.value = false;
  }
}

async function loadEthFromWallet() {
  const asset = selectedPaymentAsset.value;
  if (!asset) return;
  const assetSymbol = asset?.symbol || 'ETH';
  const provider = await ensureWriteProvider();
  if (!provider) {
    connectionError.value = 'Connect your wallet first to pull your balance.';
    return;
  }
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) return;

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  if (asset.type === 'native') {
    const balanceValue = await provider.getBalance(address);
    const totalEth = parseFloat(ethers.formatEther(balanceValue));
    walletBalanceEth.value = totalEth;
    const ethToSpend = totalEth - MIN_GAS_BUFFER;
    ethBalance.value = (ethToSpend > 0 ? ethToSpend : 0).toFixed(6);

    trackEvent('presale_max_eth_clicked', {
      token: TOKEN_TICKER || 'unknown',
      outcome: 'prefill',
      wallet_balance_eth: Number(totalEth.toFixed(6)),
      spend_eth: parseFloat(ethBalance.value),
      spend_currency: assetSymbol,
    });
  } else {
    const tokenContract = new ethers.Contract(asset.address, TOKEN_ABI, provider);
    const balanceValue = await tokenContract.balanceOf(address);
    const totalStable = parseFloat(ethers.formatUnits(balanceValue, asset.decimals));
    walletStableBalances[asset.symbol] = totalStable;
    ethBalance.value = totalStable > 0 ? totalStable.toFixed(Math.min(asset.decimals, 6)) : '0';
    trackEvent('presale_max_eth_clicked', {
      token: TOKEN_TICKER || 'unknown',
      outcome: 'prefill',
      wallet_balance_asset: Number(totalStable.toFixed(Math.min(asset.decimals, 6))),
      spend_asset: parseFloat(ethBalance.value),
      asset_symbol: asset.symbol,
      spend_currency: assetSymbol,
    });
  }
}

async function refreshWalletBalances() {
  if (isRefreshingWalletBalances) return;
  isRefreshingWalletBalances = true;
  try {
    const provider = await ensureWriteProvider();
    if (!provider) return;
    const accounts = await provider.listAccounts();
    if (!accounts || accounts.length === 0) return;

    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const snapshot = await collectWalletBalanceSnapshot({
      paymentAssets: paymentAssetOptions,
      minGasBuffer: MIN_GAS_BUFFER,
      readNativeBalance: async () => {
        const balanceValue = await provider.getBalance(address);
        return parseFloat(ethers.formatEther(balanceValue));
      },
      readTokenBalance: async (asset) => {
        const tokenContract = new ethers.Contract(asset.address, TOKEN_ABI, provider);
        const balance = await tokenContract.balanceOf(address);
        return parseFloat(ethers.formatUnits(balance, asset.decimals));
      },
      onTokenBalanceError: (asset, error) => {
        if (import.meta.env.DEV) {
          console.warn(`Unable to refresh ${asset?.symbol || 'unknown'} balance`, error);
        }
      },
    });

    walletBalanceEth.value = snapshot.walletBalanceEth;
    paymentAssetOptions
      .filter((asset) => asset.symbol !== 'ETH')
      .forEach((asset) => {
        walletStableBalances[asset.symbol] = snapshot.walletStableBalances[asset.symbol] || 0;
      });

    autoSelectPaymentAsset();

    if (!initializedEthFromWallet.value && (!ethBalance.value || !ethBalance.value.trim())) {
      const asset = selectedPaymentAsset.value;
      let autofillValue = '';
      if (asset?.type === 'native') {
        const suggestedEth =
          snapshot.suggestedSpendMap.ETH !== undefined ? snapshot.suggestedSpendMap.ETH : 0;
        autofillValue = (suggestedEth > 0 ? suggestedEth : 0).toFixed(6);
      } else if (asset) {
        const balance = snapshot.suggestedSpendMap[asset.symbol] || 0;
        autofillValue = balance > 0 ? balance.toFixed(Math.min(asset.decimals, 6)) : '';
      }
      ethBalance.value = autofillValue;
      if (autofillValue) {
        lastAutoPrefillValue = autofillValue;
        lastAutoPrefillSymbol = asset?.symbol || null;
      } else {
        lastAutoPrefillValue = '';
        lastAutoPrefillSymbol = asset?.symbol || null;
      }
      initializedEthFromWallet.value = true;
    }

    await refreshPersonalStakeSummary();
  } finally {
    isRefreshingWalletBalances = false;
  }
}

async function updateTokensReceive() {
  const { ethUsdPrice, tokenPrice } = await ensurePriceSnapshot();
  const amount = parseFloat((ethBalance.value || '').trim());
  const asset = selectedPaymentAsset.value;
  const usesEthPricing = asset?.type === 'native' || asset?.type === 'wrapped';
  const usdMultiplier = usesEthPricing ? ethUsdPrice : 1;
  if (!Number.isNaN(amount) && amount > 0 && tokenPrice && usdMultiplier) {
    const tokens = (amount * usdMultiplier) / tokenPrice;
    tokensReceive.value = tokens.toFixed(2);
  } else {
    tokensReceive.value = '';
  }
}

async function updateEthBalanceFromTokens() {
  if (activeInput.value === 'eth') return;
  const { ethUsdPrice, tokenPrice } = await ensurePriceSnapshot();
  const tokenAmount = parseFloat((tokensReceive.value || '').trim());
  const asset = selectedPaymentAsset.value;
  const usesEthPricing = asset?.type === 'native' || asset?.type === 'wrapped';
  const usdDivisor = usesEthPricing ? ethUsdPrice : 1;
  if (!Number.isNaN(tokenAmount) && tokenAmount > 0 && tokenPrice && usdDivisor) {
    const requiredUsd = tokenAmount * tokenPrice;
    const requiredSpend = usesEthPricing ? requiredUsd / usdDivisor : requiredUsd;
    const decimals = usesEthPricing ? 6 : Math.min(asset?.decimals || 6, 6);
    ethBalance.value = requiredSpend.toFixed(decimals);
  } else if (!tokensReceive.value) {
    ethBalance.value = '';
  }
}

async function fetchStakingApyForToggle() {
  if (!presaleContractAddress || !readProvider) return;
  try {
    const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
    if (!presaleContract) return;
    const currentApy = await presaleContract.getAPY();
    const numericApy = Number(currentApy);
    if (!Number.isFinite(numericApy)) {
      stakingApyDisplay.value = '';
      return;
    }
    let percentValue = numericApy;
    if (percentValue > 1000) {
      percentValue = percentValue / 100;
    }
    const assumeFraction = percentValue > 0 && percentValue < 1;
    const formattedPercent = formatPercent(percentValue, {
      maximumFractionDigits: percentValue >= 100 ? 0 : 1,
      assumeFraction,
    });
    stakingApyDisplay.value = formattedPercent ? `${formattedPercent} APY` : '';
  } catch (error) {
    console.warn('Unable to fetch staking APY for toggle', error);
    stakingApyDisplay.value = '';
  }
}

async function refreshPresaleData() {
  if (!presaleContractAddress || !readProvider) return;
  await Promise.all([
    checkPresaleStatus(),
    getTotalUsdRaised(),
    getTotalPurchasedTokens(),
    refreshWalletBalances(),
    fetchEthUsdFromContract(),
    fetchTokenPriceFromContract(),
    updateFomoProgress(),
    fetchStakingApyForToggle(),
  ]);
  let usdRaisedValue = Number.parseFloat(
    ethers.formatUnits(totalUsdRaisedRaw.value || 0n, 18)
  );
  if (!Number.isFinite(usdRaisedValue) || usdRaisedValue < 0) {
    usdRaisedValue = 0;
  }
  const usdRaisedFormatted = formatUsd(usdRaisedValue, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  syncPresalePulse({
    totalUsdRaised: usdRaisedValue,
    totalUsdRaisedFormatted: usdRaisedFormatted,
    isHydrated: true,
  });
}

// Wire late-bound dependencies into the transaction composable
buyTransactionOptions.telegramLink = telegramLink;
buyTransactionOptions.setActivePresaleTab = setActivePresaleTab;
buyTransactionOptions.markHowItWorksComplete = markHowItWorksComplete;
buyTransactionOptions.refreshPresaleData = refreshPresaleData;

async function checkPresaleStatus() {
  const presaleContract = getPresaleReadContract(presaleContractAddress, readProvider);
  if (!presaleContract) return;
  const presaleFlag = await presaleContract.getPresaleFlag();
  showPurchaseControls.value = presaleFlag;
  syncPresalePulse({ isLive: Boolean(presaleFlag) });
}

async function ensureStableAllowance(asset, signer, requiredAmount) {
  if (!asset?.address) return;
  if (!requiredAmount || requiredAmount <= 0n) return;
  const owner = await signer.getAddress();
  const tokenContract = new ethers.Contract(asset.address, TOKEN_ABI, signer);
  const allowance = await tokenContract.allowance(owner, presaleContractAddress);
  if (allowance >= requiredAmount) return;

  showFormAlert({
    type: 'info',
    title: `Approve ${asset.symbol}`,
    message: `Approve ${asset.symbol} in your wallet so we can complete the presale purchase.`,
    code: 'stable-approval',
    dismissible: false,
  });

  try {
    if (allowance > 0n) {
      const resetTx = await tokenContract.approve(presaleContractAddress, 0);
      await resetTx.wait();
    }
    const tx = await tokenContract.approve(presaleContractAddress, requiredAmount);
    await tx.wait();
  } finally {
    clearFormAlert('stable-approval');
  }
}

const PURCHASE_VARIANTS = {
  buy: {
    flow: 'buy',
    interaction: 'buy',
    invalidMessage: (symbol) => `Enter a valid ${symbol} amount to buy tokens.`,
    blockedEvent: 'presale_buy_blocked',
    attemptEvent: 'presale_buy_attempt',
    successEvent: 'presale_buy_success',
    errorEvent: 'presale_buy_error',
    includeStakeEvents: false,
    executeContractMethod: (contract, { isNative, parsedAmount, asset }) =>
      isNative ? contract.buyTokens({ value: parsedAmount }) : contract.buyWithStable(asset.address, parsedAmount),
  },
  buy_and_stake: {
    flow: 'buy_and_stake',
    interaction: 'buy_and_stake',
    invalidMessage: (symbol) => `Enter a valid ${symbol} amount to buy and stake tokens.`,
    blockedEvent: 'presale_buy_and_stake_blocked',
    attemptEvent: 'presale_buy_and_stake_attempt',
    successEvent: 'presale_buy_and_stake_success',
    errorEvent: 'presale_buy_and_stake_error',
    includeStakeEvents: true,
    stakeType: 'auto_buy_and_stake',
    executeContractMethod: (contract, { isNative, parsedAmount, asset }) =>
      isNative
        ? contract.buyAndStakeTokens({ value: parsedAmount })
        : contract.buyAndStakeWithStable(asset.address, parsedAmount),
  },
};

async function runPurchaseFlow(mode) {
  const config = PURCHASE_VARIANTS[mode];
  if (!config) {
    throw new Error(`Unknown purchase mode: ${mode}`);
  }
  if (transactionState.value !== 'idle') {
    resetTransactionState();
  }
  if (!(await ensureWalletReady())) return;

  if (formAlert.value && !['insufficient-funds', 'network-mismatch'].includes(formAlert.value.code)) {
    clearFormAlert();
  }

  const asset = selectedPaymentAsset.value;
  const assetSymbol = asset?.symbol || 'ETH';
  const isNative = asset?.type === 'native';
  const trimmedValue = (ethBalance.value || '').trim();
  const spendAmount = parseFloat(trimmedValue);
  const tokenAmount = parseFloat(tokensReceive.value || '0');

  if (!trimmedValue || Number.isNaN(spendAmount) || spendAmount <= 0) {
    showFormAlert({
      type: 'error',
      title: 'Amount required',
      message: config.invalidMessage(assetSymbol),
      code: 'invalid-amount',
    });
    trackEvent(config.blockedEvent, {
      token: TOKEN_TICKER || 'unknown',
      reason: 'invalid_amount',
      spend_currency: assetSymbol,
    });
    return;
  }

  let funnelPayload;
  let purchaseEventPayload;
  let stakeEventPayload;
  try {
    const provider = await ensureWriteProvider();
    const signer = await provider.getSigner();
    const presaleContract = getPresaleWriteContract(presaleContractAddress, signer);
    if (!presaleContract) {
      showFormAlert({
        type: 'error',
        title: 'Contract unavailable',
        message: 'The presale contract is unavailable right now. Refresh the page and try again.',
        code: 'presale-contract-missing',
      });
      return;
    }

    const parsedAmount = isNative
      ? ethers.parseEther(trimmedValue)
      : ethers.parseUnits(trimmedValue, asset.decimals);

    if (!isNative) {
      await ensureStableAllowance(asset, signer, parsedAmount);
    }

    funnelPayload = await buildPurchaseAnalyticsPayload({
      flow: config.flow,
      spendAmount,
      tokenAmount,
      asset,
      tokenTicker: TOKEN_TICKER || 'unknown',
      getEthUsdPrice: getEthUsdPriceForAnalytics,
    });
    purchaseEventPayload = {
      ...funnelPayload,
      interaction: config.interaction,
      spend_currency: assetSymbol,
    };
    if (config.includeStakeEvents) {
      stakeEventPayload = {
        ...funnelPayload,
        interaction: config.interaction,
        stake_type: config.stakeType,
        spend_currency: assetSymbol,
      };
    }

    trackFunnelEvent('purchase_initiated', { ...purchaseEventPayload });
    trackFunnelEvent('purchase_attempt', {
      ...funnelPayload,
      interaction: config.interaction,
    });
    if (config.includeStakeEvents) {
      trackFunnelEvent('stake_initiated', { ...stakeEventPayload });
    }

    trackEvent(config.attemptEvent, {
      token: TOKEN_TICKER || 'unknown',
      amount_asset: spendAmount,
      spend_currency: assetSymbol,
      ...(isNative ? { amount_eth: spendAmount } : {}),
    });

    const tx = await config.executeContractMethod(presaleContract, {
      isNative,
      parsedAmount,
      asset,
    });
    setTransactionPending({
      hash: tx?.hash,
      spend: spendAmount,
      asset,
      tokens: tokenAmount,
      interaction: config.interaction,
    });

    trackEvent('presale_transaction_submitted', {
      token: TOKEN_TICKER || 'unknown',
      type: config.interaction,
      amount_asset: spendAmount,
      spend_currency: assetSymbol,
      ...(isNative ? { amount_eth: spendAmount } : {}),
      tx_hash: tx?.hash || 'unknown',
    });

    const receipt = await tx.wait();
    const transactionHash = receipt?.transactionHash || tx?.hash || 'unknown';

    trackEvent(config.successEvent, {
      token: TOKEN_TICKER || 'unknown',
      amount_asset: spendAmount,
      spend_currency: assetSymbol,
      ...(isNative ? { amount_eth: spendAmount } : {}),
      tx_hash: transactionHash,
    });

    trackFunnelEvent('purchase_success', {
      ...funnelPayload,
      interaction: config.interaction,
      transaction_hash: transactionHash,
    });
    trackFunnelEvent('purchase_completed', {
      ...purchaseEventPayload,
      transaction_hash: transactionHash,
    });
    if (config.includeStakeEvents) {
      trackFunnelEvent('stake_success', {
        ...funnelPayload,
        stake_type: config.stakeType,
        transaction_hash: transactionHash,
      });
      trackFunnelEvent('stake_completed', {
        ...stakeEventPayload,
        transaction_hash: transactionHash,
      });
    }

    setTransactionSuccess({
      hash: transactionHash,
      spend: spendAmount,
      asset,
      tokens: tokenAmount,
      type: config.interaction,
    });

    clearAmountInputsForAutoPrefill();
    await refreshPresaleData();
    restoreLatestAutoPrefill();
    window.dispatchEvent(new CustomEvent('refreshStakeData'));
  } catch (error) {
    console.error(`Failed to ${config.interaction.replace(/_/g, ' ')} tokens`, error);
    const resolved = resolveError(error);

    if (resolved.code === 'tx_rejected') {
      showFormAlert({
        type: 'info',
        title: 'Transaction cancelled',
        message: resolved.message,
        code: 'tx-rejected',
      });
      if (purchaseEventPayload) {
        trackFunnelEvent('purchase_failed', {
          ...purchaseEventPayload,
          reason: 'rejected_by_user',
        });
      }
      trackEvent('error_tx_rejected', {
        token: TOKEN_TICKER || 'unknown',
        interaction: config.interaction,
      });
      return;
    }

    if (resolved.code === 'insufficient_funds') {
      showFormAlert({
        type: 'error',
        title: isNative ? 'Insufficient ETH' : `Insufficient ${assetSymbol}`,
        message: resolved.message,
        code: 'insufficient-funds',
      });
      if (!hasTrackedInsufficientFunds.value) {
        const walletEthNumeric = Number.isFinite(walletBalanceEth.value) ? walletBalanceEth.value : 0;
        trackEvent('error_insufficient_funds', {
          token: TOKEN_TICKER || 'unknown',
          interaction: 'buy_and_stake',
          entered_amount_asset: spendAmount,
          wallet_balance_asset: currentWalletBalance.value,
          spend_currency: assetSymbol,
          ...(isNative
            ? {
                entered_amount_eth: spendAmount,
                wallet_balance_eth: walletEthNumeric,
              }
            : {}),
        });
        hasTrackedInsufficientFunds.value = true;
      }
      if (purchaseEventPayload) {
        trackFunnelEvent('purchase_failed', {
          ...purchaseEventPayload,
          reason: 'insufficient_funds',
        });
      }
      return;
    }

    if (resolved.code === 'wrong_network') {
      networkMismatch.value = true;
      showFormAlert({
        type: 'warning',
        title: 'Wrong network',
        message: resolved.message,
        code: 'network-mismatch',
        dismissible: false,
      });
      if (purchaseEventPayload) {
        trackFunnelEvent('purchase_failed', {
          ...purchaseEventPayload,
          reason: 'wrong_network',
        });
      }
      return;
    }

    setTransactionError(resolved);

    if (!funnelPayload) {
      funnelPayload = await buildPurchaseAnalyticsPayload({
        flow: config.flow,
        spendAmount,
        tokenAmount,
        asset,
        tokenTicker: TOKEN_TICKER || 'unknown',
        getEthUsdPrice: getEthUsdPriceForAnalytics,
      });
    }
    if (!purchaseEventPayload) {
      purchaseEventPayload = {
        ...funnelPayload,
        interaction: config.interaction,
        spend_currency: assetSymbol,
      };
    }
    if (config.includeStakeEvents && !stakeEventPayload) {
      stakeEventPayload = {
        ...funnelPayload,
        interaction: config.interaction,
        stake_type: config.stakeType,
        spend_currency: assetSymbol,
      };
    }
    trackFunnelEvent('purchase_failed', {
      ...purchaseEventPayload,
      reason: 'error',
      error_code: error?.code || 'unknown',
      error_name: error?.name || 'unknown',
    });
    trackFunnelEvent('purchase_error', {
      ...funnelPayload,
      interaction: config.interaction,
      error_code: error?.code || 'unknown',
      error_name: error?.name || 'unknown',
    });

    trackEvent(config.errorEvent, {
      token: TOKEN_TICKER || 'unknown',
      amount_asset: spendAmount,
      spend_currency: assetSymbol,
      ...(isNative ? { amount_eth: spendAmount } : {}),
      error_code: error?.code || 'unknown',
      error_name: error?.name || 'unknown',
    });
  }
}

async function buyAndStakeTokens() {
  await runPurchaseFlow('buy_and_stake');
}

async function buyTokens() {
  await runPurchaseFlow('buy');
}

async function submitPurchase() {
  if (stakeAfterPurchase.value) {
    await buyAndStakeTokens();
  } else {
    await buyTokens();
  }
}

function handleStakePreferenceChange() {
  if (!stakePreferenceInitialized.value) return;
  if (stakeToggleDisabled.value) return;

  trackEvent('presale_stake_preference_changed', {
    token: TOKEN_TICKER || 'unknown',
    stake_after_purchase: stakeAfterPurchase.value ? 'enabled' : 'disabled',
  });
}

watch(
  () => pageContent.value,
  (content) => {
    const presaleContent = content?.presale || {};
    applyOnboardingConfig(presaleContent.onboarding || {});

    const tokenLabel = tokenSymbol.value;
    ethSpend.value = presaleContent.ethSpend || 'ETH to Spend';
    balance.value = presaleContent.balance || 'Your ETH Balance';
    const youReceiveRaw = sanitizeText(presaleContent.youReceive);
    youReceive.value = youReceiveRaw || 'You Will Receive';
    connectHeadline.value =
      sanitizeText(presaleContent.connectHeadline) || DEFAULT_CONNECT_HEADLINE;
    connectPrompt.value =
      sanitizeText(presaleContent.connectPrompt) ||
      DEFAULT_CONNECT_PROMPT;
    quickConnectorOptions.value = normalizeConnectorOptions(
      presaleContent.walletConnectors ??
        presaleContent.connectors ??
        presaleContent.supportedWallets
    );
    const buyOnlyLabel =
      sanitizeText(presaleContent.buy) ||
      sanitizeText(presaleContent.onlyBuy) ||
      (tokenLabel ? `Buy ${tokenLabel}` : 'Buy');
    buyCta.value = buyOnlyLabel;
    const stakeToggleLabel =
      sanitizeText(presaleContent.stakeAfterToggle) ||
      sanitizeText(presaleContent.stakeAfterPurchase) ||
      (tokenLabel ? `Stake ${tokenLabel} after purchase` : 'Stake after purchase');
    stakeAfterBaseLabel.value = stakeToggleLabel || DEFAULT_STAKE_AFTER_LABEL;
    if (!stakePreferenceInitialized.value) {
      const defaultStakePreference =
        presaleContent.defaultStakeAfterPurchase !== undefined
          ? Boolean(presaleContent.defaultStakeAfterPurchase)
          : true;
      stakeAfterPurchase.value = defaultStakePreference;
      stakePreferenceInitialized.value = true;
    }

    applyFomoConfig(content?.progressFomo || {});

    const needEthRaw = presaleContent.needEth || {};
    const normalizedLinks = Array.isArray(needEthRaw.links)
      ? needEthRaw.links
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const href =
              typeof entry.href === 'string' && entry.href.trim()
                ? entry.href.trim()
                : '';
            if (!href) return null;
            const label =
              typeof entry.label === 'string' && entry.label.trim()
                ? entry.label.trim()
                : href;
            return { label, href };
          })
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const fallbackLinkUrl =
      typeof needEthRaw.url === 'string' && needEthRaw.url.trim()
        ? needEthRaw.url.trim()
        : DEFAULT_NEED_ETH_LINK;
    const fallbackLinkLabel =
      typeof needEthRaw.label === 'string' && needEthRaw.label.trim()
        ? needEthRaw.label.trim()
        : 'Buy ETH on Coinbase';

    needEthHelp.title =
      typeof needEthRaw.title === 'string' && needEthRaw.title.trim()
        ? needEthRaw.title.trim()
        : DEFAULT_NEED_ETH_LABEL;
    needEthHelp.description =
      typeof needEthRaw.description === 'string' && needEthRaw.description.trim()
        ? needEthRaw.description.trim()
        : 'Use a trusted on-ramp to purchase ETH and send it to the wallet you connect here.';
    needEthHelp.note =
      typeof needEthRaw.note === 'string' && needEthRaw.note.trim()
        ? needEthRaw.note.trim()
        : 'Once your wallet is funded, return here to complete the presale.';
    needEthHelp.links = normalizedLinks.length
      ? normalizedLinks
      : [
          {
            label: fallbackLinkLabel,
            href: fallbackLinkUrl,
          },
        ];

    const secondaryRaw = presaleContent.secondaryCtas || {};
    secondaryCtaDescription.value =
      typeof secondaryRaw.description === 'string' ? secondaryRaw.description.trim() : '';
    secondaryLinks.value = Array.isArray(secondaryRaw.links)
      ? secondaryRaw.links
          .map((entry, index) => buildLinkEntry(entry, index))
          .filter((entry) => Boolean(entry))
      : [];

    const emailRaw = secondaryRaw.emailSignup || {};
    const endpoint =
      typeof emailRaw.endpoint === 'string' && emailRaw.endpoint.trim()
        ? emailRaw.endpoint.trim()
        : '';
    const enabled =
      Boolean(endpoint) &&
      (emailRaw.enabled === undefined ? true : Boolean(emailRaw.enabled));

    Object.assign(emailSettings, {
      enabled,
      endpoint,
      method:
        typeof emailRaw.method === 'string' && emailRaw.method.trim()
          ? emailRaw.method.trim().toUpperCase()
          : 'POST',
      placeholder:
        typeof emailRaw.placeholder === 'string' && emailRaw.placeholder.trim()
          ? emailRaw.placeholder.trim()
          : 'you@example.com',
      buttonText:
        typeof emailRaw.button === 'string' && emailRaw.button.trim()
          ? emailRaw.button.trim()
          : 'Get updates',
      successMessage:
        typeof emailRaw.successMessage === 'string' && emailRaw.successMessage.trim()
          ? emailRaw.successMessage.trim()
          : 'Thanks! Check your inbox shortly.',
      errorMessage:
        typeof emailRaw.errorMessage === 'string' && emailRaw.errorMessage.trim()
          ? emailRaw.errorMessage.trim()
          : 'We could not submit your email. Try again.',
      description:
        typeof emailRaw.description === 'string' && emailRaw.description.trim()
          ? emailRaw.description.trim()
          : '',
      label:
        typeof emailRaw.label === 'string' && emailRaw.label.trim()
          ? emailRaw.label.trim()
          : 'Email address',
      headers:
        emailRaw.headers && typeof emailRaw.headers === 'object'
          ? { ...emailRaw.headers }
          : null,
      extraFields:
        emailRaw.extraFields && typeof emailRaw.extraFields === 'object'
          ? { ...emailRaw.extraFields }
          : null,
      payloadFieldName:
        typeof emailRaw.payloadFieldName === 'string' && emailRaw.payloadFieldName.trim()
          ? emailRaw.payloadFieldName.trim()
          : 'email',
      submittingLabel:
        typeof emailRaw.submittingLabel === 'string' && emailRaw.submittingLabel.trim()
          ? emailRaw.submittingLabel.trim()
          : DEFAULT_EMAIL_SUBMITTING_LABEL,
    });

    emailStatus.value = 'idle';
    emailErrorMessage.value = '';
    emailSuccessMessage.value = '';
    if (!emailSettings.enabled) {
      emailValue.value = '';
    }

    applyBonusConfig(presaleContent.bonusIncentive || {});
    reevaluateOnboarding('config_update');
  },
  { immediate: true }
);

watch(
  () => ({
    enabled: onboardingEnabled.value,
    seen: onboardingHasSeen.value,
    connected: isWalletConnected.value,
    controls: showPurchaseControls.value,
    state: transactionState.value,
    mobile: isMobileViewport.value,
    skipMobile: onboardingSkipOnMobile.value,
    activity: hasPersonalPresaleActivity.value,
  }),
  () => {
    reevaluateOnboarding('state_change');
  },
  { immediate: true }
);

watch(ethBalance, (value) => {
  if (activeInput.value !== 'token') {
    debounceUpdateTokensReceive();
  }
  const parsed = parseFloat(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    dismissOnboarding('amount_entered');
  }
});

watch(tokensReceive, (value) => {
  if (activeInput.value === 'token') {
    debounceUpdateEthBalanceFromTokens();
  }
  const parsed = parseFloat((value || '').trim());
  if (Number.isFinite(parsed) && parsed > 0) {
    dismissOnboarding('amount_entered');
  }
});

watch(isAssetPickerOpen, (open) => {
  if (typeof window === 'undefined') return;
  if (open) {
    window.addEventListener('keydown', onAssetPickerKeydown);
    focusAssetPickerFirstOption();
  } else {
    window.removeEventListener('keydown', onAssetPickerKeydown);
  }
});

watch(isTransactionPending, (pending) => {
  if (pending) {
    closeAssetPicker('pending');
  }
});

watch(selectedPaymentSymbol, () => {
  if (isAssetPickerOpen.value) {
    closeAssetPicker('selection');
  }
  resetFormForSelectedAsset();
  if (isAutoSelectingPaymentAsset) {
    isAutoSelectingPaymentAsset = false;
  }
  if (isWalletConnected.value) {
    refreshWalletBalances();
  }
});

watch(transactionState, (state) => {
  if (state === 'pending') {
    dismissOnboarding('transaction_pending');
  } else if (state === 'success') {
    dismissOnboarding('transaction_success');
  }
});


watch(isWalletConnected, (connected) => {
  if (connected) {
    dismissOnboarding('wallet_connected');
    refreshPersonalStakeSummary();
    markHowItWorksComplete();
    if (isMobileViewport.value) {
      nextTick(() => scrollBuySectionToTop());
    }
  } else {
    resetPersonalStatus();
    clearFormAlert('wallet-not-connected');
    clearFormAlert('wallet-connect-error');
  }
});

watch(
  walletReadyForSummary,
  (ready) => {
    if (ready) {
      startPersonalSummaryRefreshLoop();
    } else {
      stopPersonalSummaryRefreshLoop();
    }
  },
  { immediate: true }
);

watch(howItWorksEnabled, (enabled) => {
  if (!enabled) {
    showHowItWorksCard.value = false;
  }
});

watch(needEthEnabled, (enabled) => {
  if (!enabled) {
    needEthModalOpen.value = false;
  }
});

watch(purchasedTokensRaw, () => {
  if (isWalletConnected.value) {
    refreshPersonalStakeSummary();
  }
});

watch(needEthModalOpen, (open) => {
  if (!needEthEnabled.value) return;
  if (!open) return;
  nextTick(() => {
    needEthModalContent.value?.focus();
  });
});

onMounted(async () => {
  loadHowItWorksPreference();
  initOnboardingOnMount();

  if (!TOKEN_TICKER || !TOKEN_TICKER.trim()) {
    throw new Error('Presale buy: VITE_TOKEN is not configured.');
  }
  if (!CONTRACT_REGISTRY_ADDRESS || !CONTRACT_REGISTRY_ADDRESS.trim()) {
    throw new Error('Presale buy: VITE_REGISTRY_ADDRESS is not configured.');
  }
  if (!RPC_READ || !RPC_READ.trim()) {
    throw new Error('Presale buy: VITE_RPC_READ is not configured.');
  }

  readProvider = new ethers.JsonRpcProvider(RPC_READ);
  await fetchPresaleContractAddress();
  await initializeWalletProvider({ refreshBalances: true });
  await refreshPresaleData();
  await restorePendingTransactionFromStorage();

  if (typeof window !== 'undefined') {
    if (needEthEnabled.value) {
      window.addEventListener('keydown', handleGlobalKeydown);
      registerCleanup(() => window.removeEventListener('keydown', handleGlobalKeydown));
    }
    window.addEventListener('refreshStakeData', refreshPersonalStakeSummary);
    window.addEventListener('refreshStakeData', fetchStakingApyForToggle);

    startLiveMetrics();

    registerCleanup(() => {
      stopLiveMetrics();
    });

    registerCleanup(() => window.removeEventListener('refreshStakeData', refreshPersonalStakeSummary));
    registerCleanup(() => window.removeEventListener('refreshStakeData', fetchStakingApyForToggle));
    registerCleanup(() => window.removeEventListener('keydown', onAssetPickerKeydown));
    registerCleanup(() => stopPersonalSummaryRefreshLoop());
  }

  registerCleanup(() => detachOnboardingViewportListener());
  registerCleanup(() => cancelOnboardingTimer());
  registerCleanup(() => detachWalletListeners());
});

onUnmounted(() => {
  cleanupFns.splice(0).forEach((fn) => {
    try {
      fn();
    } catch (error) {}
  });
  detachWalletListeners();
  stopPendingTimer();
});

const TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];
</script>

<style scoped>
.buy-layout {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-24);
  align-items: stretch;
  height: 100%;
  width: 100%;
  flex-wrap: wrap;
  scroll-margin-top: clamp(72px, 12vh, 120px);
}

.buy-group {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-12);
  padding: var(--ui-space-12) 0;
  position: relative;
}

.buy-group:first-of-type {
  padding-top: 0;
}

.buy-group:last-of-type {
  padding-bottom: 0;
}

.buy-group + .buy-group {
  margin-top: var(--ui-space-16);
  padding-top: calc(var(--ui-space-16) + var(--ui-space-8));
}

.buy-group + .buy-group::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in srgb, var(--brand-fg-100) 12%, transparent);
  pointer-events: none;
}

.buy-group__label {
  margin: 0;
}

.form-notice-slot {
  min-height: 28px;
  display: flex;
  align-items: center;
  font-size: var(--ui-type-caption);
  color: var(--ui-text-muted, var(--brand-fg-300));
  font-family: var(--ui-font-body);
}

.form-notice-slot:empty {
  display: none;
}

.buy-widget {
  display: flex;
  justify-content: center;
  margin: 0 auto;
  order: 2;
}

.widget-card {
  width: 100%;
  max-width: 100%;
  color: var(--brand-fg-200);
  gap: var(--ui-space-24);
}

.widget-card--pending {
  filter: saturate(0.92);
}

.buy-pending-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 4vw, 40px);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--brand-modal-surface, rgba(9, 8, 15, 0.9)) 95%, transparent),
    color-mix(in srgb, var(--brand-bg-900, #120d1a) 92%, transparent)
  );
  border-radius: inherit;
  backdrop-filter: blur(8px);
  pointer-events: auto;
  text-align: center;
  z-index: 4;
}

.network-alert {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-space-16);
  padding: var(--ui-space-16);
  border-radius: var(--brand-radius-lg, 18px);
  border: 1px solid color-mix(in srgb, var(--brand-status-error, #d04f4f) 55%, transparent);
  background: var(--helper-strip-bg, var(--brand-modal-surface, rgba(20, 16, 30, 0.92)));
  color: var(--brand-fg-100, #1f2a44);
  box-shadow: var(--brand-modal-shadow, 0 18px 42px rgba(208, 79, 79, 0.12));
}

.network-alert__copy {
  display: grid;
  gap: var(--ui-space-8);
}

.network-alert__title {
  margin: 0;
  font-family: var(--ui-font-heading);
  font-size: clamp(0.95rem, 1.8vw, 1.05rem);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-status-error, #d04f4f) 60%, var(--brand-fg-100, #1f2a44) 40%);
}

.network-alert__message {
  margin: 0;
  font-family: var(--ui-font-body);
  font-size: clamp(0.85rem, 1.6vw, 0.95rem);
  color: var(--brand-fg-200);
}

.network-alert__button {
  align-self: center;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric, #4f6cf0) 45%, transparent);
  background: var(--helper-strip-hover-bg, color-mix(in srgb, var(--brand-accent-electric, #4f6cf0) 18%, rgba(255, 255, 255, 0.95)));
  color: var(--helper-strip-color, var(--brand-accent-electric, #4f6cf0));
  font-family: var(--ui-font-heading);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.18s ease, transform 0.18s ease;
}

.network-alert__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.network-alert__button:not(:disabled):hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.form-alert {
  margin-top: var(--ui-space-16);
}


.success-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483640;
}

.success-modal__backdrop {
  position: absolute;
  inset: 0;
  background: var(--brand-modal-backdrop, rgba(8, 7, 14, 0.78));
  backdrop-filter: blur(8px);
}

.success-modal__content {
  position: relative;
  max-width: clamp(320px, 90vw, 520px);
  width: 100%;
  margin: 0 18px;
  padding: clamp(28px, 5vw, 40px);
  border-radius: var(--brand-modal-radius, 28px);
  border: 1px solid var(--brand-modal-border, rgba(255, 255, 255, 0.08));
  background: var(--brand-modal-surface, rgba(20, 16, 30, 0.92));
  box-shadow: var(
    --brand-modal-shadow,
    0 28px 60px rgba(10, 8, 18, 0.65)
  );
  color: var(--brand-fg-100);
  display: grid;
  gap: clamp(16px, 3vw, 22px);
  text-align: center;
}

.success-modal__glow {
  position: absolute;
  inset: -25%;
  background: radial-gradient(
    50% 60% at 50% 20%,
    color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 32%, transparent),
    color-mix(in srgb, var(--brand-accent-secondary, #ff2d86) 18%, transparent),
    transparent 75%
  );
  filter: blur(20px);
  opacity: 0.9;
  pointer-events: none;
}

.success-modal__fireworks {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.success-modal__fireworks span {
  position: absolute;
  width: 6px;
  height: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(39, 243, 255, 0));
  top: 10%;
  left: 50%;
  transform-origin: center -20px;
  animation: successSpark 1.5s ease-out infinite;
}

.success-modal__fireworks span:nth-child(2) {
  transform: rotate(70deg);
  animation-delay: 0.18s;
}

.success-modal__fireworks span:nth-child(3) {
  transform: rotate(-65deg);
  animation-delay: 0.32s;
}

.success-modal__close {
  position: absolute;
  top: 14px;
  right: 16px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-size: 1.2rem;
  cursor: pointer;
}

.success-modal__eyebrow {
  margin: 0;
  font-size: clamp(0.68rem, 1.5vw, 0.78rem);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.58);
}

.success-modal__headline {
  margin: 0;
  font-family: var(--ui-font-heading);
  font-size: clamp(1.6rem, 4vw, 2.1rem);
  letter-spacing: 0.02em;
  color: var(--brand-fg-100);
}

.success-modal__copy {
  margin: 0;
  font-size: clamp(0.95rem, 2.1vw, 1.05rem);
  color: rgba(255, 255, 255, 0.68);
}

.success-modal__details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  padding: 14px 18px;
}

.success-modal__stat {
  display: grid;
  gap: 4px;
  margin: 0;
  font-size: 0.85rem;
}

.success-modal__stat-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
}

.success-modal__stat a {
  color: var(--brand-accent-electric, #27f3ff);
  text-decoration: underline;
  word-break: break-all;
}

.success-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.success-modal__cta {
  border: none;
  border-radius: 999px;
  padding: 14px 26px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-family: var(--ui-font-heading);
  font-size: 0.85rem;
  color: var(--brand-fg-100);
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--brand-accent-secondary, #ff6edc) 65%, transparent),
    color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 58%, transparent)
  );
  cursor: pointer;
  box-shadow: 0 12px 30px color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 2, 5%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.success-modal__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px color-mix(in srgb, var(--brand-accent-secondary, #ff2d86) 26%, transparent);
}

.success-modal__secondary {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.85rem;
  text-decoration: none;
}

.success-modal__secondary:hover {
  color: var(--brand-accent-electric, #27f3ff);
}

.success-modal__footer {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

@keyframes successSpark {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.6) rotate(0deg);
  }
  40% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-120px) scale(1.1) rotate(160deg);
  }
}

.buy-pending-overlay__content {
  display: grid;
  gap: var(--ui-space-16);
  justify-items: center;
  max-width: 420px;
}

.buy-pending-overlay__spinner {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 22%, transparent);
  border-top-color: var(--brand-accent-primary, #27f3ff);
  animation: pendingSpin 1s linear infinite;
  box-shadow: 0 0 18px color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 32%, transparent);
}

.buy-pending-overlay__headline {
  margin: 0;
  font-family: var(--ui-font-heading);
  font-weight: 600;
  font-size: clamp(1.1rem, 2.2vw, 1.4rem);
  color: var(--brand-fg-100);
}

.buy-pending-overlay__copy {
  margin: 0;
  font-family: var(--ui-font-body);
  font-size: clamp(0.9rem, 1.8vw, 1rem);
  color: var(--brand-fg-200);
}

.buy-pending-overlay__link {
  margin: 0;
  font-size: clamp(0.85rem, 1.6vw, 0.95rem);
}

.buy-pending-overlay__link a {
  color: var(--brand-accent-electric, #27f3ff);
  text-decoration: underline;
}

.purchase-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.purchase-primary__spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(39, 243, 255, 0.24);
  border-top-color: var(--brand-accent-electric, #27f3ff);
  animation: pendingSpin 0.9s linear infinite;
}

@keyframes pendingSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .buy-pending-overlay__spinner,
  .purchase-primary__spinner,
  .success-modal__fireworks span {
    animation: none;
  }
}


.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ui-space-16);
  margin-bottom: var(--ui-space-24);
}

.helper-strip {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--ui-space-16);
  background: var(--helper-strip-bg, rgba(154, 46, 255, 0.16));
  border: 1px solid var(--helper-strip-border, rgba(154, 46, 255, 0.45));
  border-radius: var(--brand-button-radius);
  padding: var(--ui-space-8);
}

.connect-block {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-12);
}

.connect-block__error {
  margin: 0;
  margin-top: var(--ui-space-4);
  font-size: var(--ui-type-caption);
  color: var(--brand-status-error, #d9164b);
  text-align: left;
  font-family: var(--ui-font-body);
}

@media (max-width: 640px) {
  .connect-block.connect-block--connected {
    display: none;
  }
}

.connect-banner {
  position: relative;
  border-radius: var(--brand-radius-lg, 24px);
  padding: clamp(18px, 3.2vw, 28px);
  background: color-mix(in srgb, var(--brand-surface-card-bg, rgba(10, 10, 13, 0.9)) 75%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 45%, transparent);
  box-shadow: 0 0 32px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 20%, transparent);
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vw, 20px);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.connect-banner--glow {
  border-color: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 80%, transparent);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 45%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 18%, transparent);
  background: color-mix(in srgb, var(--brand-surface-card-bg, rgba(10, 10, 13, 0.9)) 88%, var(--brand-accent-electric, #27f3ff) 12%);
}

.connect-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      140deg,
      color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 18%, transparent) 0%,
      transparent 65%
    ),
    radial-gradient(
      120% 120% at 10% 20%,
      color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 28%, transparent) 0%,
      transparent 75%
    );
  opacity: 0.45;
}

.connect-banner__copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(8px, 1.8vw, 16px);
  z-index: 1;
}

.connect-banner__lead {
  display: flex;
  align-items: center;
  gap: clamp(12px, 2.4vw, 20px);
  flex-wrap: wrap;
  z-index: 1;
}

.connect-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(48px, 6vw, 60px);
  height: clamp(48px, 6vw, 60px);
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f6cf0 0%, #243a80 100%);
  color: #ffffff;
  box-shadow: 0 0 26px rgba(79, 108, 240, 0.28);
}

.connect-banner__icon svg {
  width: 58%;
  height: 58%;
}

.connect-banner__headline {
  margin: 0;
  font-family: var(--ui-font-heading);
  font-size: clamp(1.05rem, 2.6vw, 1.25rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--brand-fg-100, #f0eaf3);
  flex: 1 1 0;
}

.connect-banner__prompt {
  margin: 0;
  text-align: left;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-fg-200, #c9bfd0) 80%, transparent);
}

.connect-banner__button {
  position: relative;
  width: 100%;
  min-height: 56px;
  gap: var(--ui-space-12);
  font-size: clamp(1.05rem, 2.4vw, 1.15rem);
  letter-spacing: 0.14em;
  animation: connectBannerPulse 3.6s ease-in-out infinite;
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 28%, transparent));
  z-index: 1;
}

.connect-banner__button-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.connect-banner__button-icon svg {
  width: 100%;
  height: 100%;
}

.connect-banner__button-label {
  white-space: nowrap;
}

@media (max-width: 480px) {
  .connect-banner__button-label {
    white-space: normal;
  }
}

.connect-banner__chips {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-8);
}

.connect-banner__chip {
  margin: 0;
}

.connect-banner__chip-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: var(--brand-button-radius, 14px);
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 32%, transparent);
  background: color-mix(in srgb, var(--brand-surface-card-bg, rgba(22, 18, 28, 0.92)) 65%, transparent);
  color: var(--brand-fg-100, #f0eaf3);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.connect-banner__chip-button:hover,
.connect-banner__chip-button:focus-visible {
  transform: translateY(-1px);
  border-color: var(--brand-accent-electric, #27f3ff);
  background: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 22%, transparent);
}

.connect-banner__chip-button:focus-visible {
  outline: 2px solid var(--brand-accent-electric, #27f3ff);
  outline-offset: 3px;
}

.connect-badge {
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric) 32%, transparent);
  background: color-mix(in srgb, var(--brand-bg-900) 82%, var(--brand-accent-electric) 18%);
  border-radius: var(--brand-radius-md);
  padding: var(--ui-space-16);
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-8);
}

.connect-badge__line {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-8);
  align-items: center;
  justify-content: space-between;
}

.connect-badge__status {
  display: inline-flex;
  align-items: center;
  gap: var(--ui-space-8);
  color: var(--brand-accent-electric, #27f3ff);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.connect-badge__value {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connect-badge__status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.connect-badge__status-icon svg {
  width: 100%;
  height: 100%;
}

.connect-badge__status-icon svg path {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.connect-badge__action {
  margin-left: auto;
  font-size: 13px;
}

.connect-badge--alert {
  border-color: color-mix(in srgb, var(--brand-status-error, #d04f4f) 55%, transparent);
  background: color-mix(in srgb, var(--brand-status-error, #d04f4f) 18%, transparent);
}

.connect-badge--alert .connect-badge__status,
.connect-badge--alert .connect-badge__status-icon {
  color: var(--brand-status-error, #d04f4f);
}

.helper-strip__button {
  border: 1px solid var(--helper-strip-border, var(--brand-surface-card-border));
  background: var(--helper-strip-bg, var(--brand-surface-helper-bg));
  color: var(--helper-strip-color, var(--brand-accent-electric));
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: var(--brand-button-radius);
  padding: var(--ui-space-8) var(--ui-space-16);
  cursor: pointer;
  transition: background 0.2s ease, border 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.helper-strip__button:hover,
.helper-strip__button:focus {
  border-color: var(--helper-strip-border, var(--brand-surface-card-border));
  color: var(--helper-strip-hover-color, var(--brand-accent-electric, #5d8cff));
  background: var(--helper-strip-hover-bg, var(--brand-surface-helper-hover-bg));
  transform: translateY(-1px);
}

.helper-strip__link {
  border: none;
  background: none;
  color: var(--helper-strip-color, var(--brand-accent-electric));
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
}

.helper-strip__link:hover,
.helper-strip__link:focus {
  color: var(--helper-strip-link-hover, var(--brand-accent-electric, #5d8cff));
  text-decoration: underline;
}

.helper-strip h1,
.helper-strip h2,
.helper-strip h3,
.helper-strip h4,
.helper-strip h5,
.helper-strip h6 {
  margin: 0;
  color: var(--helper-strip-heading-color, var(--brand-card-text));
}

.helper-strip p,
.helper-strip li,
.helper-strip span {
  color: var(--helper-strip-body-color, var(--brand-card-text));
}

.how-it-works {
  border: 1px solid var(--brand-surface-card-border);
  background: var(--brand-surface-card-bg);
  border-radius: var(--brand-card-radius);
  padding: var(--ui-space-16);
  margin-bottom: var(--ui-space-16);
  box-shadow: var(--brand-surface-card-shadow);
}

.how-it-works__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-16);
  margin-bottom: var(--ui-space-16);
}

.how-it-works__title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--brand-fg-300);
}

.how-it-works__actions {
  display: flex;
  align-items: center;
  gap: var(--ui-space-8);
}

.how-it-works__action {
  border: none;
  background: none;
  color: var(--brand-accent-electric);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
}

.how-it-works__action:hover,
.how-it-works__action:focus {
  color: var(--brand-accent-warm);
  text-decoration: underline;
}

.how-it-works__dismiss {
  border: none;
  background: color-mix(in srgb, var(--brand-bg-900) 78%, var(--brand-surface-card-border) 22%);
  color: var(--brand-fg-300);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
}

.how-it-works__dismiss:hover,
.how-it-works__dismiss:focus {
  background: var(--brand-surface-helper-hover-bg);
  color: var(--brand-fg-100);
}

.how-it-works__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--ui-space-16);
}

.how-it-works__step {
  display: flex;
  gap: var(--ui-space-16);
  align-items: flex-start;
}

.how-it-works__badge {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: var(
    --brand-pill-gradient,
    linear-gradient(135deg, rgba(154, 46, 255, 0.95) 0%, rgba(39, 243, 255, 0.95) 100%)
  );
  color: var(--brand-pill-contrast, var(--brand-fg-100, #f5f2fc));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 6px 14px rgba(9, 6, 14, 0.45);
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.how-it-works__step-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--brand-fg-100);
}

.how-it-works__step-text {
  margin: var(--ui-space-4) 0 0;
  font-size: 0.8rem;
  color: var(--brand-fg-200);
  line-height: 1.45;
}

.totals {
  text-align: left;
}

.totals-label {
  font-size: var(--ui-type-caption);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: 0;
  font-family: var(--ui-font-body);
  font-weight: 500;
  color: var(--brand-fg-300);
}

.totals-value {
  font-size: var(--ui-type-body);
  font-weight: 700;
  margin: var(--ui-space-4) 0 0;
  font-family: var(--ui-font-heading);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stepper {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--ui-space-24);
  width: 100%;
  grid-template-columns: minmax(0, 1fr);
}

.step {
  border: 1px solid var(--brand-surface-card-border);
  border-radius: 16px;
  padding: var(--ui-space-24);
  background: var(--brand-surface-card-bg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  position: relative;
  overflow: visible;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.step.step--active {
  border-color: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 80%, transparent);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 45%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 18%, transparent);
  background: color-mix(in srgb, var(--brand-surface-card-bg, #0a0b12) 92%, var(--brand-accent-electric, #27f3ff) 8%);
}

.step.completed {
  border-color: var(--brand-border-highlight);
  box-shadow: var(--brand-focus-ring);
}

.step.disabled {
  opacity: 0.5;
  box-shadow: none;
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: var(--ui-space-16);
  margin-bottom: var(--ui-space-16);
  width: 100%;
}

.step-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 50%;
  background: var(
    --brand-pill-alt-gradient,
    linear-gradient(135deg, rgba(154, 46, 255, 0.95) 0%, rgba(39, 243, 255, 0.95) 100%)
  );
  color: var(--brand-pill-contrast, var(--brand-fg-100, #f5f2fc));
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 6px 12px rgba(10, 6, 18, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.step-icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.step-icon--amount {
  color: var(--brand-accent-electric, #27f3ff);
}

.step-icon--confirm {
  color: var(--brand-accent-lime, #79ffb4);
}

.step-title {
  margin: 0;
  font-size: 16px;
  color: var(--ui-text-primary, var(--brand-fg-100));
}

.step-subtitle {
  margin: var(--ui-space-4) 0 0;
  font-size: 13px;
  color: var(--ui-text-muted, var(--brand-fg-200));
}

.wallet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--ui-space-16);
}

.wallet-button {
  border: 1px solid var(--brand-surface-card-border);
  background: var(--brand-surface-card-bg);
  border-radius: var(--brand-radius-md);
  padding: var(--ui-space-16);
  color: var(--brand-fg-100);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.wallet-button:hover {
  transform: translateY(-2px);
  border-color: var(--brand-input-border-active);
  box-shadow: var(--brand-focus-ring);
}

.link-button {
  border: none;
  background: none;
  color: var(--brand-accent-electric);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.error-text {
  margin-top: var(--ui-space-16);
  color: var(--brand-status-error);
  font-size: var(--ui-type-body);
  font-family: var(--ui-font-body);
}

.amount-section {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-16);
}

.amount-field {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-8);
}

.amount-field {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-8);
  position: relative;
}

.unit-chip-button {
  border: none;
  background: color-mix(in srgb, var(--brand-bg-900, #0b0413) 92%, transparent);
  padding: 0 var(--ui-space-12);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  min-height: 48px;
  color: var(--brand-accent-electric);
  font-family: var(--ui-font-heading);
  flex: 0 0 auto;
}

.unit-chip-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.unit-chip-button .unit-chip {
  background: transparent;
  border: none;
  color: inherit;
  letter-spacing: 0.12em;
  padding: 0;
}

.unit-chip-button:focus-visible {
  outline: 2px solid var(--brand-accent-electric);
  outline-offset: 3px;
}

.unit-chip-button__caret {
  width: 12px;
  height: 8px;
  opacity: 0.7;
}

.asset-picker-popover {
  position: absolute;
  top: calc(100% - 120px);
  right: 0;
  z-index: 40;
  min-width: 220px;
  padding: var(--ui-space-16);
  border-radius: var(--brand-radius-md);
  background: color-mix(in srgb, var(--brand-bg-900, #0b0413) 98%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 22%, transparent);
  box-shadow: 0 18px 34px rgba(8, 3, 14, 0.45);
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-12);
}

.asset-picker-popover__title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-fg-200);
}

.asset-picker-popover__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-8);
  padding: 0;
  margin: 0;
}

.asset-picker-popover__button {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--brand-fg-100);
  font-family: var(--ui-font-body);
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: var(--ui-space-12);
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--brand-radius-sm);
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.asset-picker-popover__icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.asset-picker-popover__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-picker-popover__button:hover,
.asset-picker-popover__button:focus-visible {
  border-color: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 35%, transparent);
  background: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 8%, transparent);
  outline: none;
}

.asset-picker-popover__button--active {
  border-color: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 45%, transparent);
  background: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 12%, transparent);
}

.asset-picker-popover__symbol {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.asset-picker-popover__name {
  font-size: 12px;
  color: var(--brand-fg-300);
}

.asset-picker-popover__balance {
  font-size: 12px;
  color: var(--brand-fg-200);
  font-family: var(--ui-font-heading);
}

.asset-picker-overlay {
  position: absolute;
  inset: 0;
  background: transparent;
  z-index: 30;
}

.amount-estimate {
  margin: var(--ui-space-12) 0 0;
  font-size: 0.85rem;
  color: var(--brand-fg-300);
  font-family: var(--ui-font-body);
  letter-spacing: 0.02em;
}

.amount-estimate__value {
  color: var(--brand-fg-100);
}

.conversion-hint {
  margin: var(--ui-space-4) 0 0;
  font-size: 0.8rem;
  font-family: var(--ui-font-body);
  color: var(--ui-text-muted, color-mix(in srgb, var(--brand-fg-300, #a798b0) 92%, transparent));
  letter-spacing: 0.03em;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: var(--ui-space-16);
  flex-wrap: wrap;
  width: 100%;
}

.field-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--field-border, var(--brand-input-border));
  background: var(--field-bg, var(--brand-input-bg));
  border-radius: var(--field-radius, var(--ui-field-radius, 14px));
  box-shadow: var(--field-shadow, none);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  overflow: hidden;
}

.field-group--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-group--disabled .field-input {
  cursor: not-allowed;
}

.field-group--error {
  border-color: color-mix(in srgb, var(--brand-status-error, #d04f4f) 65%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-status-error, #d04f4f) 35%, transparent);
}

.field-group--error .field-input {
  color: var(--brand-status-error, #d04f4f);
}

.field-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  color: var(--field-input-color, var(--brand-input-text));
  padding: var(--field-input-padding, var(--ui-field-padding, 16px));
  font-size: var(--field-input-font-size, var(--ui-field-font-size, 16px));
  line-height: 1.2;
  height: var(--field-input-height, var(--ui-field-height, 48px));
  box-sizing: border-box;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  border-radius: inherit;
}

.amount-input__group .field-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.amount-output__group .field-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.field-input:focus {
  outline: none;
}

.field-input::placeholder {
  color: var(--field-input-placeholder, var(--brand-input-placeholder));
}

.field-input:-webkit-autofill,
.field-input:-webkit-autofill:hover,
.field-input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--field-input-color, var(--brand-input-text));
  caret-color: var(--field-input-color, var(--brand-input-text));
  box-shadow: 0 0 0px 1000px var(--field-bg, var(--brand-input-bg)) inset;
  transition: background-color 600000s, color 0s;
}

.field-input:disabled {
  color: var(--field-input-disabled-color, var(--field-input-color, var(--brand-input-text)));
  -webkit-text-fill-color: var(--field-input-disabled-color, var(--field-input-color, var(--brand-input-text)));
  opacity: 1;
}

.field-group:focus-within {
  border-color: var(--field-border-focus, var(--brand-input-border-active));
  box-shadow: var(--brand-focus-ring);
}

.field-addon {
  background: var(--field-addon-bg, var(--brand-accent-electric-soft));
  color: var(--field-addon-color, var(--brand-accent-electric));
  border: none;
  border-left: 1px solid var(--field-addon-border, color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 32%, transparent));
  padding: 0 var(--field-addon-padding-inline, var(--ui-field-addon-padding, 16px));
  font-weight: 700;
  cursor: pointer;
  height: var(--field-addon-height, 48px);
  display: inline-flex;
  align-items: center;
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
}

.field-addon:focus-visible {
  outline: 2px solid var(--brand-accent-electric, #27f3ff);
  outline-offset: 3px;
}

.field-unit,
.field-addon--max {
  min-height: var(--field-unit-height, 48px) !important;
  height: 100% !important;
  padding: 0 var(--field-unit-padding-inline, 16px) !important;
  font-size: 0.78rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  color: var(--field-addon-color, var(--brand-accent-electric)) !important;
  border: none !important;
  border-left: 1px solid var(--field-addon-border, color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 28%, transparent)) !important;
  border-radius: 0 var(--brand-button-radius) var(--brand-button-radius) 0 !important;
  background: var(--field-addon-bg, color-mix(in srgb, var(--brand-bg-900, #0b0413) 85%, var(--brand-accent-electric, #27f3ff) 15%)) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 auto !important;
  white-space: nowrap !important;
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif) !important;
  gap: 6px !important;
}

.field-addon--max {
  border-left: 1px solid
    var(--field-addon-border, color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 28%, transparent)) !important;
}

.field-unit--inline {
  border-left: 1px solid var(--field-addon-border, color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 18%, transparent)) !important;
  border-radius: 0 !important;
  background: var(--field-addon-bg, color-mix(in srgb, var(--brand-bg-900, #0b0413) 92%, transparent)) !important;
  padding: 0 var(--field-unit-inline-padding-inline, 12px) !important;
  display: inline-flex !important;
  align-items: center !important;
  height: 100% !important;
}

@media (max-width: 420px) {
  .field-group {
    border-radius: 12px;
  }

  .field-input {
    padding: 12px;
    font-size: 15px;
  }

  .field-addon {
    padding: 0 12px;
    letter-spacing: 0.08em;
    font-size: 11px;
  }

  .field-unit {
    padding: 0 12px;
    letter-spacing: 0.08em;
    font-size: 12px;
  }
}

@media (max-width: 360px) {
  .field-input {
    padding: 10px;
    font-size: 14px;
  }

  .field-addon,
  .field-unit {
    padding: 0 10px;
  }
}

.field-label {
  text-align: left;
  margin: 0;
  font-family: var(--ui-font-body);
  font-weight: 500;
  font-size: var(--ui-type-body);
  color: var(
      --field-label-color,
      var(--ui-field-label, var(--brand-card-text, var(--brand-fg-200)))
    ) !important;
}

.amount-input__group {
  flex: 1 1 260px;
  min-width: min(280px, 100%);
  position: relative;
  overflow: visible;
}

.amount-input__field {
  min-width: 0;
}

.amount-input__max {
  border-left: 1px solid var(--field-addon-border, color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 24%, transparent));
  background: var(--field-addon-bg, color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 15%, transparent));
  color: var(--field-addon-color, var(--brand-accent-electric));
  padding: 0 var(--ui-space-12);
  min-width: 64px;
}

.amount-input__max:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.balance-inline {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ui-space-12);
  flex: 1 1 240px;
  margin-left: auto;
  flex-wrap: wrap;
  min-width: 220px;
}

.balance-inline__content {
  display: flex;
  align-items: center;
  gap: var(--ui-space-8);
  min-width: 0;
  max-width: 100%;
  justify-content: flex-end;
}

.balance-inline__label {
  font-size: var(--ui-type-caption);
  color: var(--ui-text-muted, var(--brand-fg-300));
  white-space: nowrap;
  flex: 0 0 auto;
  font-family: var(--ui-font-body);
}

.balance-inline__value {
  font-size: var(--ui-type-body);
  font-family: var(--ui-font-heading);
  color: var(--ui-field-value, var(--brand-fg-100));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  flex: 0 0 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--ui-space-8);
}

.balance-inline__unit {
  min-height: 22px;
  padding: 0 8px;
  flex: 0 0 auto;
}

.amount-output__group {
  flex: 1 1 260px;
  min-width: min(280px, 100%);
}

.amount-output__field {
  cursor: text;
  color: var(--field-input-color, var(--brand-input-text));
  -webkit-text-fill-color: var(--field-input-color, var(--brand-input-text));
  min-width: 0;
}

.amount-output__field:disabled {
  color: var(--field-input-color, var(--brand-input-text)) !important;
  -webkit-text-fill-color: var(--field-input-color, var(--brand-input-text)) !important;
  opacity: 1;
}

@media (max-width: 1200px) {
  .amount-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .balance-inline {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
    max-width: none;
    flex-wrap: nowrap;
    gap: var(--ui-space-8);
  }

  .balance-inline__content {
    justify-content: flex-end;
    max-width: none;
  }
}

@media (max-width: 768px) {
  .amount-row {
    gap: 12px;
  }

  .balance-inline {
    width: 100%;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: nowrap;
  }

}

@media (max-width: 640px) {
  .helper-strip {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: var(--ui-space-12);
  }

  .amount-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--ui-space-12);
  }

  .amount-input__group {
    min-width: 0;
    width: 100%;
    flex: 0 1 auto;
    flex-basis: auto;
  }

  .amount-output__group {
    min-width: 0;
    width: 100%;
    flex: 0 1 auto;
    flex-basis: auto;
  }

  .balance-inline {
    order: 2;
    width: 100%;
    flex: 1 1 auto;
    max-width: none;
    justify-content: flex-end;
    gap: var(--ui-space-8);
  }

  .balance-inline__value {
    max-width: none;
    text-align: right;
  }

  .purchase-buttons {
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .purchase-preview-value,
  .purchase-preview-note {
    white-space: normal;
  }
}

@media (max-width: 420px) {
  .amount-input__max {
    min-width: 56px;
  }
}

@media (max-width: 360px) {
  .amount-input__max {
    min-width: 50px;
  }
}

.purchase-summary {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-16);
  align-items: stretch;
  min-width: 0;
}

.purchase-actions {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-16);
  align-items: stretch;
  min-width: 0;
}

.purchase-preview {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-4);
  text-align: center;
  align-items: center;
  font-family: var(--ui-font-body);
  min-width: 0;
}

.purchase-preview-label {
  margin: 0;
  opacity: 0.7;
  font-size: var(--ui-type-caption);
}

.purchase-preview-value {
  margin: 0;
  font-size: clamp(1.45rem, 2.4vw, 1.95rem);
  font-family: var(--ui-font-heading);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: 0.012em;
  color: var(--brand-fg-100);
  text-shadow:
    0 0 9px rgba(79, 108, 240, 0.18),
    0 0 20px rgba(79, 108, 240, 0.1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--ui-space-8);
}

.purchase-preview-note {
  margin: 0;
  opacity: 0.65;
  font-size: var(--ui-type-caption);
  font-family: var(--ui-font-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: var(--ui-space-8);
}

.purchase-preview__unit,
.purchase-preview-chip {
  min-height: 22px;
  padding: 0 8px;
}

.purchase-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-12);
  width: 100%;
}

.purchase-primary {
  flex: 1 1 220px;
  min-width: 0;
}

@media (max-width: 640px) {
  .purchase-primary {
    width: 100%;
    flex: 0 0 auto;
    flex-basis: auto;
    box-sizing: border-box;
  }

  .step-header--amount,
  .step-header--confirm {
    flex-wrap: nowrap;
    align-items: center;
    gap: var(--ui-space-12);
  }

  .step-header--amount > div,
  .step-header--confirm > div {
    flex: 1 1 auto;
  }
}

@media (max-width: 480px) {
  .step {
    padding: var(--ui-space-16);
  }

  .step-header {
    flex-wrap: wrap;
    gap: var(--ui-space-12);
  }

  .step-header--amount,
  .step-header--confirm {
    flex-wrap: nowrap;
    align-items: center;
  }

  .step-header--amount > div,
  .step-header--confirm > div {
    flex: 1 1 auto;
  }
}

.purchase-note {
  margin: var(--ui-space-16) 0 0;
  font-size: 0.86rem;
  font-family: var(--ui-font-body);
  color: color-mix(in srgb, var(--brand-fg-200, #c9bfd0) 78%, transparent);
  line-height: 1.5;
}

.stake-toggle {
  margin-top: var(--ui-space-16);
  display: flex;
  align-items: center;
}

.stake-toggle__control {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--ui-space-12);
  cursor: pointer;
  color: var(--brand-fg-100, #f5f5f5);
  font-family: var(--ui-font-body);
}

.stake-toggle__control--disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.stake-toggle__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.stake-toggle__track {
  width: 44px;
  height: 24px;
  padding: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-fg-200, #d8cfee) 25%, transparent);
  display: inline-flex;
  align-items: center;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-fg-200, #d8cfee) 25%, transparent);
}

.stake-toggle__thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand-fg-100, #f5f5f5);
  transition: transform 0.2s ease, background 0.2s ease;
}

.stake-toggle__input:checked + .stake-toggle__track {
  background: color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 55%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 65%, transparent);
}

.stake-toggle__input:checked + .stake-toggle__track .stake-toggle__thumb {
  transform: translateX(20px);
  background: var(--brand-accent-electric, #27f3ff);
}

.stake-toggle__input:focus-visible + .stake-toggle__track {
  outline: 2px solid var(--brand-accent-electric, #27f3ff);
  outline-offset: 2px;
}

.stake-toggle__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: inline-block;
  white-space: normal;
}

@keyframes connectBannerPulse {
  0%,
  100% {
    filter: drop-shadow(
      0 0 14px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 28%, transparent)
    );
  }
  50% {
    filter: drop-shadow(
      0 0 24px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 42%, transparent)
    );
  }
}

@media (max-width: 640px) {
  .connect-banner {
    padding: 20px;
  }

  .connect-banner__lead {
    gap: var(--ui-space-12);
  }

  .connect-banner__icon {
    width: 46px;
    height: 46px;
  }

  .connect-banner__headline {
    font-size: 1.05rem;
  }

  .connect-banner__chips {
    display: none;
  }

  .connect-banner__button {
    align-self: stretch;
  }
}

@media (max-width: 480px) {
  .stake-toggle {
    width: 100%;
    justify-content: flex-start;
  }

  .stake-toggle__control {
    align-items: flex-start;
    gap: var(--ui-space-8);
    flex-wrap: wrap;
  }

  .stake-toggle__track {
    flex: 0 0 auto;
    margin-top: 2px;
  }

  .stake-toggle__label {
    flex: 1 1 0;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: none;
    line-height: 1.4;
  }
}

@media (min-width: 768px) {
  .purchase-buttons {
    flex-wrap: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stake-toggle__track,
  .stake-toggle__thumb {
    transition: none;
  }

  .connect-banner__button {
    animation: none;
  }
}

.micro-cta {
  margin-top: var(--ui-space-16);
  padding-top: var(--ui-space-16);
  border-top: 1px solid color-mix(in srgb, var(--brand-fg-100) 10%, transparent);
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-16);
}

.micro-cta__description {
  margin: 0;
  font-size: var(--ui-type-body);
  color: var(--brand-fg-200);
  font-family: var(--ui-font-body);
}

.micro-cta__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-16);
}

.micro-cta__link {
  display: inline-flex;
  flex-direction: column;
  gap: var(--ui-space-4);
  padding: var(--ui-space-8) var(--ui-space-16);
  border-radius: var(--brand-button-radius);
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric) 30%, transparent);
  background: color-mix(in srgb, var(--brand-bg-900) 82%, transparent);
  color: var(--brand-fg-100);
  font-size: var(--ui-type-body);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: none;
  transition: color 0.2s ease, border 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  font-family: var(--ui-font-heading);
}

.micro-cta__link:hover,
.micro-cta__link:focus {
  color: var(--brand-accent-electric, #5d8cff);
  border-color: color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 55%, transparent);
  background: color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 18%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 12px 26px color-mix(in srgb, var(--brand-accent-electric, #5d8cff) 26%, transparent);
}

.micro-cta__link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-accent-electric) 50%, transparent);
  outline-offset: 3px;
}

.micro-cta__caption {
  font-size: var(--ui-type-caption);
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--brand-fg-300);
  font-family: var(--ui-font-body);
}

.micro-cta__email {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-16);
}

.micro-cta__email-description {
  margin: 0;
  font-size: var(--ui-type-caption);
  color: var(--brand-fg-300);
  font-family: var(--ui-font-body);
}

.micro-cta__email-form {
  display: flex;
  align-items: center;
  gap: var(--ui-space-16);
}

.micro-cta__email-input {
  flex: 1;
  min-width: 0;
  padding: var(--ui-space-8) var(--ui-space-16);
  border-radius: var(--brand-radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-fg-200) 35%, transparent);
  background: color-mix(in srgb, var(--brand-bg-900) 78%, transparent);
  color: var(--brand-fg-100);
  font-size: 14px;
  font-family: var(--ui-font-body);
}

.micro-cta__email-input::placeholder {
  color: var(--brand-fg-300);
}

.micro-cta__email-button {
  background: var(--brand-surface-card-bg);
  color: var(--brand-fg-100);
  border: 1px solid var(--brand-surface-card-border);
  border-radius: var(--brand-radius-md);
  padding: var(--ui-space-8) var(--ui-space-16);
  font-size: var(--ui-type-body);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border 0.2s ease;
  font-family: var(--ui-font-heading);
}

.micro-cta__email-button:hover,
.micro-cta__email-button:focus {
  background: var(--brand-surface-helper-hover-bg);
  border-color: var(--brand-border-highlight);
}

.micro-cta__email-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.micro-cta__feedback {
  margin: 0;
  font-size: var(--ui-type-caption);
  font-family: var(--ui-font-body);
}

.micro-cta__feedback--success {
  color: var(--brand-status-success);
}

.micro-cta__feedback--error {
  color: var(--brand-status-error);
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

.info-text {
  margin-top: var(--ui-space-16);
  font-size: var(--ui-type-body);
  color: var(--brand-fg-200);
  font-family: var(--ui-font-body);
}

@media (max-width: 768px) {
  .amount-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

.need-eth-modal {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.need-eth-modal__backdrop {
  position: absolute;
  inset: 0;
  background: var(--brand-modal-backdrop);
}

.need-eth-modal__content {
  position: relative;
  z-index: 1;
  width: min(360px, 100%);
  background: var(--brand-surface-card-bg);
  border: 1px solid var(--brand-surface-card-border);
  border-radius: var(--brand-modal-radius);
  padding: 24px;
  color: var(--brand-fg-200);
  box-shadow: var(--brand-modal-shadow);
}

.need-eth-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  background: transparent;
  color: var(--brand-fg-300);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease;
}

.need-eth-modal__close:hover,
.need-eth-modal__close:focus {
  color: var(--brand-fg-100);
}

.need-eth-modal__title {
  margin: 0 0 12px;
  font-size: 1.1rem;
  font-weight: 600;
}

.need-eth-modal__description {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--brand-fg-200);
}

.need-eth-modal__links {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: grid;
  gap: var(--ui-space-16);
}

.need-eth-modal__links a {
  color: var(--brand-accent-electric);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.need-eth-modal__links a:hover,
.need-eth-modal__links a:focus {
  color: var(--brand-accent-warm);
  text-decoration: underline;
}

.need-eth-modal__note {
  margin: 0;
  font-size: 0.8rem;
  color: var(--brand-fg-300);
}

@media (min-width: 992px) {
  .buy-layout {
    flex-direction: row;
    align-items: stretch;
  }

  .buy-widget {
    flex: 1 1 auto;
    order: 2;
  }
}

.status-panel {
  margin-top: var(--ui-space-24);
  border-radius: 16px;
  padding: var(--ui-space-16);
  border: 1px solid color-mix(in srgb, var(--brand-fg-100) 12%, transparent);
}

.status-panel--pending {
  background: color-mix(in srgb, var(--brand-accent-electric) 16%, transparent);
  border-color: color-mix(in srgb, var(--brand-accent-electric) 45%, transparent);
}

.status-panel--success {
  background: color-mix(in srgb, var(--brand-status-success) 18%, transparent);
  border-color: color-mix(in srgb, var(--brand-status-success) 38%, transparent);
}

.status-panel--error {
  background: color-mix(in srgb, var(--brand-status-error) 18%, transparent);
  border-color: color-mix(in srgb, var(--brand-status-error) 45%, transparent);
}

.status-title {
  margin: 0 0 var(--ui-space-4);
  font-weight: 700;
  font-size: var(--ui-type-body);
  font-family: var(--ui-font-heading);
}

.status-description {
  margin: 0 0 var(--ui-space-8);
  font-size: var(--ui-type-body);
  font-family: var(--ui-font-body);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .widget-card {
    padding: var(--ui-space-24);
  }

  .helper-strip {
    flex-direction: column;
    align-items: stretch;
    gap: var(--ui-space-12);
  }

  .how-it-works {
    padding: var(--ui-space-16);
  }

  .widget-header {
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .micro-cta__email-form {
    flex-direction: column;
    align-items: stretch;
  }

  .micro-cta__email-button {
    width: 100%;
  }

  .need-eth-modal__content {
    padding: var(--ui-space-24);
  }
}

@media (max-width: 360px) {
  .how-it-works {
    padding: var(--ui-space-16);
  }

  .how-it-works__badge {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .widget-card {
    padding: var(--ui-space-16);
  }
}
</style>
