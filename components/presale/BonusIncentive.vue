<template>
  <SbCard
    tag="section"
    class="bonus-incentive"
    :class="{ 'bonus-incentive--depleted': isDepleted }"
    role="status"
    :aria-live="ariaLive"
  >
    <header class="bonus-incentive__header">
      <p v-if="badgeText" class="bonus-incentive__badge">{{ badgeText }}</p>
      <span v-if="bonusValueText" class="bonus-incentive__pill">{{ bonusValueText }}</span>
    </header>
    <h3 class="bonus-incentive__headline">
      {{ headlineText }}
    </h3>
    <p v-if="descriptionText" class="bonus-incentive__description">
      {{ descriptionText }}
    </p>
    <p v-if="bonusLabelText" class="bonus-incentive__tagline">
      {{ bonusLabelText }}
    </p>
    <div class="bonus-incentive__metrics">
      <div class="bonus-incentive__counter">
        <span class="bonus-incentive__count-main">{{ remainingDisplay }}</span>
        <span class="bonus-incentive__count-sub">{{ countMeta }}</span>
      </div>
      <div v-if="countdownDisplay" class="bonus-incentive__countdown">
        <span class="bonus-incentive__countdown-label">{{ countdownLabelText }}</span>
        <span class="bonus-incentive__countdown-value">{{ countdownDisplay }}</span>
      </div>
    </div>
    <div
      v-if="progressPercent !== null"
      class="bonus-incentive__progress"
      role="progressbar"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="progressPercent"
      :aria-label="progressAriaLabel"
    >
      <span class="bonus-incentive__progress-bar" :style="{ width: progressWidth }"></span>
    </div>
    <p v-if="footnoteText" class="bonus-incentive__footnote">
      {{ footnoteText }}
    </p>
    <a
      v-if="ctaText && ctaHref"
      class="bonus-incentive__cta"
      :href="ctaHref"
      :target="ctaTarget"
      :rel="ctaRel"
      @click="emit('cta-click')"
    >
      {{ ctaText }}
    </a>
  </SbCard>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SbCard from '@d2sg/cms/components/ui/SbCard.vue';

const props = defineProps({
  badge: {
    type: String,
    default: '',
  },
  headline: {
    type: String,
    default: 'Early buyer bonus live',
  },
  description: {
    type: String,
    default: '',
  },
  bonusLabel: {
    type: String,
    default: '',
  },
  bonusValue: {
    type: String,
    default: '',
  },
  total: {
    type: Number,
    default: null,
  },
  remaining: {
    type: Number,
    default: null,
  },
  footnote: {
    type: String,
    default: '',
  },
  cta: {
    type: Object,
    default: () => ({
      text: '',
      href: '',
      external: false,
    }),
  },
  countdownLabel: {
    type: String,
    default: '',
  },
  expiresAt: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['cta-click']);

const totalCount = computed(() => {
  const value = Number.isFinite(props.total) ? Math.floor(props.total) : null;
  if (value === null || value < 0) return null;
  return value;
});

const remainingCount = computed(() => {
  const value = Number.isFinite(props.remaining) ? Math.floor(props.remaining) : null;
  if (value === null) return null;
  return value < 0 ? 0 : value;
});

const claimedCount = computed(() => {
  if (totalCount.value === null || remainingCount.value === null) return null;
  const claimed = totalCount.value - remainingCount.value;
  return claimed < 0 ? 0 : claimed;
});

const progressPercent = computed(() => {
  if (totalCount.value === null || claimedCount.value === null || totalCount.value === 0) {
    return null;
  }
  const ratio = (claimedCount.value / totalCount.value) * 100;
  return Math.min(Math.max(Math.round(ratio), 0), 100);
});

const progressWidth = computed(() => (progressPercent.value === null ? '0%' : `${progressPercent.value}%`));

const progressAriaLabel = computed(() => {
  if (claimedCount.value === null || totalCount.value === null) return 'Bonus claim progress';
  return `${claimedCount.value.toLocaleString()} of ${totalCount.value.toLocaleString()} bonuses claimed`;
});

const isDepleted = computed(() => remainingCount.value !== null && remainingCount.value <= 0);

const remainingDisplay = computed(() => {
  if (remainingCount.value === null) return 'Bonus available';
  if (remainingCount.value === 0) return 'Bonus depleted';
  return `${remainingCount.value.toLocaleString()} left`;
});

const countMeta = computed(() => {
  if (totalCount.value !== null) {
    return `of ${totalCount.value.toLocaleString()} bonus slots`;
  }
  if (props.bonusLabel) {
    return props.bonusLabel;
  }
  return 'Limited quantity';
});

const badgeText = computed(() => props.badge);
const headlineText = computed(() => props.headline);
const descriptionText = computed(() => props.description);
const bonusLabelText = computed(() => props.bonusLabel);
const bonusValueText = computed(() => props.bonusValue);
const footnoteText = computed(() => props.footnote);

const ctaText = computed(() => (typeof props.cta?.text === 'string' ? props.cta.text : ''));
const ctaHref = computed(() => (typeof props.cta?.href === 'string' ? props.cta.href : ''));
const ctaTarget = computed(() => (props.cta?.external ? '_blank' : '_self'));
const ctaRel = computed(() => (props.cta?.external ? 'noopener noreferrer' : undefined));

const countdownLabelText = computed(() => props.countdownLabel);
const countdownDisplay = ref('');
let countdownTimer = null;

function pad(value) {
  return value.toString().padStart(2, '0');
}

function updateCountdown() {
  if (!props.expiresAt) {
    countdownDisplay.value = '';
    return;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  let diff = Math.floor(props.expiresAt - nowSeconds);
  if (diff <= 0) {
    countdownDisplay.value = 'Ending soon';
    stopCountdown();
    return;
  }

  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  diff -= minutes * 60;
  const seconds = diff;

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  parts.push(`${pad(hours)}h`, `${pad(minutes)}m`, `${pad(seconds)}s`);
  countdownDisplay.value = parts.join(' ');
}

function startCountdown() {
  if (!props.expiresAt) return;
  updateCountdown();
  if (typeof window === 'undefined') {
    return;
  }
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
  countdownTimer = window.setInterval(updateCountdown, 1000);
}

function stopCountdown() {
  if (typeof window === 'undefined') {
    countdownTimer = null;
    return;
  }
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

onMounted(() => {
  if (props.expiresAt) {
    startCountdown();
  }
});

onBeforeUnmount(() => {
  stopCountdown();
});

watch(
  () => props.expiresAt,
  (next) => {
    if (!next) {
      stopCountdown();
      countdownDisplay.value = '';
      return;
    }
    startCountdown();
  },
  { immediate: true }
);

const ariaLive = computed(() => {
  if (remainingCount.value === null) return 'polite';
  return remainingCount.value <= 5 ? 'assertive' : 'polite';
});
</script>

<style scoped>

.bonus-incentive {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 18px;
  padding: 24px 24px;
  color: #f8f9ff;
}

.bonus-incentive::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(255, 120, 216, 0.14), transparent 55%);
  pointer-events: none;
  border-radius: inherit;
}

.bonus-incentive > * {
  position: relative;
  z-index: 1;
}

.bonus-incentive--depleted {
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.bonus-incentive__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bonus-incentive__badge {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(200, 213, 255, 0.8);
}

.bonus-incentive__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 153, 255, 0.2);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: #fee9ff;
}

.bonus-incentive__headline {
  margin: 0;
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  line-height: 1.25;
  font-weight: 700;
}

.bonus-incentive__description {
  margin: 0;
  font-size: clamp(1rem, 2.4vw, 1.1rem);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  line-height: 1.5;
  color: rgba(227, 233, 255, 0.85);
}

.bonus-incentive__tagline {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(208, 215, 255, 0.7);
}

.bonus-incentive__metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.bonus-incentive__counter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bonus-incentive__count-main {
  font-size: clamp(1.4rem, 3.2vw, 1.8rem);
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
  font-weight: 700;
  letter-spacing: 0.06em;
}

.bonus-incentive__count-sub {
  font-size: clamp(0.82rem, 2vw, 0.95rem);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(215, 225, 255, 0.75);
}

.bonus-incentive__countdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

.bonus-incentive__countdown-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(208, 215, 255, 0.65);
}

.bonus-incentive__countdown-value {
  font-size: clamp(1rem, 2.6vw, 1.2rem);
  font-weight: 600;
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
}

.bonus-incentive__progress {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.bonus-incentive__progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff4c94, #ffb648);
  transition: width 0.4s ease;
}

.bonus-incentive__footnote {
  margin: 0;
  font-size: clamp(0.82rem, 2vw, 0.95rem);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(208, 215, 255, 0.7);
}

.bonus-incentive__cta {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #f8f9ff;
  font-size: 0.82rem;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease;
}

.bonus-incentive__cta:hover,
.bonus-incentive__cta:focus {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.bonus-incentive__cta:focus {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

@media (max-width: 520px) {
  .bonus-incentive {
    padding: 20px;
  }

  .bonus-incentive__metrics {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .bonus-incentive__countdown {
    text-align: left;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bonus-incentive__progress-bar,
  .bonus-incentive__cta {
    transition: none;
  }
}
</style>
