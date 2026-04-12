<template>
  <div v-if="cardVisible" class="momentum-card">
    <ProgressFomo
      :total-allocation="totalAllocation"
      :sold-amount="soldAmount"
      :unique-buyers="uniqueBuyers"
      :next-phase-timestamp="nextPhaseTimestamp"
      :title="cardTitle"
      :caption="cardCaption"
      :show-fuse="showFuse"
      :animates="animates"
      :price-schedule="schedule"
      :price-schedule-title="scheduleTitle"
      :price-schedule-subtitle="scheduleSubtitle"
      :show-schedule="false"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import ProgressFomo from '../ProgressFomo.vue';
import { getTokenSymbol } from '@d2sg/cms/utils/tokenFormat';

defineProps({
  content: {
    type: Object,
    default: null,
  },
  configKey: {
    type: String,
    default: null,
  },
});

const presalePulse = inject('presalePulse', null);
const pageContent = inject('pageContent', null);

const tokenSymbol = getTokenSymbol();
const FALLBACK_TITLE = tokenSymbol ? `${tokenSymbol} Presale Momentum` : 'Presale momentum';
const FALLBACK_CAPTION = tokenSymbol
  ? `Limited supply. Secure your ${tokenSymbol} before the next price bump.`
  : 'Limited supply. Secure your spot before the next price bump.';

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const pulse = computed(() => {
  if (!presalePulse || typeof presalePulse !== 'object') return {};
  return presalePulse.value && typeof presalePulse.value === 'object'
    ? presalePulse.value
    : {};
});

const content = computed(() => {
  if (!pageContent || typeof pageContent !== 'object') return {};
  const root = pageContent.value && typeof pageContent.value === 'object' ? pageContent.value : {};
  const presale =
    root.presale && typeof root.presale === 'object' ? root.presale : {};
  return presale.progressFomo && typeof presale.progressFomo === 'object'
    ? presale.progressFomo
    : {};
});

const totalAllocation = computed(() => {
  const value = Number(pulse.value.totalAllocation ?? content.value.totalAllocation ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
});

const soldAmount = computed(() => {
  const value = Number(pulse.value.soldAmount ?? content.value.soldAmount ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
});

const uniqueBuyers = computed(() => {
  const value = Number(pulse.value.uniqueBuyers ?? content.value.uniqueBuyers ?? 0);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
});

const nextPhaseTimestamp = computed(() => {
  const value = Number(pulse.value.nextPhaseTimestamp ?? content.value.nextPhaseTimestamp ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
});

const schedule = computed(() => {
  if (Array.isArray(pulse.value.schedule)) return pulse.value.schedule;
  if (Array.isArray(content.value.priceSchedule)) return content.value.priceSchedule;
  return [];
});

const scheduleTitle = computed(() => {
  const raw =
    sanitizeText(pulse.value.priceScheduleTitle) ||
    sanitizeText(content.value.priceScheduleTitle);
  return raw || 'Price timeline';
});

const scheduleSubtitle = computed(() => {
  const explicit =
    sanitizeText(pulse.value.priceScheduleSubtitle) ||
    sanitizeText(content.value.priceScheduleSubtitle);
  if (explicit) return explicit;

  const next = pulse.value.nextPhase || null;
  if (!next) return '';
  const parts = [];
  if (next.priceDisplay) parts.push(sanitizeText(next.priceDisplay));
  if (next.timeDisplay) parts.push(sanitizeText(next.timeDisplay));
  const summary = parts.filter(Boolean).join(' – ');
  return summary ? `Next: ${summary}` : '';
});

const cardTitle = computed(() => {
  const override = sanitizeText(pulse.value.title) || sanitizeText(content.value.title);
  return override || FALLBACK_TITLE;
});

const cardCaption = computed(() => {
  const override = sanitizeText(pulse.value.caption) || sanitizeText(content.value.caption);
  return override || FALLBACK_CAPTION;
});

const showFuse = computed(() => {
  const pulseFlag = pulse.value.showFuse;
  if (pulseFlag !== undefined) return Boolean(pulseFlag);
  if (content.value.showFuse !== undefined) return Boolean(content.value.showFuse);
  return true;
});

const animates = computed(() => {
  const pulseFlag = pulse.value.animates;
  if (pulseFlag !== undefined) return Boolean(pulseFlag);
  if (content.value.animates !== undefined) return Boolean(content.value.animates);
  return true;
});

const cardEnabled = computed(() => {
  const pulseEnabled = pulse.value.enabled;
  const contentEnabled = content.value.enabled;
  const enabledFlag =
    (pulseEnabled === undefined || pulseEnabled === null ? true : Boolean(pulseEnabled)) &&
    (contentEnabled === undefined || contentEnabled === null ? true : Boolean(contentEnabled));
  return enabledFlag && totalAllocation.value > 0;
});

const cardVisible = computed(() => cardEnabled.value);
</script>

<style scoped>
.momentum-card {
  width: 100%;
  max-width: 1080px;
  margin: 48px auto 0;
}

@media (max-width: 768px) {
  .momentum-card {
    margin-top: 32px;
  }
}
</style>
