<template>
  <section
    v-if="entries.length"
    class="timeline-card"
    :aria-labelledby="headingId"
  >
    <header class="timeline-card__header">
      <h3 :id="headingId" class="timeline-card__title ui-title-md">
        {{ title }}
      </h3>
      <p v-if="subtitle" class="timeline-card__subtitle ui-label-sm">
        {{ subtitle }}
      </p>
    </header>
    <ul class="timeline-card__list" role="list">
      <li
        v-for="entry in entries"
        :key="entry.id || entry.label"
        :class="[
          'timeline-card__item',
          `timeline-card__item--${entry.status ?? 'upcoming'}`,
          { 'timeline-card__item--next': entry.isNext }
        ]"
        role="listitem"
      >
        <div class="timeline-card__main">
          <span class="timeline-card__label ui-title-sm">{{ entry.label }}</span>
          <span v-if="entry.priceDisplay" class="timeline-card__price ui-value-lg">
            {{ entry.priceDisplay }}
          </span>
        </div>
        <span v-if="entry.timeDisplay" class="timeline-card__time ui-label-sm">
          {{ entry.timeDisplay }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Price Escalation Timeline',
  },
  subtitle: {
    type: String,
    default: '',
  },
  entries: {
    type: Array,
    default: () => [],
  },
  id: {
    type: String,
    default: () => `price-timeline-${Math.random().toString(36).slice(2, 8)}`,
  },
});

const headingId = computed(() => `${props.id}-heading`);
</script>

<style scoped>
.timeline-card {
  background: var(--brand-surface-card-bg);
  border: 1px solid var(--brand-surface-card-border);
  border-radius: var(--ui-radius-card);
  padding: var(--ui-card-padding);
  box-shadow: var(--ui-shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--buy-space-16, 16px);
  color: var(--brand-fg-200);
}

.timeline-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--buy-space-8, 8px);
}

.timeline-card__title {
  margin: 0;
}

.timeline-card__subtitle {
  margin: 0;
  opacity: 0.75;
}

.timeline-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--buy-space-12, 12px);
}

.timeline-card__item {
  border: 1px solid color-mix(in srgb, var(--brand-fg-100) 14%, transparent);
  border-radius: 14px;
  padding: var(--buy-space-16, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--buy-space-8, 8px);
  background: color-mix(in srgb, var(--brand-bg-900) 82%, transparent);
}

.timeline-card__item--current {
  border-color: var(--brand-accent-electric, #27f3ff);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 22%, transparent);
}

.timeline-card__item--next {
  border-color: color-mix(in srgb, var(--brand-neon-pink, #ff2d86) 45%, transparent);
}

.timeline-card__main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--buy-space-8, 8px);
}

.timeline-card__label {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.timeline-card__price {
  margin: 0;
  font-family: var(--ui-font-heading);
}

.timeline-card__time {
  margin: 0;
  opacity: 0.7;
}
</style>
