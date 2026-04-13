<template>
  <section
    v-if="isEnabled"
    class="curiosity-teaser"
    :aria-labelledby="headingId"
    data-analytics-section="curiosity_teaser"
  >
    <SbCard class="curiosity-teaser__card">
      <p v-if="eyebrow" class="curiosity-teaser__eyebrow">{{ eyebrow }}</p>
      <h2 class="curiosity-teaser__headline" :id="headingId">
        {{ headline }}
      </h2>
      <p v-if="description" class="curiosity-teaser__description">
        {{ description }}
      </p>
      <p
        v-if="disclaimer"
        class="curiosity-teaser__disclaimer"
        :id="disclaimerId"
      >
        {{ disclaimer }}
      </p>
      <div class="curiosity-teaser__actions">
        <button
          v-if="ctaMode === 'modal'"
          type="button"
          class="curiosity-teaser__cta curiosity-teaser__cta--secondary"
          @click="openModal"
          :aria-controls="dialogId"
          :aria-expanded="isModalOpen"
          :aria-describedby="disclaimer ? disclaimerId : undefined"
        >
          {{ ctaText }}
        </button>
        <a
          v-else-if="ctaMode === 'link' && ctaHref"
          class="curiosity-teaser__cta curiosity-teaser__cta--secondary curiosity-teaser__cta--link"
          :href="ctaHref"
          :target="ctaTarget"
          rel="noopener"
          @click="handlePrimaryLinkClick"
        >
          {{ ctaText }}
        </a>
      </div>
      <div v-if="communityLinks.length" class="curiosity-teaser__community">
        <p v-if="communityTitle" class="curiosity-teaser__community-title">
          {{ communityTitle }}
        </p>
        <ul class="curiosity-teaser__community-list">
          <li
            v-for="link in communityLinks"
            :key="link.id"
            class="curiosity-teaser__community-item"
          >
            <a
              :href="link.href"
              class="curiosity-teaser__community-link"
              :target="link.external ? '_blank' : undefined"
              :rel="link.external ? 'noopener noreferrer' : undefined"
              :aria-label="link.ariaLabel"
              @click="handleCommunityLinkClick(link)"
            >
              <span
                v-if="link.icon"
                class="curiosity-teaser__community-icon"
                aria-hidden="true"
              >
                {{ link.icon }}
              </span>
              <span class="curiosity-teaser__community-text">
                {{ link.text }}
              </span>
              <span v-if="link.external" class="sr-only">
                (opens in a new tab)
              </span>
            </a>
          </li>
        </ul>
      </div>
    </SbCard>

    <teleport to="body">
      <div
        v-if="ctaMode === 'modal' && isModalOpen"
        class="curiosity-modal"
        @keydown.esc.prevent.stop="closeModal"
      >
        <div class="curiosity-modal__backdrop" @click.self="closeModal">
          <div
            class="curiosity-modal__dialog"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="dialogTitleId"
            :aria-describedby="modalLead ? dialogDescriptionId : undefined"
            :id="dialogId"
            tabindex="-1"
            ref="dialogRef"
          >
            <button
              type="button"
              class="curiosity-modal__close"
              @click="closeModal"
              aria-label="Close teaser details"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h3 class="curiosity-modal__title" :id="dialogTitleId">
              {{ modalTitle }}
            </h3>
            <p
              v-if="modalLead"
              class="curiosity-modal__lead"
              :id="dialogDescriptionId"
            >
              {{ modalLead }}
            </p>
            <ul v-if="modalHighlights.length" class="curiosity-modal__list">
              <li
                v-for="item in modalHighlights"
                :key="item.id"
                class="curiosity-modal__item"
              >
                <span
                  v-if="item.icon"
                  class="curiosity-modal__item-icon"
                  aria-hidden="true"
                >
                  {{ item.icon }}
                </span>
                <div class="curiosity-modal__item-copy">
                  <p class="curiosity-modal__item-title">{{ item.title }}</p>
                  <p v-if="item.body" class="curiosity-modal__item-body">
                    {{ item.body }}
                  </p>
                </div>
              </li>
            </ul>
            <div v-if="rewardCode" class="curiosity-modal__code">
              <span class="curiosity-modal__code-label">{{ rewardCode.label }}</span>
              <code class="curiosity-modal__code-value">{{ rewardCode.value }}</code>
              <p v-if="rewardCode.description" class="curiosity-modal__code-note">
                {{ rewardCode.description }}
              </p>
            </div>
            <p v-if="modalFootnote" class="curiosity-modal__footnote">
              {{ modalFootnote }}
            </p>
            <a
              v-if="modalCta.href && modalCta.text"
              :href="modalCta.href"
              class="curiosity-modal__cta"
              :target="modalCta.external ? '_blank' : undefined"
              rel="noopener"
              @click="handleModalCtaClick"
            >
              {{ modalCta.text }}
            </a>
          </div>
        </div>
      </div>
    </teleport>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { trackEvent, trackFunnelEvent } from '@koehler8/cms/utils/analytics';
import SbCard from '@koehler8/cms/components/ui/SbCard.vue';

const pageContent = inject('pageContent', ref({}));

const uniqueId = `curiosity-${Math.random().toString(36).slice(2, 9)}`;

const rawConfig = computed(() => pageContent.value?.curiosityTeaser || {});

const sanitizeCopy = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isEnabled = computed(() => rawConfig.value?.enabled !== false && hasMeaningfulContent(rawConfig.value));
const eyebrow = computed(() => sanitizeCopy(rawConfig.value?.eyebrow));
const headline = computed(() => sanitizeCopy(rawConfig.value?.headline) || "Curious about what's next?");
const description = computed(() => sanitizeCopy(rawConfig.value?.description));
const disclaimer = computed(() => sanitizeCopy(rawConfig.value?.disclaimer));

const ctaText = computed(() => sanitizeCopy(rawConfig.value?.cta?.text) || 'Peek behind the curtain');
const ctaMode = computed(() => {
  const mode = sanitizeCopy(rawConfig.value?.cta?.mode).toLowerCase();
  if (mode === 'link' && sanitizeCopy(rawConfig.value?.cta?.href)) {
    return 'link';
  }
  if (rawConfig.value?.modal) {
    return 'modal';
  }
  if (sanitizeCopy(rawConfig.value?.cta?.href)) {
    return 'link';
  }
  return 'modal';
});
const ctaHref = computed(() => {
  if (ctaMode.value !== 'link') return '';
  const href = sanitizeCopy(rawConfig.value?.cta?.href);
  return href || '';
});
const ctaTarget = computed(() => (rawConfig.value?.cta?.external ? '_blank' : undefined));
const communityTitle = computed(() => sanitizeCopy(rawConfig.value?.community?.title));
const communityLinks = computed(() => normalizeCommunityLinks(rawConfig.value?.community?.links));

const modalTitle = computed(() => sanitizeCopy(rawConfig.value?.modal?.title) || headline.value);
const modalLead = computed(() => sanitizeCopy(rawConfig.value?.modal?.lead || rawConfig.value?.modal?.description));
const modalFootnote = computed(() => sanitizeCopy(rawConfig.value?.modal?.footnote));
const modalHighlights = computed(() => normalizeHighlights(rawConfig.value?.modal?.highlights));
const rewardCode = computed(() => normalizeReward(rawConfig.value?.modal?.rewardCode));
const modalCta = computed(() => normalizeModalCta(rawConfig.value?.modal?.cta));

const headingId = `${uniqueId}-heading`;
const disclaimerId = `${uniqueId}-note`;
const dialogId = `${uniqueId}-dialog`;
const dialogTitleId = `${uniqueId}-dialog-title`;
const dialogDescriptionId = `${uniqueId}-dialog-description`;

const isModalOpen = ref(false);
const dialogRef = ref(null);
const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function trackSecretDropInteraction(trigger) {
  trackFunnelEvent('secret_drop_peek', {
    source: 'curiosity_teaser',
    trigger,
    mode: ctaMode.value,
    cta_text: ctaText.value,
  });
}

function handlePrimaryLinkClick() {
  trackSecretDropInteraction('link_click');
  const href = ctaHref.value || '';
  const text = ctaText.value || '';
  const hrefLower = href.toLowerCase();
  const textLower = text.toLowerCase();
  if (hrefLower.includes('playbook') || textLower.includes('playbook')) {
    trackFunnelEvent('playbook_view', {
      source: 'curiosity_primary_cta',
      href,
      label: text,
    });
  }
}

function handleCommunityLinkClick(link) {
  const href = link?.href || '';
  trackEvent('curiosity_teaser_community_click', {
    id: link?.id || '',
    href,
  });
  const hrefLower = href.toLowerCase();
  if (hrefLower.includes('t.me') || hrefLower.includes('telegram')) {
    trackFunnelEvent('social_telegram_click', {
      source: 'curiosity_teaser',
      href,
      label: link?.text || '',
    });
  } else if (hrefLower.includes('twitter') || hrefLower.includes('x.com')) {
    trackFunnelEvent('social_twitter_click', {
      source: 'curiosity_teaser',
      href,
      label: link?.text || '',
    });
  }
}

function handleModalCtaClick() {
  const href = modalCta.value?.href || '';
  const text = modalCta.value?.text || '';
  if (!href && !text) return;
  trackEvent('curiosity_modal_cta_click', {
    href,
    label: text,
  });
  const hrefLower = href.toLowerCase();
  const textLower = text.toLowerCase();
  if (hrefLower.includes('playbook') || textLower.includes('playbook')) {
    trackFunnelEvent('playbook_view', {
      source: 'curiosity_modal_cta',
      href,
      label: text,
    });
  }
}

function hasMeaningfulContent(config) {
  if (!config || typeof config !== 'object') return false;
  return Boolean(sanitizeCopy(config.headline) || sanitizeCopy(config.description) || sanitizeCopy(config.cta?.text));
}

function normalizeHighlights(entries) {
  const items = Array.isArray(entries) ? entries : [];
  return items
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const title = sanitizeCopy(entry.title);
      const body = sanitizeCopy(entry.body);
      const icon = sanitizeCopy(entry.icon);
      if (!title && !body) return null;
      return {
        id: entry.id || `highlight-${index}`,
        title: title || body,
        body,
        icon: icon || '',
      };
    })
    .filter(Boolean);
}

function normalizeReward(rawReward) {
  if (!rawReward || typeof rawReward !== 'object') return null;
  const value = sanitizeCopy(rawReward.value);
  if (!value) return null;
  return {
    label: sanitizeCopy(rawReward.label) || 'Whisper code',
    value,
    description: sanitizeCopy(rawReward.description),
  };
}

function normalizeModalCta(rawCta) {
  if (!rawCta || typeof rawCta !== 'object') return { text: '', href: '' };
  const text = sanitizeCopy(rawCta.text);
  const href = sanitizeCopy(rawCta.href);
  if (!text || !href) {
    return { text: '', href: '' };
  }
  return {
    text,
    href,
    external: Boolean(rawCta.external),
  };
}

function normalizeCommunityLinks(rawLinks) {
  const links = Array.isArray(rawLinks) ? rawLinks : [];
  return links
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const text = sanitizeCopy(entry.text || entry.label);
      const href = sanitizeCopy(entry.href);
      if (!text || !href) return null;

      const icon = sanitizeCopy(entry.icon);
      const ariaLabel =
        sanitizeCopy(entry.ariaLabel) ||
        (entry.external !== false ? `${text} (opens in a new tab)` : text);

      return {
        id: sanitizeCopy(entry.id) || `community-link-${index}`,
        text,
        href,
        icon,
        external: entry.external !== false,
        ariaLabel,
      };
    })
    .filter(Boolean);
}

function openModal() {
  if (ctaMode.value !== 'modal') return;
  trackSecretDropInteraction('modal_open');
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

const trapFocus = (event) => {
  if (!isModalOpen.value) return;
  if (event.key !== 'Tab') return;
  const dialogEl = dialogRef.value;
  if (!dialogEl) return;
  const focusable = dialogEl.querySelectorAll(focusableSelector);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey) {
    if (active === first || !dialogEl.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    event.preventDefault();
    first.focus();
  }
};

watch(isModalOpen, (open) => {
  if (typeof document === 'undefined') return;
  if (open) {
    document.addEventListener('keydown', trapFocus);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        dialogRef.value?.focus();
      });
    } else {
      dialogRef.value?.focus();
    }
  } else {
    document.removeEventListener('keydown', trapFocus);
  }
});

onMounted(() => {
  if (typeof document === 'undefined') return;
  if (isModalOpen.value) {
    document.addEventListener('keydown', trapFocus);
  }
});

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  document.removeEventListener('keydown', trapFocus);
});

watch(ctaMode, (mode) => {
  if (mode !== 'modal') {
    isModalOpen.value = false;
  }
});
</script>

<style scoped>
.curiosity-teaser {
  margin: 3.5rem auto 3rem;
  padding: 3rem 1.5rem 0;
  max-width: 58rem;
  border-top: 1px solid color-mix(in srgb, var(--brand-fg-300, #a798b0) 18%, transparent);
}

@media (min-width: 992px) {
  .curiosity-teaser {
    margin: 4.5rem auto 4rem;
    padding: 4rem 2rem 0;
  }
}

.curiosity-teaser__card {
  position: relative;
  overflow: hidden;
  color: #fdf5ff;
  background: color-mix(in srgb, var(--brand-bg-900, #0a0a0d) 88%, transparent);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--brand-card-radius, 24px);
  box-shadow: 0 16px 36px rgba(10, 8, 14, 0.46);
}

.curiosity-teaser__card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(255, 120, 216, 0.12), transparent 45%),
    linear-gradient(145deg, rgba(39, 243, 255, 0.05), transparent 55%);
  pointer-events: none;
}

.curiosity-teaser__card > * {
  position: relative;
  z-index: 1;
}

.curiosity-teaser__eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(255, 255, 255, 0.72);
}

.curiosity-teaser__headline {
  margin: 0 0 1rem;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(2.25rem, 4vw, 3.5rem);
  line-height: 1.1;
  font-weight: 700;
}

.curiosity-teaser__description {
  margin: 0 0 1.25rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: clamp(1rem, 2.4vw, 1.125rem);
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

.curiosity-teaser__disclaimer {
  margin: 0 0 1.5rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: clamp(0.875rem, 2vw, 0.95rem);
  color: rgba(255, 255, 255, 0.65);
}

.curiosity-teaser__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-start;
}

.curiosity-teaser__community {
  margin-top: 2.25rem;
  padding-top: 1.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.curiosity-teaser__community-title {
  margin: 0 0 1rem;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1.05rem, 2.4vw, 1.25rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
}

.curiosity-teaser__community-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.curiosity-teaser__community-item {
  margin: 0;
}

.curiosity-teaser__community-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 500;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  text-decoration: none;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.curiosity-teaser__community-link:hover,
.curiosity-teaser__community-link:focus {
  color: var(--brand-electric-blue, #27f3ff);
  text-decoration: underline;
  text-decoration-color: rgba(39, 243, 255, 0.4);
}

.curiosity-teaser__community-link:focus {
  outline: 2px solid rgba(39, 243, 255, 0.35);
  outline-offset: 3px;
}

.curiosity-teaser__community-icon {
  display: inline-flex;
  font-size: 1.1rem;
}

.curiosity-teaser__community-text {
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.curiosity-teaser__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 10.5rem;
  padding: 0.75rem 1.65rem;
  border-radius: var(--brand-button-radius, 14px);
  border: 1px solid rgba(154, 46, 255, 0.32);
  background: color-mix(in srgb, var(--brand-bg-900, #0a0a0d) 78%, transparent);
  color: color-mix(in srgb, var(--brand-electric-blue, #27f3ff) 78%, #ffffff 12%);
  font-weight: 600;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  text-decoration: none;
}

.curiosity-teaser__cta:hover,
.curiosity-teaser__cta:focus {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--brand-electric-blue, #27f3ff) 12%, transparent);
  box-shadow: 0 14px 28px rgba(39, 243, 255, 0.18);
}

.curiosity-teaser__cta--link {
  border-color: rgba(154, 46, 255, 0.24);
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
}

.curiosity-teaser__cta--link:hover,
.curiosity-teaser__cta--link:focus {
  color: var(--brand-electric-blue, #27f3ff);
  border-color: rgba(39, 243, 255, 0.45);
}

.curiosity-teaser__cta--link:focus-visible {
  outline: 2px solid rgba(39, 243, 255, 0.4);
  outline-offset: 3px;
}

.curiosity-teaser__cta--secondary {
  color: rgba(255, 255, 255, 0.82);
}

.curiosity-teaser__cta:focus-visible {
  outline: 2px solid rgba(39, 243, 255, 0.35);
  outline-offset: 3px;
}

.curiosity-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
}

.curiosity-modal__backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(7, 5, 12, 0.75);
  padding: 1.25rem;
}

.curiosity-modal__dialog {
  position: relative;
  max-width: 34rem;
  width: 100%;
  padding: 2.5rem 2rem 2rem;
  border-radius: var(--brand-modal-radius, 24px);
  background: linear-gradient(150deg, rgba(10, 10, 13, 0.96), rgba(20, 18, 22, 0.9));
  color: rgba(240, 234, 243, 0.95);
  box-shadow: var(--brand-modal-shadow, 0 8px 24px rgba(217, 22, 75, 0.18));
  outline: none;
}

.curiosity-modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.curiosity-modal__close:hover,
.curiosity-modal__close:focus {
  color: var(--brand-neon-pink, #ff2d86);
}

.curiosity-modal__title {
  margin: 0 0 1rem;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.1;
  font-weight: 700;
}

.curiosity-modal__lead {
  margin: 0 0 1.5rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: clamp(0.95rem, 2.3vw, 1.05rem);
  color: rgba(255, 255, 255, 0.78);
}

.curiosity-modal__list {
  margin: 0 0 1.75rem;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1rem;
}

.curiosity-modal__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 1rem;
  border-radius: var(--brand-radius-md, 14px);
  background: rgba(255, 255, 255, 0.05);
}

.curiosity-modal__item-icon {
  font-size: 1.5rem;
}

.curiosity-modal__item-title {
  margin: 0 0 0.35rem;
  font-size: 1.0625rem;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 600;
}

.curiosity-modal__item-body {
  margin: 0;
  font-size: clamp(0.9rem, 2.1vw, 0.98rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(255, 255, 255, 0.75);
}

.curiosity-modal__code {
  margin: 0 0 1.5rem;
  padding: 1.25rem;
  border-radius: var(--brand-radius-md, 14px);
  border: 1px dashed rgba(39, 243, 255, 0.35);
  background: rgba(39, 243, 255, 0.08);
}

.curiosity-modal__code-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(201, 191, 208, 0.85);
}

.curiosity-modal__code-value {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 45, 134, 0.18);
  font-size: 1.125rem;
  font-weight: 700;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  letter-spacing: 0.04em;
}

.curiosity-modal__code-note {
  margin: 0.75rem 0 0;
  font-size: clamp(0.875rem, 2.1vw, 0.95rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(255, 255, 255, 0.72);
}

.curiosity-modal__footnote {
  margin: 0 0 1.5rem;
  font-size: clamp(0.85rem, 2vw, 0.95rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(255, 255, 255, 0.65);
}

.curiosity-modal__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 1.75rem;
  border-radius: var(--brand-button-radius, 14px);
  background: var(
    --brand-primary-cta-gradient,
    linear-gradient(135deg, #ff2d86 0%, #9a2eff 55%, #27f3ff 100%)
  );
  color: var(--brand-primary-cta-text, #0a0a0d);
  font-weight: 700;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  text-decoration: none;
  box-shadow: var(--brand-primary-cta-shadow, 0 18px 40px rgba(255, 45, 134, 0.45));
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.curiosity-modal__cta:hover,
.curiosity-modal__cta:focus {
  transform: translateY(-1px);
  box-shadow: var(--brand-primary-cta-hover-shadow, 0 20px 44px rgba(255, 45, 134, 0.55));
}

@media (max-width: 640px) {
  .curiosity-teaser {
    padding: 2.5rem 1rem;
  }

  .curiosity-teaser__card {
    padding: 1.75rem;
  }

  .curiosity-teaser__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .curiosity-teaser__community-list {
    flex-direction: column;
  }

  .curiosity-teaser__community-link {
    justify-content: center;
  }

  .curiosity-modal__dialog {
    padding: 2rem 1.5rem 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .curiosity-teaser__cta,
  .curiosity-modal__cta {
    transition: none;
  }
}
</style>
