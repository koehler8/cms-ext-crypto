<template>
  <div class="countdown" :aria-live="ariaLive" role="status">
    <p class="countdown__label ui-label-sm">
      <span class="ui-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" />
          <polyline points="8 4 8 8 10.5 9.5" />
        </svg>
      </span>
      <span>{{ label }}</span>
    </p>
    <div class="countdown__body">
      <template v-for="(unit, index) in displayUnits" :key="unit.id">
        <div class="countdown__unit">
          <span class="countdown__value ui-value-lg text-ellipsis">{{ unit.value }}</span>
          <span class="countdown__suffix ui-label-sm">{{ unit.suffix }}</span>
        </div>
        <span
          v-if="index < displayUnits.length - 1"
          class="countdown__separator"
          aria-hidden="true"
        >
          :
        </span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: 'Presale ends in',
  },
  targetTimestamp: {
    type: Number,
    default: null,
  },
  ariaLive: {
    type: String,
    default: 'polite',
  },
  unitSuffixes: {
    type: Object,
    default: () => null,
  },
});

const emit = defineEmits(['expired']);

const DEFAULT_UNIT_SUFFIXES = Object.freeze({
  day: { singular: 'DAY', plural: 'DAYS' },
  hour: { singular: 'HR', plural: 'HRS' },
  minute: { singular: 'MIN', plural: 'MINS' },
  second: { singular: 'SEC', plural: 'SECS' },
});

function pickSuffixValue(source, keys) {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function resolveUnitSuffix(unitKey, quantity) {
  const fallback = DEFAULT_UNIT_SUFFIXES[unitKey] || { singular: '', plural: '' };
  const entry = props.unitSuffixes?.[unitKey];
  const isSingular = Number(quantity) === 1;
  const fallbackValue = isSingular
    ? fallback.singular || fallback.plural || ''
    : fallback.plural || fallback.singular || '';

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed || fallbackValue;
  }

  if (entry && typeof entry === 'object') {
    const singular = pickSuffixValue(entry, ['singular', 'one', 'single', 'short', 'label', 'default']);
    const plural = pickSuffixValue(entry, ['plural', 'many', 'multiple', 'label', 'default']);
    if (isSingular) {
      return singular || plural || fallbackValue;
    }
    return plural || singular || fallbackValue;
  }

  return fallbackValue;
}

const now = ref(Math.floor(Date.now() / 1000));
let intervalId;
const hasEmittedExpiry = ref(false);

const remainingSeconds = computed(() => {
  if (!Number.isFinite(props.targetTimestamp) || props.targetTimestamp <= 0) return 0;
  return Math.max(props.targetTimestamp - now.value, 0);
});

const displayUnits = computed(() => {
  const totalSeconds = Math.max(remainingSeconds.value, 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    {
      id: 'days',
      value: String(days).padStart(2, '0'),
      suffix: resolveUnitSuffix('day', days),
    },
    {
      id: 'hours',
      value: String(hours).padStart(2, '0'),
      suffix: resolveUnitSuffix('hour', hours),
    },
    {
      id: 'minutes',
      value: String(minutes).padStart(2, '0'),
      suffix: resolveUnitSuffix('minute', minutes),
    },
    {
      id: 'seconds',
      value: String(seconds).padStart(2, '0'),
      suffix: resolveUnitSuffix('second', seconds),
    },
  ];
});

function emitExpiry() {
  if (hasEmittedExpiry.value) return;
  if (!Number.isFinite(props.targetTimestamp) || props.targetTimestamp <= 0) return;
  hasEmittedExpiry.value = true;
  emit('expired');
}

function tick() {
  now.value = Math.floor(Date.now() / 1000);
  if (remainingSeconds.value <= 0) {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    emitExpiry();
  }
}

watch(
  () => props.targetTimestamp,
  () => {
    hasEmittedExpiry.value = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    if (props.targetTimestamp && props.targetTimestamp > Math.floor(Date.now() / 1000)) {
      tick();
      intervalId = setInterval(tick, 1000);
    } else {
      tick();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (!intervalId && props.targetTimestamp && props.targetTimestamp > Math.floor(Date.now() / 1000)) {
    intervalId = setInterval(tick, 1000);
  }
});

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.countdown {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-md, 16px);
  padding: clamp(14px, 3.6vw, 18px) clamp(12px, 3.6vw, 20px);
  border: 1px solid var(--brand-surface-card-border, rgba(74, 95, 150, 0.35));
  border-radius: var(--ui-radius-card, 24px);
  background: var(--brand-surface-card-bg, #ffffff);
  width: 100%;
  max-width: clamp(280px, 80vw, 520px);
  margin: 0 auto;
  box-shadow: var(--ui-shadow-card, 0 8px 24px rgba(28, 42, 96, 0.22));
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

.countdown__label {
  margin: 0;
  font-size: clamp(0.65rem, 1.2vw, 0.8rem);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--brand-fg-300, #a798b0);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

/* Keep countdown digits in one row, scrollable on narrow viewports */
.countdown__body {
  display: flex;
  align-items: center;
  gap: clamp(4px, 1.5vw, 8px);
  flex-wrap: nowrap;
  justify-content: center;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  padding-inline: clamp(2px, 1.2vw, 12px);
}

.countdown__body::-webkit-scrollbar {
  display: none;
}

.countdown__unit {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1 1 54px;
  min-width: clamp(48px, 10vw, 64px);
  max-width: clamp(56px, 12vw, 84px);
  white-space: nowrap;
}

.countdown__value {
  color: var(--brand-accent-electric, #4f6cf0);
  font-size: clamp(1.8rem, 6vw, 2.45rem);
  line-height: 1;
  min-width: 3ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  text-shadow: 0 0 12px rgba(79, 108, 240, 0.28), 0 0 24px rgba(28, 42, 96, 0.18);
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
}

.countdown__suffix {
  font-size: clamp(0.65rem, 1.3vw, 0.75rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-fg-300, #a798b0);
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
}

.countdown__separator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
  line-height: 1;
  color: var(--brand-fg-300, #a798b0);
  white-space: nowrap;
  margin-inline: clamp(-8px, -1.8vw, -2px);
  transform: translateY(-12px);
}

.text-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .countdown {
    padding: clamp(14px, 3.8vw, 18px);
  }
  .countdown__body {
    justify-content: center;
    gap: clamp(4px, 2vw, 6px);
    padding-inline: clamp(4px, 2vw, 10px);
  }
  .countdown__unit {
    flex-basis: clamp(48px, 22vw, 64px);
    min-width: clamp(44px, 20vw, 64px);
    max-width: clamp(52px, 24vw, 72px);
  }
  .countdown__value {
    font-size: clamp(2.1rem, 9vw, 2.5rem);
  }
  .countdown__separator {
    margin-inline: clamp(-4px, -1.2vw, -2px);
    transform: translateY(-8px);
    font-size: 1.5rem;
  }
}

.ui-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--brand-fg-300, #a798b0);
}

.ui-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
