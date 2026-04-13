<template>
  <section
    id="trust-bar"
    class="trust-bar"
    data-analytics-section="trust-bar"
  >
    <div class="container">
      <component :is="SbCard" class="trust-bar__card" :padded="false">
        <div class="trust-bar__content">
          <div class="trust-bar__contract">
            <header class="trust-bar__header">
              <span
                v-if="eyebrow"
                class="trust-bar__eyebrow"
              >
                {{ eyebrow }}
              </span>
              <h3 class="trust-bar__title">{{ headline }}</h3>
            </header>
            <p v-if="supportingCopy" class="trust-bar__supporting">
              {{ supportingCopy }}
            </p>
            <div class="trust-bar__body">
              <div class="trust-bar__address-block">
                <div class="trust-bar__address-header">
                  <span class="trust-bar__address-label">{{ contractLabel }}</span>
                  <span
                    v-if="copyState === 'copied'"
                    class="trust-bar__address-status trust-bar__address-status--success"
                  >
                    {{ copiedLabel }}
                  </span>
                  <span
                    v-else-if="copyState === 'error'"
                    class="trust-bar__address-status trust-bar__address-status--error"
                  >
                    {{ copyErrorLabel }}
                  </span>
                </div>
                <code class="trust-bar__address" :title="contractAddress">{{ contractAddress }}</code>
                <div class="trust-bar__actions">
                  <button
                    class="primary-button trust-bar__action"
                    type="button"
                    :disabled="!contractAddress"
                    :aria-label="copyAriaLabel"
                    @click="copyContractAddress"
                  >
                    <span class="trust-bar__action-icon" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M9 4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-2v2h2a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4h-9a4 4 0 0 0-4 4v2h2V4Z"
                        />
                        <path
                          d="M4.5 6.5h9A2.5 2.5 0 0 1 16 9v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 20V9a2.5 2.5 0 0 1 2.5-2.5Zm0 1.5A1 1 0 0 0 3.5 9v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1Z"
                        />
                      </svg>
                    </span>
                    <span class="trust-bar__action-text">{{ copyLabel }}</span>
                  </button>
                  <a
                    v-if="etherscanUrl"
                    class="primary-button trust-bar__action trust-bar__action--secondary"
                    :href="etherscanUrl"
                    target="_blank"
                    rel="noopener"
                    @click="handleEtherscanClick"
                  >
                    <span class="trust-bar__action-icon" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M15.5 3a.75.75 0 0 0 0 1.5h2.69L9.72 12.97a.75.75 0 1 0 1.06 1.06l8.47-8.47V8.5a.75.75 0 0 0 1.5 0V3.75A.75.75 0 0 0 20 3h-4.5Z"
                        />
                        <path
                          d="M5.75 4.5A2.75 2.75 0 0 0 3 7.25v11A2.75 2.75 0 0 0 5.75 21h11a2.75 2.75 0 0 0 2.75-2.75V13a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-11A1.25 1.25 0 0 1 4.5 18.25v-11c0-.69.56-1.25 1.25-1.25H11a.75.75 0 0 0 0-1.5H5.75Z"
                        />
                      </svg>
                    </span>
                    <span class="trust-bar__action-text">{{ etherscanLabel }}</span>
                  </a>
                </div>
                <p
                  v-if="contractNote"
                  class="trust-bar__note"
                >
                  {{ contractNote }}
                </p>
                <p
                  class="trust-bar__copy-feedback"
                  role="status"
                  aria-live="polite"
                >
                  <span v-if="copyState === 'error'">{{ copyErrorLabel }}</span>
                  <span v-else-if="copyState === 'copied'">{{ copiedLabel }}</span>
                </p>
              </div>
              <div
                v-if="badgeItems.length"
                class="trust-bar__badge-list"
              >
                <p
                  v-if="badgesHeading"
                  class="trust-bar__badge-heading"
                >
                  {{ badgesHeading }}
                </p>
                <div class="trust-bar__badge-chips">
                  <span
                    v-for="(badge, idx) in badgeItems"
                    :key="idx"
                    :class="['trust-bar__badge-chip', `trust-bar__badge-chip--${badge.variant}`]"
                  >
                    {{ badge.text }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p
          v-if="disclaimer"
          class="trust-bar__disclaimer"
        >
          {{ disclaimer }}
        </p>
      </component>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, ref } from 'vue';
import { trackEvent } from '@koehler8/cms/utils/analytics';
import SbCard from '@koehler8/cms/components/ui/SbCard.vue';
import { getTokenSymbol } from '../utils/tokenFormat';

const token = import.meta.env.VITE_TOKEN || '';
const normalizedToken = token.toLowerCase();

const pageContent = inject('pageContent', ref({}));

const trustBarContent = computed(() => pageContent.value?.trustBar || {});

function getStringField(field, fallback = '') {
  const value = trustBarContent.value?.[field];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const tokenSymbol = getTokenSymbol();
const fallbackContractLabel = tokenSymbol ? `${tokenSymbol} Smart Contract` : 'Smart Contract';
const fallbackCopyAria = tokenSymbol
  ? `Copy the ${tokenSymbol} contract address`
  : 'Copy this contract address';
const fallbackHeadline = tokenSymbol
  ? `Secure your ${tokenSymbol} purchase`
  : 'Verified presale contract';
const fallbackSupportingCopy =
  'Every transaction settles through this immutable address—bookmark it and only trust links from official channels.';

const contractLabel = computed(() => getStringField('contractLabel', fallbackContractLabel));
const eyebrow = computed(() => getStringField('eyebrow', contractLabel.value || fallbackContractLabel));
const headline = computed(() => getStringField('headline', fallbackHeadline));
const supportingCopy = computed(() => getStringField('supportingCopy', fallbackSupportingCopy));
const contractAddress = computed(() => getStringField('contractAddress'));
const etherscanUrl = computed(() => getStringField('etherscanUrl'));
const etherscanLabel = computed(() => getStringField('etherscanLabel', 'View on Etherscan'));
const copyAriaLabel = computed(() => getStringField('copyAriaLabel', fallbackCopyAria));
const copyLabel = computed(() => getStringField('copyLabel', 'Copy'));
const copiedLabel = computed(() => getStringField('copiedLabel', 'Copied!'));
const copyErrorLabel = computed(() => getStringField('copyErrorLabel', 'Copy failed. Try again.'));
const contractNote = computed(() => getStringField('contractNote'));
const badgesHeading = computed(() => getStringField('badgesHeading'));
const badgeItems = computed(() => {
  const badges = Array.isArray(trustBarContent.value?.badges)
    ? trustBarContent.value.badges
    : [];
  return badges
    .map((badge) => {
      const safeBadge = badge && typeof badge === 'object' ? badge : {};
      return {
        text: String(safeBadge.text || '').trim(),
        variant: String(safeBadge.variant || 'placeholder').toLowerCase(),
      };
    })
    .filter((badge) => badge.text);
});
const disclaimer = computed(() => getStringField('disclaimer'));

const copyState = ref('idle');
let resetTimer = null;

function clearResetTimer() {
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

async function copyContractAddress() {
  const address = (contractAddress.value || '').trim();
  if (!address) return;

  copyState.value = 'copying';
  let copied = false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[TrustBar] Failed to copy via clipboard API', error);
      }
    }
  }

  if (!copied && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = address;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[TrustBar] Fallback copy failed', error);
      }
    }
  }

  copyState.value = copied ? 'copied' : 'error';

  clearResetTimer();
  resetTimer = setTimeout(() => {
    copyState.value = 'idle';
  }, 2500);

  trackEvent('trustbar_copy_contract', {
    token: normalizedToken,
    success: copied,
  });
}

function handleEtherscanClick() {
  trackEvent('trustbar_etherscan_click', {
    token: normalizedToken,
    contract_address: (contractAddress.value || '').toLowerCase(),
  });
}

onBeforeUnmount(() => {
  clearResetTimer();
});
</script>

<style scoped>
.trust-bar {
  --trust-text-primary: var(--ui-text-primary, var(--brand-card-text, #f8fafc));
  --trust-text-muted: var(--ui-text-muted, rgba(209, 219, 252, 0.82));
  --trust-accent-primary: var(--brand-accent-electric, #4fe3ff);
  --trust-accent-secondary: var(--brand-neon-pink, #ff3db3);
  --trust-card-border: color-mix(in srgb, var(--brand-surface-card-border, rgba(98, 118, 255, 0.18)) 100%, transparent);
  --trust-card-shadow: var(--brand-surface-card-shadow, 0 28px 80px -32px rgba(6, 4, 14, 0.65));
  --trust-card-bg-1: color-mix(in srgb, var(--brand-surface-card-bg, rgba(16, 22, 36, 0.96)) 95%, transparent);
  --trust-card-bg-2: color-mix(in srgb, var(--brand-surface-card-bg, rgba(12, 16, 28, 0.84)) 85%, transparent);
  --trust-panel-border: color-mix(in srgb, var(--brand-card-border, rgba(118, 140, 255, 0.24)) 100%, transparent);
  --trust-panel-bg: color-mix(in srgb, var(--brand-surface-card-bg, rgba(12, 17, 29, 0.88)) 92%, transparent);
  --trust-chip-border: color-mix(in srgb, var(--brand-card-border, rgba(118, 140, 255, 0.28)) 100%, transparent);
  --trust-chip-bg: color-mix(in srgb, var(--brand-surface-card-bg, rgba(18, 24, 42, 0.84)) 88%, transparent);
  --trust-status-success-bg: color-mix(in srgb, var(--brand-status-success, #27f3ff) 15%, transparent);
  --trust-status-success-border: color-mix(in srgb, var(--brand-status-success, #27f3ff) 28%, transparent);
  --trust-status-success-text: color-mix(in srgb, var(--brand-status-success, #27f3ff) 85%, #ffffff);
  --trust-status-error-bg: color-mix(in srgb, var(--brand-status-error, #ff6987) 18%, transparent);
  --trust-status-error-border: color-mix(in srgb, var(--brand-status-error, #ff6987) 32%, transparent);
  --trust-status-error-text: color-mix(in srgb, var(--brand-status-error, #ff6987) 92%, #ffffff);
  --trust-note-color: color-mix(in srgb, var(--trust-text-muted) 92%, transparent);
  --trust-disclaimer-color: color-mix(in srgb, var(--trust-text-muted) 78%, transparent);
  --trust-disclaimer-border: color-mix(in srgb, var(--brand-card-border, rgba(110, 142, 255, 0.18)) 100%, transparent);
  --trust-background: color-mix(in srgb, var(--brand-bg-900, #080a12) 90%, transparent);

  padding: clamp(38px, 6vw, 72px) 0;
  background: var(--trust-background), var(--theme-body-background, #04060c);
  color: var(--trust-text-primary);
}

.trust-bar .container {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding-inline: clamp(18px, 4vw, 32px);
  box-sizing: border-box;
}

.trust-bar__card {
  position: relative;
  overflow: hidden;
  padding: clamp(26px, 4vw, 36px);
  border-radius: var(--brand-card-radius, 28px);
  border: 1px solid var(--trust-card-border);
  background: linear-gradient(145deg, var(--trust-card-bg-1), var(--trust-card-bg-2));
  box-shadow: var(--trust-card-shadow);
  backdrop-filter: blur(22px);
}

.trust-bar__card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(
    115deg,
    color-mix(in srgb, var(--trust-accent-primary) 42%, transparent),
    color-mix(in srgb, var(--brand-accent-electric, #845eff) 25%, transparent),
    color-mix(in srgb, var(--trust-accent-secondary) 24%, transparent)
  );
  opacity: 0.45;
  z-index: 0;
}

.trust-bar__card > * {
  position: relative;
  z-index: 1;
}

.trust-bar__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(1.4rem, 4vw, 2.4rem);
  align-items: stretch;
}

.trust-bar__contract {
  min-width: 0;
}

.trust-bar__header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.trust-bar__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 1.2rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: color-mix(in srgb, var(--trust-text-primary) 85%, transparent);
  background: color-mix(in srgb, var(--trust-accent-primary) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--trust-accent-primary) 28%, transparent);
  backdrop-filter: blur(6px);
  align-self: flex-start;
  position: relative;
  margin-bottom: clamp(0.9rem, 2.2vw, 1.2rem);
}

.trust-bar__title {
  margin: 0;
  font-size: clamp(1.375rem, 4.8vw, 2rem);
  font-weight: 700;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  letter-spacing: -0.01em;
  color: var(--trust-text-primary);
}

.trust-bar__supporting {
  margin: clamp(0.6rem, 2vw, 0.9rem) 0 0;
  font-size: clamp(0.92rem, 2.3vw, 1.05rem);
  line-height: 1.65;
  color: var(--trust-text-muted);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  max-width: 58ch;
}

.trust-bar__body {
  margin-top: clamp(1.35rem, 3vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.2rem, 3vw, 2rem);
}

.trust-bar__address-block {
  display: flex;
  flex-direction: column;
  gap: clamp(0.85rem, 2.4vw, 1.25rem);
  padding: clamp(1rem, 3.4vw, 1.6rem) clamp(1.1rem, 4vw, 1.85rem);
  border-radius: 20px;
  border: 1px solid var(--field-border, var(--trust-panel-border));
  background: var(--field-bg, var(--trust-panel-bg));
  box-shadow: var(
      --field-shadow,
      0 18px 38px -26px color-mix(in srgb, var(--trust-card-shadow) 60%, transparent)
    );
}

.trust-bar__address-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
}

.trust-bar__address-label {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ui-text-muted, var(--trust-text-muted));
}

.trust-bar__address-status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  border: 1px solid transparent;
}

.trust-bar__address-status--success {
  background: var(--trust-status-success-bg);
  border-color: var(--trust-status-success-border);
  color: var(--trust-status-success-text);
}

.trust-bar__address-status--error {
  background: var(--trust-status-error-bg);
  border-color: var(--trust-status-error-border);
  color: var(--trust-status-error-text);
}

.trust-bar__address {
  display: block;
  padding: clamp(0.75rem, 2.4vw, 1rem) clamp(1rem, 3.4vw, 1.4rem);
  border-radius: 14px;
  background: var(--field-bg, color-mix(in srgb, var(--trust-panel-bg) 96%, transparent));
  border: 1px solid var(--field-border, var(--trust-panel-border));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--field-border, var(--trust-card-border)) 35%, transparent);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: clamp(0.8rem, 2.2vw, 0.96rem);
  letter-spacing: 0.08em;
  line-height: 1.5;
  color: var(--field-input-color, var(--trust-text-primary));
  word-break: break-all;
  overflow-wrap: anywhere;
}

.trust-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
}

.trust-bar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 40px;
  padding: 0.5rem 1.15rem;
  text-decoration: none;
}

.trust-bar__action--secondary {
  background: transparent;
  color: color-mix(in srgb, var(--trust-accent-primary) 90%, #ffffff);
  border: 1px solid color-mix(in srgb, var(--trust-accent-secondary) 32%, transparent);
  box-shadow: none;
}

.trust-bar__action--secondary:hover,
.trust-bar__action--secondary:focus-visible {
  color: var(--trust-text-primary);
  background: color-mix(in srgb, var(--trust-accent-secondary) 18%, transparent);
  transform: translateY(-1px);
}

.trust-bar__action-icon {
  display: inline-flex;
  width: 1.05rem;
  height: 1.05rem;
  color: currentColor;
}

.trust-bar__action-icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.trust-bar__action-text {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.trust-bar__note {
  margin: 0.4rem 0 0;
  font-size: clamp(0.76rem, 1.7vw, 0.88rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: var(--trust-note-color);
}

.trust-bar__badge-list {
  border: 1px solid var(--trust-panel-border);
  border-radius: 18px;
  background: var(--field-bg, color-mix(in srgb, var(--trust-panel-bg) 92%, transparent));
  padding: clamp(0.85rem, 2.6vw, 1.4rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.6rem, 2vw, 1rem);
}

.trust-bar__badge-heading {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--trust-text-muted) 90%, transparent);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
}

.trust-bar__badge-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.trust-bar__badge-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: clamp(0.68rem, 1.8vw, 0.8rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: var(--trust-text-primary);
  border: 1px solid var(--trust-chip-border);
  background: var(--trust-chip-bg);
}

.trust-bar__badge-chip--verified {
  border-color: color-mix(in srgb, var(--brand-status-success, #27f3ff) 32%, transparent);
  color: color-mix(in srgb, var(--brand-status-success, #27f3ff) 90%, #ffffff);
  background: color-mix(in srgb, var(--brand-status-success, #27f3ff) 14%, transparent);
}

.trust-bar__badge-chip--info {
  border-color: color-mix(in srgb, var(--trust-accent-primary) 28%, transparent);
  color: color-mix(in srgb, var(--trust-accent-primary) 95%, #ffffff);
  background: color-mix(in srgb, var(--trust-accent-primary) 12%, transparent);
}

.trust-bar__badge-chip--placeholder {
  border-color: color-mix(in srgb, var(--trust-accent-secondary) 32%, transparent);
  color: color-mix(in srgb, var(--trust-text-primary) 90%, transparent);
  background: color-mix(in srgb, var(--trust-accent-secondary) 15%, transparent);
}

.trust-bar__copy-feedback {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  border: 0;
  padding: 0;
  clip: rect(0 0 0 0);
  overflow: hidden;
}

.trust-bar__disclaimer {
  margin-top: clamp(1.2rem, 3vw, 1.8rem);
  font-size: clamp(0.72rem, 1.6vw, 0.84rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: var(--trust-disclaimer-color);
  padding-top: 1.1rem;
  border-top: 1px solid var(--trust-disclaimer-border);
  max-width: 720px;
}

@media (min-width: 768px) {
  .trust-bar__action {
    min-width: 150px;
  }
}

@media (min-width: 992px) {
  .trust-bar {
    padding: clamp(56px, 6vw, 96px) 0;
  }

  .trust-bar__content {
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(2rem, 3.2vw, 3rem);
  }
}

@media (max-width: 575px) {
  .trust-bar .container {
    padding-inline: 16px;
  }
}
</style>
