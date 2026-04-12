<template>
  <section
    v-if="stripVisible"
    class="community-strip"
    role="complementary"
    :aria-label="resolvedTitle"
  >
    <div class="community-strip__container">
      <SbCard class="community-strip__card" :padded="false">
        <header class="community-strip__header">
          <h2 class="community-strip__title">{{ resolvedTitle }}</h2>
          <p v-if="resolvedSubtitle" class="community-strip__subtitle">
            {{ resolvedSubtitle }}
          </p>
        </header>

        <div class="community-strip__content">
          <div v-if="socialEntries.length" class="community-strip__social">
            <article
              v-for="(entry, index) in socialEntries"
              :key="entry.id || index"
              class="community-strip__social-card"
            >
              <span class="community-strip__social-icon" aria-hidden="true">
                <component
                  v-if="entry.iconComponent"
                  :is="entry.iconComponent"
                  class="community-strip__icon-svg"
                />
                <span v-else-if="entry.icon" class="community-strip__icon-symbol">
                  {{ entry.icon }}
                </span>
              </span>
              <div class="community-strip__social-meta">
                <span class="community-strip__social-label">{{ entry.label }}</span>
                <span class="community-strip__social-count">
                  {{ entry.count }}
                  <span v-if="entry.countApprox" class="community-strip__approx">(est.)</span>
                </span>
              </div>
              <a
                class="community-strip__social-link"
                :href="entry.href"
                target="_blank"
                rel="noopener"
                :aria-label="entry.ariaLabel"
                @click="trackSocialClick(entry)"
              >
                {{ entry.cta || 'Open' }}
              </a>
            </article>
          </div>

          <div v-if="emailEnabled" class="community-strip__email">
            <p v-if="emailDescription" class="community-strip__email-description">
              {{ emailDescription }}
            </p>
            <form class="community-strip__email-form" @submit.prevent="handleEmailSubmit" novalidate>
              <label class="visually-hidden" :for="emailFieldId">{{ emailLabel }}</label>
              <input
                :id="emailFieldId"
                class="community-strip__email-input"
                type="email"
                :placeholder="emailPlaceholder"
                autocomplete="email"
                v-model.trim="emailValue"
                :disabled="emailStatus === 'submitting'"
                required
              />
              <button
                class="community-strip__email-button"
                type="submit"
                :disabled="emailStatus === 'submitting'"
              >
                {{ emailStatus === 'submitting' ? 'Submitting…' : emailButtonText }}
              </button>
            </form>
            <p
              v-if="emailStatus === 'success'"
              class="community-strip__feedback community-strip__feedback--success"
            >
              {{ emailSuccessMessage }}
            </p>
            <p
              v-if="emailStatus === 'error'"
              class="community-strip__feedback community-strip__feedback--error"
            >
              {{ emailErrorMessage }}
            </p>
          </div>
        </div>
      </SbCard>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, reactive, ref, watch } from 'vue';
import { trackEvent, trackFunnelEvent } from '@d2sg/cms/utils/analytics';
import SbCard from '@d2sg/cms/components/ui/SbCard.vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Stay aligned with the crew',
  },
  subtitle: {
    type: String,
    default: '',
  },
  socials: {
    type: Array,
    default: () => [],
  },
  email: {
    type: Object,
    default: () => ({}),
  },
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailValue = ref('');
const emailStatus = ref('idle'); // idle | submitting | success | error
const emailErrorMessage = ref('');
const emailSuccessMessage = ref('');
const emailFieldId = `community-email-${Math.random().toString(36).slice(2, 9)}`;

const pageContent = inject('pageContent', ref({}));

const configFromContent = computed(() => pageContent.value?.communityStrip || {});

const resolvedTitle = computed(() => {
  const param = [props.title, configFromContent.value?.title, 'Stay in the loop with the crew'];
  return param.find((value) => typeof value === 'string' && value.trim())?.trim();
});

const resolvedSubtitle = computed(() => {
  const param = [props.subtitle, configFromContent.value?.subtitle];
  const value = param.find((entry) => typeof entry === 'string' && entry.trim());
  return value ? value.trim() : '';
});

const resolvedSocials = computed(() => {
  const socials =
    Array.isArray(props.socials) && props.socials.length
      ? props.socials
      : Array.isArray(configFromContent.value?.socials)
      ? configFromContent.value.socials
      : [];
  return socials;
});

function resolveSocialAriaLabel({ ariaLabel, label, cta, href }) {
  if (ariaLabel) {
    return ariaLabel;
  }

  const action = cta || 'Open';
  const destination = label || 'community channel';
  const base = `${action} ${destination} for this community`.trim();
  const opensInNewTab = typeof href === 'string' && href.startsWith('http');

  return opensInNewTab ? `${base} (opens in a new tab)` : base;
}

const sanitizedSocials = computed(() =>
  resolvedSocials.value
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const href = typeof item.href === 'string' ? item.href.trim() : '';
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      const count =
        typeof item.count === 'string'
          ? item.count.trim()
          : Number.isFinite(item.count)
          ? String(item.count)
          : '';

      return {
        id: item.id || `social-${index}`,
        href: href || '#',
        label: label || 'Community',
        count: count || '—',
        countApprox: Boolean(item.countApprox),
        icon: item.icon,
        iconComponent: item.iconComponent,
        iconLabel: item.iconLabel,
        cta: typeof item.cta === 'string' && item.cta.trim() ? item.cta.trim() : 'Open',
        ariaLabel: resolveSocialAriaLabel({
          href,
          label: label || 'Community channel',
          cta: typeof item.cta === 'string' && item.cta.trim() ? item.cta.trim() : 'Open',
          ariaLabel: typeof item.ariaLabel === 'string' ? item.ariaLabel.trim() : '',
        }),
        analytics: item.analytics || {},
      };
    })
);

const socialEntries = computed(() =>
  sanitizedSocials.value.slice(0, 4)
);

const resolvedEmail = computed(() => {
  const override = props.email || {};
  const configEmail = configFromContent.value?.email || {};
  return { ...configEmail, ...override };
});

const emailConfig = reactive({
  enabled: false,
  endpoint: '',
  method: 'POST',
  placeholder: 'you@example.com',
  buttonText: 'Subscribe',
  successMessage: 'Thanks! Check your inbox shortly.',
  errorMessage: 'We could not submit your email. Try again.',
  description: '',
  label: 'Email address',
  headers: null,
  payloadFieldName: 'email',
  extraFields: null,
});

watch(
  resolvedEmail,
  (value) => {
    emailConfig.enabled = Boolean(value?.enabled) && Boolean(value?.endpoint);
    emailConfig.endpoint =
      typeof value?.endpoint === 'string' && value.endpoint.trim() ? value.endpoint.trim() : '';
    emailConfig.method =
      typeof value?.method === 'string' && value.method.trim()
        ? value.method.trim().toUpperCase()
        : 'POST';
    emailConfig.placeholder =
      typeof value?.placeholder === 'string' && value.placeholder.trim()
        ? value.placeholder.trim()
        : 'you@example.com';
    emailConfig.buttonText =
      typeof value?.button === 'string' && value.button.trim()
        ? value.button.trim()
        : 'Subscribe';
    emailConfig.successMessage =
      typeof value?.successMessage === 'string' && value.successMessage.trim()
        ? value.successMessage.trim()
        : 'Thanks! Check your inbox shortly.';
    emailConfig.errorMessage =
      typeof value?.errorMessage === 'string' && value.errorMessage.trim()
        ? value.errorMessage.trim()
        : 'We could not submit your email. Try again.';
    emailConfig.description =
      typeof value?.description === 'string' && value.description.trim()
        ? value.description.trim()
        : '';
    emailConfig.label =
      typeof value?.label === 'string' && value.label.trim() ? value.label.trim() : 'Email address';
    emailConfig.headers =
      value?.headers && typeof value.headers === 'object' ? { ...value.headers } : null;
    emailConfig.payloadFieldName =
      typeof value?.payloadFieldName === 'string' && value.payloadFieldName.trim()
        ? value.payloadFieldName.trim()
        : 'email';
    emailConfig.extraFields =
      value?.extraFields && typeof value.extraFields === 'object' ? { ...value.extraFields } : null;

    if (!emailConfig.enabled) {
      emailValue.value = '';
      emailStatus.value = 'idle';
      emailErrorMessage.value = '';
      emailSuccessMessage.value = '';
    }
  },
  { immediate: true }
);

const emailEnabled = computed(() => emailConfig.enabled && emailConfig.endpoint);
const emailPlaceholder = computed(() => emailConfig.placeholder);
const emailButtonText = computed(() => emailConfig.buttonText);
const emailDescription = computed(() => emailConfig.description);
const emailLabel = computed(() => emailConfig.label);
const stripVisible = computed(() => socialEntries.value.length > 0 || emailEnabled.value);

function trackSocialClick(entry) {
  const href = entry?.href || '';
  const label = entry?.label || '';
  trackEvent('community_strip_social_click', {
    channel: entry.analytics?.channel || label.toLowerCase() || 'social',
    href,
  });
  const hrefLower = href.toLowerCase();
  if (hrefLower.includes('t.me') || hrefLower.includes('telegram')) {
    trackFunnelEvent('social_telegram_click', {
      source: 'community_strip',
      href,
      label,
    });
  } else if (hrefLower.includes('twitter') || hrefLower.includes('x.com')) {
    trackFunnelEvent('social_twitter_click', {
      source: 'community_strip',
      href,
      label,
    });
  }
}

async function handleEmailSubmit() {
  if (!emailEnabled.value) return;

  const email = emailValue.value.trim();
  if (!EMAIL_REGEX.test(email)) {
    emailStatus.value = 'error';
    emailErrorMessage.value = emailConfig.errorMessage || 'Please enter a valid email address.';
    return;
  }

  emailStatus.value = 'submitting';
  emailErrorMessage.value = '';
  emailSuccessMessage.value = '';

  const payload = {
    [emailConfig.payloadFieldName || 'email']: email,
  };

  if (emailConfig.extraFields) {
    Object.entries(emailConfig.extraFields).forEach(([key, value]) => {
      if (key) payload[key] = value;
    });
  }

  const headers = emailConfig.headers ? { ...emailConfig.headers } : {};
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const method = emailConfig.method || 'POST';
  const contentType = headers['Content-Type'] || headers['content-type'] || '';
  let body;
  if (contentType.includes('application/json')) {
    body = JSON.stringify(payload);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    body = new URLSearchParams(payload).toString();
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(emailConfig.endpoint, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Email submission failed with status ${response.status}`);
    }

    emailStatus.value = 'success';
    emailSuccessMessage.value = emailConfig.successMessage;
    emailValue.value = '';

    trackEvent('community_strip_email_success', {
      endpoint: emailConfig.endpoint || '',
    });
  } catch (error) {
    console.error('Failed to submit community email signup', error);
    emailStatus.value = 'error';
    emailErrorMessage.value = emailConfig.errorMessage;

    trackEvent('community_strip_email_error', {
      endpoint: emailConfig.endpoint || '',
      error_name: error?.name || 'unknown',
    });
  }
}
</script>

<style scoped>
.community-strip {
  margin: 0;
  padding: 60px 0;
  background: var(--community-strip-bg, rgba(12, 15, 31, 0.88));
  border-top: 1px solid var(--community-strip-border, rgba(39, 243, 255, 0.18));
  border-bottom: 1px solid var(--community-strip-border, rgba(39, 243, 255, 0.12));
}

@media (min-width: 992px) {
  .community-strip {
    padding: 90px 0;
  }
}

.community-strip__container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

.community-strip__card {
  padding: 32px 24px;
  background: var(--community-strip-card-bg, rgba(10, 10, 13, 0.92));
}

@media (min-width: 992px) {
  .community-strip__card {
    padding: 40px 36px;
  }
}

.community-strip__header {
  text-align: center;
  margin-bottom: 32px;
}

.community-strip__title {
  margin: 0 0 12px;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(2.25rem, 4.5vw, 3rem);
  font-weight: 700;
  color: var(--community-strip-title-color, #f1f5f9);
}

.community-strip__subtitle {
  margin: 0;
  margin-top: 8px;
  font-size: clamp(0.95rem, 2.3vw, 1.05rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: var(--community-strip-subtitle-color, rgba(226, 232, 240, 0.7));
}

.community-strip__content {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: center;
  align-items: stretch;
}

.community-strip__social {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  flex: 2;
}

.community-strip__social-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--community-strip-card-border, rgba(39, 243, 255, 0.25));
  background: var(
    --community-strip-social-bg,
    radial-gradient(circle at top left, rgba(10, 10, 13, 0.75), rgba(20, 18, 22, 0.85))
  );
  color: var(--community-strip-color, rgba(240, 234, 243, 0.92));
  transition: transform 0.2s ease, border 0.2s ease;
}

.community-strip__social-card:hover,
.community-strip__social-card:focus-within {
  border-color: var(--community-strip-card-border-hover, rgba(39, 243, 255, 0.45));
  transform: translateY(-2px);
}

.community-strip__social-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(39, 243, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--brand-electric-blue, #27f3ff);
}

.community-strip__icon-symbol {
  font-weight: 600;
}

.community-strip__icon-svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.community-strip__social-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.community-strip__social-label {
  font-size: clamp(0.75rem, 2vw, 0.85rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(226, 232, 240, 0.72);
}

.community-strip__social-count {
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 700;
}

.community-strip__approx {
  font-size: clamp(0.68rem, 2vw, 0.75rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  margin-left: 4px;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.65);
}

.community-strip__social-link {
  font-size: clamp(0.75rem, 2vw, 0.85rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--community-strip-link-color, var(--brand-electric-blue, #27f3ff));
  text-decoration: none;
  border: 1px solid var(--community-strip-link-border, rgba(39, 243, 255, 0.3));
  border-radius: var(--brand-button-radius, 14px);
  padding: 8px 12px;
  transition: background 0.2s ease, color 0.2s ease, border 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.community-strip__social-link:hover,
.community-strip__social-link:focus {
  background: var(--community-strip-link-hover-bg, rgba(39, 243, 255, 0.18));
  border-color: var(--community-strip-link-hover-border, rgba(39, 243, 255, 0.45));
  color: var(--community-strip-link-hover-color, var(--brand-neon-pink, #ff2d86));
  transform: translateY(-1px);
  box-shadow: var(--community-strip-link-hover-shadow, 0 12px 24px rgba(39, 243, 255, 0.18));
}

.community-strip__social-link:focus-visible {
  outline: 2px solid rgba(39, 243, 255, 0.55);
  outline-offset: 3px;
}

.community-strip__email {
  flex: 1;
  min-width: 260px;
  max-width: 360px;
  background: var(--community-strip-email-bg, rgba(15, 23, 42, 0.65));
  border: 1px solid var(--community-strip-email-border, rgba(59, 130, 246, 0.18));
  border-radius: var(--brand-card-radius, 24px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--brand-surface-card-shadow, 0 8px 24px rgba(217, 22, 75, 0.18));
}

.community-strip__email-description {
  margin: 0;
  font-size: clamp(0.9rem, 2.2vw, 1rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: var(--community-strip-email-text, rgba(226, 232, 240, 0.78));
}

.community-strip__email-form {
  display: flex;
  gap: 10px;
}

.community-strip__email-input {
  flex: 1;
  min-width: 0;
  border-radius: 12px;
  border: 1px solid var(--community-strip-email-input-border, rgba(39, 243, 255, 0.28));
  background: var(--community-strip-email-input-bg, rgba(10, 10, 13, 0.78));
  color: var(--community-strip-email-input-color, rgba(240, 234, 243, 0.92));
  padding: 10px 12px;
  font-size: clamp(0.9rem, 2.2vw, 1rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
}

.community-strip__email-input::placeholder {
  color: var(--community-strip-email-input-placeholder, rgba(201, 191, 208, 0.6));
}

.community-strip__email-button {
  border-radius: 12px;
  border: 1px solid var(--community-strip-email-button-border, rgba(39, 243, 255, 0.35));
  background: var(
    --community-strip-email-button-bg,
    linear-gradient(135deg, rgba(39, 243, 255, 0.22), rgba(255, 45, 134, 0.18))
  );
  color: var(--community-strip-email-button-color, var(--brand-fg-100, #f0eaf3));
  font-size: clamp(0.75rem, 2vw, 0.85rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.community-strip__email-button:hover,
.community-strip__email-button:focus {
  background: var(
    --community-strip-email-button-hover-bg,
    linear-gradient(135deg, rgba(39, 243, 255, 0.32), rgba(255, 45, 134, 0.22))
  );
  border-color: var(--community-strip-email-button-hover-border, rgba(255, 45, 134, 0.45));
  transform: translateY(-1px);
  box-shadow: var(--community-strip-email-button-hover-shadow, 0 14px 28px rgba(39, 243, 255, 0.18));
}

.community-strip__email-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.community-strip__feedback {
  margin: 0;
  font-size: clamp(0.8rem, 2vw, 0.95rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
}

.community-strip__feedback--success {
  color: var(--brand-status-success, #27f3ff);
}

.community-strip__feedback--error {
  color: var(--brand-status-error, #d9164b);
}

@media (max-width: 768px) {
  .community-strip__content {
    flex-direction: column;
  }

  .community-strip__social {
    width: 100%;
  }

  .community-strip__email {
    width: 100%;
  }

  .community-strip__email-form {
    flex-direction: column;
  }

  .community-strip__email-button {
    width: 100%;
  }
}
</style>
