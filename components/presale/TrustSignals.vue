<template>
  <section
    v-if="shouldRender"
    class="trust-signals"
    data-analytics-section="trust-signals"
  >
    <div class="trust-signals__surface">
      <header class="trust-signals__header">
        <div class="trust-signals__heading">
          <p class="trust-signals__eyebrow">{{ headingEyebrow }}</p>
          <h3 class="trust-signals__title">{{ headingTitle }}</h3>
          <p v-if="subtitle" class="trust-signals__subtitle">{{ subtitle }}</p>
        </div>
        <a
          v-if="hasVerificationLink"
          class="trust-signals__verification"
          :href="verification.url"
          target="_blank"
          rel="noopener"
          @click.prevent="handleVerificationClick"
        >
          <span class="trust-signals__verification-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12 .75a1.5 1.5 0 0 1 1.31.777l.89 1.533 1.758-.091a1.5 1.5 0 0 1 1.434.98l.532 1.68 1.634.59a1.5 1.5 0 0 1 .961 1.413l-.037 1.76 1.339 1.17a1.5 1.5 0 0 1 .508 1.58l-.535 1.666 1.021 1.381a1.5 1.5 0 0 1-.117 1.854l-1.195 1.366.038 1.75a1.5 1.5 0 0 1-.962 1.412l-1.63.594-.53 1.675a1.5 1.5 0 0 1-1.435.98l-1.756-.092-.89 1.53a1.5 1.5 0 0 1-2.621 0l-.89-1.53-1.756.091a1.5 1.5 0 0 1-1.435-.98l-.53-1.675-1.63-.594a1.5 1.5 0 0 1-.962-1.412l.038-1.75-1.196-1.366a1.5 1.5 0 0 1-.116-1.854l1.02-1.38-.535-1.666a1.5 1.5 0 0 1 .508-1.58l1.34-1.17-.037-1.76a1.5 1.5 0 0 1 .96-1.413l1.635-.59.533-1.68a1.5 1.5 0 0 1 1.433-.98l1.759.091.888-1.533A1.5 1.5 0 0 1 12 .75Z"
              />
              <path
                d="M10.29 14.38 8.789 12.88a.75.75 0 0 0-1.06 1.06l2.121 2.122a1 1 0 0 0 1.414 0l5.303-5.304a.75.75 0 1 0-1.06-1.06l-4.596 4.596a.5.5 0 0 1-.707 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span class="trust-signals__verification-text">
            <span>{{ verification.label }}</span>
            <span v-if="verification.shortAddress" class="trust-signals__verification-address">
              {{ verification.shortAddress }}
            </span>
          </span>
        </a>
        <div v-else-if="hasVerification" class="trust-signals__verification trust-signals__verification--static">
          <span class="trust-signals__verification-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12 .75a1.5 1.5 0 0 1 1.31.777l.89 1.533 1.758-.091a1.5 1.5 0 0 1 1.434.98l.532 1.68 1.634.59a1.5 1.5 0 0 1 .961 1.413l-.037 1.76 1.339 1.17a1.5 1.5 0 0 1 .508 1.58l-.535 1.666 1.021 1.381a1.5 1.5 0 0 1-.117 1.854l-1.195 1.366.038 1.75a1.5 1.5 0 0 1-.962 1.412l-1.63.594-.53 1.675a1.5 1.5 0 0 1-1.435.98l-1.756-.092-.89 1.53a1.5 1.5 0 0 1-2.621 0l-.89-1.53-1.756.091a1.5 1.5 0 0 1-1.435-.98l-.53-1.675-1.63-.594a1.5 1.5 0 0 1-.962-1.412l.038-1.75-1.196-1.366a1.5 1.5 0 0 1-.116-1.854l1.02-1.38-.535-1.666a1.5 1.5 0 0 1 .508-1.58l1.34-1.17-.037-1.76a1.5 1.5 0 0 1 .96-1.413l1.635-.59.533-1.68a1.5 1.5 0 0 1 1.433-.98l1.759.091.888-1.533A1.5 1.5 0 0 1 12 .75Z"
              />
              <path
                d="M10.29 14.38 8.789 12.88a.75.75 0 0 0-1.06 1.06l2.121 2.122a1 1 0 0 0 1.414 0l5.303-5.304a.75.75 0 1 0-1.06-1.06l-4.596 4.596a.5.5 0 0 1-.707 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span class="trust-signals__verification-text">
            <span>{{ verification.label }}</span>
            <span v-if="verification.shortAddress" class="trust-signals__verification-address">
              {{ verification.shortAddress }}
            </span>
          </span>
        </div>
      </header>

      <div class="trust-signals__body">
        <component
          v-if="auditInfo.show"
          :is="auditInfo.url ? 'a' : 'div'"
          class="trust-signals__audit-card"
          :class="{ 'trust-signals__audit-card--pending': auditInfo.pending }"
          :href="auditInfo.url || undefined"
          target="_blank"
          rel="noopener"
          @click="handleAuditClick"
        >
          <div class="trust-signals__logo">
            <img
              v-if="auditInfo.logo"
              :src="auditInfo.logo"
              :alt="auditInfo.name || 'Audit provider logo'"
              loading="lazy"
            >
            <span v-else class="trust-signals__logo-fallback">{{ auditInitial }}</span>
          </div>
          <div class="trust-signals__audit-copy">
            <span class="trust-signals__audit-badge">{{ auditInfo.badgeLabel }}</span>
            <p class="trust-signals__audit-name">{{ auditInfo.name }}</p>
            <p class="trust-signals__audit-status">{{ auditInfo.status }}</p>
          </div>
        </component>

        <div v-if="partners.length" class="trust-signals__partners">
          <p class="trust-signals__partners-title">{{ partnersTitle }}</p>
          <div class="trust-signals__partner-list">
            <a
              v-for="partner in partners"
              :key="partner.id"
              class="trust-signals__partner"
              :href="partner.url || undefined"
              :target="partner.url ? '_blank' : undefined"
              :rel="partner.url ? 'noopener' : undefined"
              @click="handlePartnerClick(partner)"
            >
              <div class="trust-signals__partner-logo">
                <img
                  v-if="partner.logo"
                  :src="partner.logo"
                  :alt="partner.name"
                  loading="lazy"
                >
                <span v-else class="trust-signals__partner-fallback">{{ partner.initial }}</span>
              </div>
              <div class="trust-signals__partner-meta">
                <span class="trust-signals__partner-name">{{ partner.name }}</span>
                <span v-if="partner.caption" class="trust-signals__partner-caption">{{ partner.caption }}</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      <p v-if="summary" class="trust-signals__summary">
        <span class="trust-signals__summary-label">{{ summaryLabel }}</span>
        {{ summary }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, ref } from 'vue';
import { trackEvent } from '@d2sg/cms/utils/analytics';
import { resolveMedia } from '@d2sg/cms/utils/assetResolver';

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const shortAddress = (value) => {
  const safe = sanitizeString(value);
  if (!safe) return '';
  if (safe.length <= 12) return safe;
  return `${safe.slice(0, 6)}…${safe.slice(-4)}`;
};

const pageContent = inject('pageContent', ref({}));

const trustSignalsConfig = computed(() => pageContent.value?.trustSignals || {});
const trustBarConfig = computed(() => pageContent.value?.trustBar || {});

const auditInfo = computed(() => {
  const audit = trustSignalsConfig.value?.audit || {};
  const name = sanitizeString(audit.name);
  const url = sanitizeString(audit.url);
  const status = sanitizeString(audit.status);
  const badgeLabel = sanitizeString(audit.badgeLabel) || 'Smart contract audit';
  const pending = audit.pending === true || (!url && !status);
  const placeholderLabel = sanitizeString(audit.placeholderLabel) || 'Audit in progress';
  const pendingName = sanitizeString(audit.pendingName) || 'Independent auditor';
  const displayStatus = status || (pending ? placeholderLabel : url ? 'Audit complete' : '');
  const logo = resolveMedia(audit.logo);
  const summary = sanitizeString(audit.summary);
  const show = Boolean(name || url || displayStatus || summary || logo);

  return {
    show,
    name: name || (pending ? pendingName : ''),
    url,
    status: displayStatus,
    badgeLabel,
    logo,
    summary,
    pending,
  };
});

const verification = computed(() => {
  const verificationConfig = trustSignalsConfig.value?.verification || {};
  const label = sanitizeString(verificationConfig.label) || 'Verified on Etherscan';
  const url =
    sanitizeString(verificationConfig.url) || sanitizeString(trustBarConfig.value?.etherscanUrl);
  const address =
    sanitizeString(verificationConfig.address) ||
    sanitizeString(trustBarConfig.value?.contractAddress);

  return {
    label,
    url,
    address,
    shortAddress: shortAddress(address),
  };
});

const hasVerification = computed(() => Boolean(verification.value.label || verification.value.shortAddress));
const hasVerificationLink = computed(() => Boolean(verification.value.url));

const partners = computed(() => {
  const items = Array.isArray(trustSignalsConfig.value?.partners)
    ? trustSignalsConfig.value.partners
    : [];

  return items
    .map((partner, index) => {
      if (!partner || typeof partner !== 'object') return null;
      const name = sanitizeString(partner.name);
      const url = sanitizeString(partner.url);
      const logo = resolveMedia(partner.logo);
      const caption = sanitizeString(partner.caption);

      if (!name && !logo) return null;

      return {
        id: partner.id || `partner-${index}`,
        name,
        url,
        logo,
        caption,
        initial: name ? name.charAt(0).toUpperCase() : 'P',
      };
    })
    .filter(Boolean);
});

const headingEyebrow = computed(
  () => sanitizeString(trustSignalsConfig.value?.eyebrow) || 'Trust & Security'
);

const headingTitle = computed(
  () => sanitizeString(trustSignalsConfig.value?.title) || 'Audit & Verification'
);

const subtitle = computed(() => sanitizeString(trustSignalsConfig.value?.subtitle));

const partnersTitle = computed(
  () => sanitizeString(trustSignalsConfig.value?.partnersTitle) || 'Security partners'
);

const summary = computed(() => {
  const explicit = sanitizeString(trustSignalsConfig.value?.summary);
  const base = explicit || auditInfo.value.summary;
  if (!base) return '';
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length <= 30) return base;
  return `${words.slice(0, 30).join(' ')}…`;
});

const summaryLabel = computed(
  () => sanitizeString(trustSignalsConfig.value?.summaryLabel) || 'Audit highlights'
);

const auditInitial = computed(() => {
  const name = auditInfo.value.name;
  return name ? name.charAt(0).toUpperCase() : 'A';
});

const shouldRender = computed(
  () =>
    auditInfo.value.show ||
    partners.value.length > 0 ||
    Boolean(summary.value) ||
    hasVerification.value
);

function handleAuditClick() {
  if (!auditInfo.value.url) return;
  trackEvent('trustsignals_audit_click', {
    token,
    audit_name: auditInfo.value.name,
    audit_status: auditInfo.value.status,
  });
}

function handleVerificationClick() {
  if (!verification.value.url) return;
  trackEvent('trustsignals_verification_click', {
    token,
    contract_address: (verification.value.address || '').toLowerCase(),
  });
  if (typeof window !== 'undefined') {
    window.open(verification.value.url, '_blank', 'noopener');
  }
}

function handlePartnerClick(partner) {
  if (!partner?.url) return;
  trackEvent('trustsignals_partner_click', {
    token,
    partner: partner.name,
  });
}
</script>

<style scoped>
.trust-signals {
  margin-top: 24px;
}

.trust-signals__surface {
  background: linear-gradient(140deg, rgba(12, 20, 42, 0.92) 0%, rgba(26, 12, 46, 0.9) 100%);
  border-radius: var(--brand-card-radius, 24px);
  border: 1px solid rgba(99, 102, 241, 0.35);
  box-shadow: var(--brand-surface-card-shadow, 0 8px 24px rgba(217, 22, 75, 0.18));
  padding: 24px;
  color: #f8fafc;
}

.trust-signals__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.trust-signals__heading {
  flex: 1 1 240px;
}

.trust-signals__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #a855f7;
}

.trust-signals__title {
  margin: 0;
  font-size: 1.25rem;
  letter-spacing: 0.03em;
  color: #f8fafc;
}

.trust-signals__subtitle {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.75);
}

.trust-signals__verification {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(45, 212, 191, 0.3);
  background: rgba(13, 148, 136, 0.12);
  font-weight: 600;
  font-size: 0.9rem;
  color: #5eead4;
  text-decoration: none;
  transition: background 0.2s ease, border 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.trust-signals__verification--static {
  cursor: default;
}

.trust-signals__verification:not(.trust-signals__verification--static):hover {
  background: rgba(13, 148, 136, 0.22);
  border-color: rgba(45, 212, 191, 0.55);
  color: #99f6e4;
  transform: translateY(-1px);
}

.trust-signals__verification-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
}

.trust-signals__verification-icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.trust-signals__verification-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.trust-signals__verification-address {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  opacity: 0.8;
}

.trust-signals__body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.75rem;
}

.trust-signals__audit-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.4rem;
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.3);
  background: rgba(76, 29, 149, 0.22);
  text-decoration: none;
  color: inherit;
  transition: border 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.trust-signals__audit-card:not(.trust-signals__audit-card--pending):hover {
  background: rgba(96, 165, 250, 0.24);
  border-color: rgba(96, 165, 250, 0.55);
  transform: translateY(-2px);
}

.trust-signals__audit-card--pending {
  border-color: rgba(249, 115, 22, 0.35);
  background: rgba(217, 119, 6, 0.16);
}

.trust-signals__logo {
  width: 56px;
  height: 56px;
  border-radius: var(--brand-radius-md, 14px);
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.trust-signals__logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.trust-signals__logo-fallback {
  font-size: 1.4rem;
  font-weight: 700;
  color: rgba(248, 250, 252, 0.9);
}

.trust-signals__audit-copy {
  flex: 1 1 auto;
}

.trust-signals__audit-badge {
  display: inline-block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(226, 232, 240, 0.6);
  margin-bottom: 0.25rem;
}

.trust-signals__audit-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #f8fafc;
}

.trust-signals__audit-status {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.75);
}

.trust-signals__partners {
  flex: 1 1 240px;
}

.trust-signals__partners-title {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(226, 232, 240, 0.7);
}

.trust-signals__partner-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.trust-signals__partner {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.8rem;
  border-radius: var(--brand-radius-md, 14px);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.45);
  color: rgba(226, 232, 240, 0.9);
  text-decoration: none;
  min-width: 0;
  transition: border 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.trust-signals__partner:hover {
  border-color: rgba(129, 140, 248, 0.55);
  background: rgba(79, 70, 229, 0.22);
  transform: translateY(-1px);
}

.trust-signals__partner-logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.trust-signals__partner-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.trust-signals__partner-fallback {
  font-size: 1rem;
  font-weight: 600;
}

.trust-signals__partner-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.trust-signals__partner-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f8fafc;
}

.trust-signals__partner-caption {
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.7);
}

.trust-signals__summary {
  margin: 1.35rem 0 0;
  font-size: 0.82rem;
  color: rgba(226, 232, 240, 0.75);
  line-height: 1.5;
}

.trust-signals__summary-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #a855f7;
  margin-right: 0.4rem;
}

@media (max-width: 768px) {
  .trust-signals__surface {
    padding: 20px;
  }

  .trust-signals__body {
    gap: 1.25rem;
  }

  .trust-signals__audit-card {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .trust-signals__body {
    flex-direction: row;
  }

  .trust-signals__audit-card {
    flex: 1 1 280px;
  }
}

@media (max-width: 480px) {
  .trust-signals__header {
    gap: 1rem;
  }

  .trust-signals__verification-text {
    align-items: flex-start;
  }

  .trust-signals__partner {
    width: 100%;
  }
}
</style>
