<template>
  <section class="progress-fomo" role="status" aria-live="polite">
    <p class="progress-fomo__teaser">Ready to ignite? Here's your chance:</p>
    <SbCard class="progress-fomo__card" :padded="false">
      <header class="progress-fomo__header">
        <h3 class="progress-fomo__title">{{ titleText }}</h3>
        <p class="progress-fomo__caption">{{ captionText }}</p>
      </header>

    <FuseMeter
      v-if="fuseVisible"
      class="progress-fomo__fuse"
      :progress="progressTarget"
      mode="sold"
      :animates="fuseAnimates"
    />

    <div class="progress-fomo__bar-wrapper">
      <div class="progress-fomo__bar" :style="barStyle">
        <span class="progress-fomo__bar-label">{{ progressLabel }}</span>
      </div>
    </div>

    <div class="progress-fomo__meta">
      <div class="progress-fomo__stats">
        <div class="progress-fomo__metric">
          <span class="progress-fomo__metric-label">Tokens sold</span>
          <span class="progress-fomo__metric-value">{{ formattedSold }}</span>
          <span class="progress-fomo__metric-sub">{{ progressLabel }}</span>
        </div>
        <div class="progress-fomo__metric">
          <span class="progress-fomo__metric-label">Remaining</span>
          <span class="progress-fomo__metric-value">{{ formattedRemaining }}</span>
          <span class="progress-fomo__metric-sub">{{ remainingPercentLabel }}</span>
        </div>
        <div class="progress-fomo__metric">
          <span class="progress-fomo__metric-label">Wallets joined</span>
          <span class="progress-fomo__metric-value">{{ formattedUniqueBuyers }}</span>
          <span class="progress-fomo__metric-sub">unique wallets</span>
        </div>
      </div>

      <div class="progress-fomo__countdown">
        <span class="progress-fomo__countdown-label">Next price increase in</span>
        <span class="progress-fomo__countdown-value">{{ countdownDisplay }}</span>
      </div>
    </div>

      <div v-if="shouldShowSchedule" class="progress-fomo__schedule">
        <div class="progress-fomo__schedule-header">
          <h4 class="progress-fomo__schedule-title">{{ scheduleTitleText }}</h4>
        <span
          v-if="scheduleSubtitleText"
          class="progress-fomo__schedule-subtitle"
        >
          {{ scheduleSubtitleText }}
        </span>
      </div>
      <ul class="progress-fomo__schedule-list">
        <li
          v-for="item in normalizedSchedule"
          :key="item.id"
          :class="[
            'progress-fomo__schedule-item',
            `progress-fomo__schedule-item--${item.status}`,
            { 'progress-fomo__schedule-item--next': item.isNext },
          ]"
        >
          <div class="progress-fomo__schedule-main">
            <span class="progress-fomo__schedule-label">{{ item.label }}</span>
            <span class="progress-fomo__schedule-price">{{ item.priceDisplay }}</span>
          </div>
          <span class="progress-fomo__schedule-time">{{ item.timeDisplay }}</span>
        </li>
      </ul>
    </div>
    </SbCard>
</section>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';
import FuseMeter from './presale/FuseMeter.vue';
import SbCard from '@koehler8/cms/components/ui/SbCard.vue';
import { getTokenSymbol } from '../utils/tokenFormat';

const tokenSymbol = getTokenSymbol();
const DEFAULT_CAPTION = tokenSymbol
  ? `Limited supply. Secure your ${tokenSymbol} before the next price bump.`
  : 'Limited supply. Secure your spot before the next price bump.';

const props = defineProps({
  totalAllocation: {
    type: Number,
    default: null,
  },
  soldAmount: {
    type: Number,
    default: null,
  },
  uniqueBuyers: {
    type: Number,
    default: null,
  },
  nextPhaseTimestamp: {
    type: Number,
    default: null,
  },
  title: {
    type: String,
    default: 'Presale momentum',
  },
  caption: {
    type: String,
    default: '',
  },
  showFuse: {
    type: Boolean,
    default: null,
  },
  animates: {
    type: Boolean,
    default: null,
  },
  priceSchedule: {
    type: Array,
    default: null,
  },
  priceScheduleTitle: {
    type: String,
    default: '',
  },
  priceScheduleSubtitle: {
    type: String,
    default: '',
  },
  showSchedule: {
    type: Boolean,
    default: null,
  },
  content: {
    type: Object,
    default: null,
  },
  configKey: {
    type: String,
    default: null,
  },
});

const pageContent = inject('pageContent', ref({}));

const contentSource = computed(() => {
  if (props.content && typeof props.content === 'object') {
    return props.content;
  }
  const fallback = pageContent.value?.progressFomo;
  return fallback && typeof fallback === 'object' ? fallback : {};
});

function resolveNumber(value, fallback) {
  if (Number.isFinite(value)) return value;
  const numeric = Number(fallback);
  return Number.isFinite(numeric) ? numeric : 0;
}

const resolvedTotalAllocation = computed(() =>
  resolveNumber(props.totalAllocation, contentSource.value.totalAllocation)
);
const resolvedSoldAmount = computed(() =>
  resolveNumber(props.soldAmount, contentSource.value.soldAmount)
);
const resolvedUniqueBuyers = computed(() =>
  resolveNumber(props.uniqueBuyers, contentSource.value.uniqueBuyers)
);
const resolvedNextPhaseTimestamp = computed(() => {
  const explicit = resolveNumber(props.nextPhaseTimestamp, contentSource.value.nextPhaseTimestamp);
  return explicit > 0 ? explicit : 0;
});

const resolvedTitle = computed(() => {
  if (typeof props.title === 'string' && props.title.trim()) return props.title;
  const override = contentSource.value.title;
  return typeof override === 'string' && override.trim() ? override.trim() : 'Presale momentum';
});

const resolvedCaption = computed(() => {
  if (typeof props.caption === 'string' && props.caption.trim()) return props.caption;
  const override = contentSource.value.caption;
  if (typeof override === 'string' && override.trim()) return override.trim();
  return '';
});

const resolvedShowFuse = computed(() => {
  if (typeof props.showFuse === 'boolean') return props.showFuse;
  if (typeof contentSource.value.showFuse === 'boolean') return contentSource.value.showFuse;
  return true;
});

const resolvedAnimates = computed(() => {
  if (typeof props.animates === 'boolean') return props.animates;
  if (typeof contentSource.value.animates === 'boolean') return contentSource.value.animates;
  return true;
});

const resolvedPriceSchedule = computed(() => {
  if (Array.isArray(props.priceSchedule)) return props.priceSchedule;
  if (Array.isArray(contentSource.value.priceSchedule)) return contentSource.value.priceSchedule;
  return [];
});

const resolvedPriceScheduleTitle = computed(() => {
  if (typeof props.priceScheduleTitle === 'string' && props.priceScheduleTitle.trim()) {
    return props.priceScheduleTitle.trim();
  }
  const override = contentSource.value.priceScheduleTitle;
  return typeof override === 'string' && override.trim() ? override.trim() : '';
});

const resolvedPriceScheduleSubtitle = computed(() => {
  if (typeof props.priceScheduleSubtitle === 'string' && props.priceScheduleSubtitle.trim()) {
    return props.priceScheduleSubtitle.trim();
  }
  const override = contentSource.value.priceScheduleSubtitle;
  return typeof override === 'string' && override.trim() ? override.trim() : '';
});

const resolvedShowSchedule = computed(() => {
  if (typeof props.showSchedule === 'boolean') return props.showSchedule;
  if (typeof contentSource.value.showSchedule === 'boolean') return contentSource.value.showSchedule;
  return true;
});

const smoothProgress = ref(0);
const countdownDisplay = ref('00d 00h 00m 00s');
const nowTimestamp = ref(Date.now());
const prefersReducedMotion = ref(false);
let animationFrame = null;
let countdownInterval = null;
let reduceMotionQuery = null;
let reduceMotionChangeHandler = null;

const progressTarget = computed(() => {
  if (!resolvedTotalAllocation.value) return 0;
  const ratio = Math.min(
    Math.max(resolvedSoldAmount.value / resolvedTotalAllocation.value, 0),
    1
  );
  return Math.round(ratio * 100);
});

const progressLabel = computed(() => `${progressTarget.value}% sold`);
const formattedSold = computed(() => formatInteger(resolvedSoldAmount.value));
const remainingTokens = computed(() =>
  Math.max(resolvedTotalAllocation.value - resolvedSoldAmount.value, 0)
);
const formattedRemaining = computed(() => formatInteger(remainingTokens.value));
const remainingPercent = computed(() =>
  resolvedTotalAllocation.value > 0 ? Math.max(0, 100 - progressTarget.value) : 0
);
const remainingPercentLabel = computed(() => `${remainingPercent.value}% left`);
const formattedUniqueBuyers = computed(() => formatInteger(resolvedUniqueBuyers.value));
const titleText = computed(() => resolvedTitle.value);
const captionText = computed(() =>
  typeof resolvedCaption.value === 'string' && resolvedCaption.value.trim()
    ? resolvedCaption.value
    : DEFAULT_CAPTION
);
const fuseVisible = computed(
  () => resolvedShowFuse.value && resolvedTotalAllocation.value > 0
);
const fuseAnimates = computed(
  () => resolvedAnimates.value !== false && !prefersReducedMotion.value
);
const barStyle = computed(() => ({
  width: `${smoothProgress.value}%`,
}));

const scheduleTitleText = computed(
  () => sanitizeString(resolvedPriceScheduleTitle.value) || 'Price timeline'
);
const scheduleSubtitleOverride = computed(() => sanitizeString(resolvedPriceScheduleSubtitle.value));

const normalizedSchedule = computed(() => {
  const raw = Array.isArray(resolvedPriceSchedule.value) ? resolvedPriceSchedule.value : [];
  if (!raw.length) return [];

  const now = nowTimestamp.value;
  const mapped = raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const id = entry.id || `tier-${index}`;
      const label = sanitizeString(entry.label) || `Phase ${index + 1}`;
      const priceDisplay =
        sanitizeString(entry.priceDisplay) || formatSchedulePrice(entry.priceValue);
      const timestamp =
        Number.isFinite(entry.timestamp) && entry.timestamp > 0 ? entry.timestamp : null;
      const timeDisplay =
        sanitizeString(entry.timeDisplay) ||
        (timestamp ? formatScheduleTimestamp(timestamp) : '');
      const note = sanitizeString(entry.note);
      const isCurrent = entry.isCurrent === true;

      return {
        id,
        label,
        priceDisplay,
        timestamp,
        timeDisplay,
        note,
        isCurrent,
      };
    })
    .filter((entry) => entry && (entry.label || entry.priceDisplay || entry.timestamp));

  if (!mapped.length) return [];

  mapped.sort((a, b) => {
    const aTs = a.timestamp ?? Number.POSITIVE_INFINITY;
    const bTs = b.timestamp ?? Number.POSITIVE_INFINITY;
    return aTs - bTs;
  });

  let currentIndex = mapped.findIndex((entry) => entry.isCurrent);
  if (currentIndex === -1) {
    let latestPastIndex = -1;
    mapped.forEach((entry, index) => {
      if (entry.timestamp !== null && entry.timestamp * 1000 <= now) {
        latestPastIndex = index;
      }
    });
    currentIndex = latestPastIndex >= 0 ? latestPastIndex : 0;
  }

  let nextHighlighted = false;
  return mapped.map((entry, index) => {
    const status =
      index < currentIndex ? 'past' : index === currentIndex ? 'current' : 'upcoming';
    const timeDisplay =
      entry.timeDisplay || (entry.timestamp ? formatScheduleTimestamp(entry.timestamp) : '');
    let isNext = false;
    if (status === 'upcoming' && !nextHighlighted) {
      isNext = true;
      nextHighlighted = true;
    }

    return {
      ...entry,
      status,
      timeDisplay,
      isNext,
    };
  });
});

const hasSchedule = computed(() => normalizedSchedule.value.length > 0);
const shouldShowSchedule = computed(() => resolvedShowSchedule.value && hasSchedule.value);

const scheduleSubtitleText = computed(() => {
  if (scheduleSubtitleOverride.value) {
    return scheduleSubtitleOverride.value;
  }
  const nextItem = normalizedSchedule.value.find((entry) => entry.status === 'upcoming');
  if (!nextItem) return '';
  if (nextItem.note) return nextItem.note;
  if (nextItem.priceDisplay && nextItem.timeDisplay) {
    return `Next: ${nextItem.priceDisplay} - ${nextItem.timeDisplay}`;
  }
  if (nextItem.priceDisplay) return `Next: ${nextItem.priceDisplay}`;
  if (nextItem.timeDisplay) return `Next change ${nextItem.timeDisplay}`;
  return '';
});

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatSchedulePrice(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const digits = value >= 1 ? 2 : 5;
  return `${value.toFixed(digits)} ETH`;
}

function formatScheduleTimestamp(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function animateProgress() {
  if (prefersReducedMotion.value) {
    smoothProgress.value = progressTarget.value;
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    return;
  }
  if (Math.abs(smoothProgress.value - progressTarget.value) < 0.1) {
    smoothProgress.value = progressTarget.value;
    animationFrame = null;
    return;
  }
  const delta = (progressTarget.value - smoothProgress.value) * 0.1;
  smoothProgress.value += delta;
  animationFrame = window.requestAnimationFrame(animateProgress);
}

function updateCountdown() {
  const now = Date.now();
  nowTimestamp.value = now;
  const remaining = resolvedNextPhaseTimestamp.value * 1000 - now;
  if (remaining <= 0) {
    countdownDisplay.value = '00d 00h 00m 00s';
    return;
  }
  const totalSeconds = Math.max(Math.floor(remaining / 1000), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  countdownDisplay.value = [
    `${String(days).padStart(2, '0')}d`,
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(seconds).padStart(2, '0')}s`,
  ].join(' ');
}

watch(
  progressTarget,
  () => {
    if (typeof window === 'undefined') {
      smoothProgress.value = progressTarget.value;
      return;
    }
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animateProgress();
  },
  { immediate: true }
);

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.value = reduceMotionQuery.matches;
    reduceMotionChangeHandler = (event) => {
      prefersReducedMotion.value = event.matches;
      animateProgress();
    };
    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', reduceMotionChangeHandler);
    } else if (reduceMotionQuery.addListener) {
      reduceMotionQuery.addListener(reduceMotionChangeHandler);
    }
  }

  smoothProgress.value = progressTarget.value;
  updateCountdown();
  countdownInterval = window.setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (reduceMotionQuery && reduceMotionChangeHandler) {
    if (reduceMotionQuery.removeEventListener) {
      reduceMotionQuery.removeEventListener('change', reduceMotionChangeHandler);
    } else if (reduceMotionQuery.removeListener) {
      reduceMotionQuery.removeListener(reduceMotionChangeHandler);
    }
  }
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  if (countdownInterval) window.clearInterval(countdownInterval);
});
</script>

<style scoped>
.progress-fomo {
  margin: 0 0 32px;
}

.progress-fomo__teaser {
  margin: 0 0 16px;
  text-align: center;
  font-size: clamp(1rem, 2.4vw, 1.15rem);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brand-accent-electric, #27f3ff);
}

.progress-fomo__card {
  padding: 24px 20px;
}

.progress-fomo__card,
.progress-fomo__card * {
  color: #f8fafc;
}

@media (min-width: 992px) {
  .progress-fomo {
    margin-bottom: 40px;
  }

  .progress-fomo__teaser {
    margin-bottom: 20px;
  }

  .progress-fomo__card {
    padding: 32px 28px;
  }
}

.progress-fomo__header {
  margin-bottom: 20px;
}

.progress-fomo__fuse {
  margin: 16px auto 22px;
}

.progress-fomo__title {
  margin: 0;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 700;
}

.progress-fomo__caption {
  margin: 4px 0 0;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: clamp(0.95rem, 2.2vw, 1.05rem);
  color: rgba(226, 232, 240, 0.75);
}

.progress-fomo__bar-wrapper {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  height: 18px;
  position: relative;
  overflow: hidden;
}

.progress-fomo__bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  background: var(
    --brand-pill-alt-gradient,
    linear-gradient(135deg, #9a2eff 0%, #27f3ff 100%)
  );
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .progress-fomo__bar {
    transition: none;
  }
}

.progress-fomo__bar-label {
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.progress-fomo__meta {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-fomo__stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.progress-fomo__metric {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(15, 25, 46, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.25);
  min-height: 88px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.progress-fomo__metric-label {
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.6);
}

.progress-fomo__metric-value {
  margin-top: 6px;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1.5rem, 3vw, 1.75rem);
  font-weight: 700;
  color: #f8fafc;
}

.progress-fomo__metric-sub {
  margin-top: 4px;
  font-size: 0.75rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(148, 163, 184, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.progress-fomo__countdown {
  border-radius: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(45, 212, 191, 0.35);
  background: rgba(13, 148, 136, 0.1);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
}

.progress-fomo__countdown-label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(167, 243, 208, 0.75);
}

.progress-fomo__countdown-value {
  font-weight: 700;
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  color: #a7f3d0;
}

.progress-fomo__schedule {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(79, 70, 229, 0.25);
}

.progress-fomo__schedule-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.progress-fomo__schedule-title {
  margin: 0;
  font-size: clamp(1.1rem, 2.8vw, 1.35rem);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(196, 181, 253, 0.9);
}

.progress-fomo__schedule-subtitle {
  font-size: clamp(0.8rem, 2vw, 0.95rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(173, 216, 230, 0.8);
}

.progress-fomo__schedule-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.progress-fomo__schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--brand-radius-md, 14px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 25, 46, 0.55);
  transition: border 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.progress-fomo__schedule-item--current {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(56, 189, 248, 0.16);
}

.progress-fomo__schedule-item--next {
  border-color: rgba(45, 212, 191, 0.6);
  background: rgba(13, 148, 136, 0.16);
  transform: translateY(-1px);
}

.progress-fomo__schedule-item--past {
  opacity: 0.65;
}

.progress-fomo__schedule-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-fomo__schedule-label {
  font-weight: 600;
  font-size: clamp(0.95rem, 2.2vw, 1.05rem);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
}

.progress-fomo__schedule-price {
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(196, 181, 253, 0.85);
}

.progress-fomo__schedule-time {
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(226, 232, 240, 0.75);
  text-align: right;
}

@media (min-width: 768px) {
  .progress-fomo__meta {
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
  }

  .progress-fomo__stats {
    flex: 1 1 auto;
  }

  .progress-fomo__countdown {
    flex: 0 0 220px;
  }
}
</style>
