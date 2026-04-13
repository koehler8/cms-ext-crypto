<template>
  <div class="status-progress" role="group" aria-label="Presale progress">
    <div class="status-progress__header">
      <span class="status-progress__label ui-label-sm">{{ label }}</span>
      <span class="status-progress__value ui-label-sm">{{ summary }}</span>
    </div>
    <div
      class="status-progress__bar"
      role="progressbar"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="clampedPercent"
    >
      <span class="status-progress__fill" :style="{ width: `${clampedPercent}%` }"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDecimal } from '@koehler8/cms/utils/formatNumber';

const props = defineProps({
  current: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  label: {
    type: String,
    default: 'Presale progress',
  },
});

const clampedPercent = computed(() => {
  if (!Number.isFinite(props.total) || props.total <= 0) return 0;
  const ratio = (props.current / props.total) * 100;
  return Math.min(Math.max(Math.round(ratio), 0), 100);
});

const summary = computed(() => {
  const currentFormatted = formatDecimal(props.current, { maximumFractionDigits: 0 });
  const totalFormatted = formatDecimal(props.total, { maximumFractionDigits: 0 });
  return `${currentFormatted} / ${totalFormatted} (${clampedPercent.value}%)`;
});
</script>

<style scoped>
.status-progress {
  display: grid;
  gap: 12px;
  width: 100%;
}

.status-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ui-text-muted, var(--brand-fg-300, #a798b0));
}

.status-progress__bar {
  position: relative;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.status-progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #27f3ff 0%, #ff2d86 100%);
  transition: width 0.4s ease;
}

@media (max-width: 480px) {
  .status-progress__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .status-progress__value {
    text-align: left;
    width: 100%;
    overflow-wrap: anywhere;
  }
}
</style>
