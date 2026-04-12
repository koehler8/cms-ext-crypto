<template>
  <aside
    v-if="items.length"
    class="benefits-card"
    role="complementary"
    :aria-labelledby="headingId"
    :id="id"
  >
    <p v-if="eyebrow" class="benefits-card__eyebrow">{{ eyebrow }}</p>
    <h3 class="benefits-card__title" :id="headingId">{{ resolvedTitle }}</h3>
    <ul class="benefits-card__list">
      <li
        v-for="item in items"
        :key="item.id || item.text"
        class="benefits-card__item"
      >
        <span v-if="item.icon" class="benefits-card__icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="benefits-card__text">{{ item.text }}</span>
      </li>
    </ul>
    <a
      v-if="cta.href && cta.text"
      class="benefits-card__cta"
      :href="cta.href"
    >
      {{ cta.text }}
    </a>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { getTokenSymbol } from '../../utils/tokenFormat';

const tokenSymbol = getTokenSymbol();
const DEFAULT_TITLE = tokenSymbol ? `${tokenSymbol} Makes the Fun Real` : 'Why holders lock in now';

const props = defineProps({
  eyebrow: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  items: {
    type: Array,
    default: () => [],
  },
  cta: {
    type: Object,
    default: () => ({ href: '', text: '' }),
  },
  id: {
    type: String,
    default: () => `holders-benefits-${Math.random().toString(36).slice(2, 9)}`,
  },
});

const headingId = computed(() => `${props.id}-heading`);
const resolvedTitle = computed(() =>
  typeof props.title === 'string' && props.title.trim() ? props.title : DEFAULT_TITLE
);
</script>

<style scoped>
.benefits-card {
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

.benefits-card__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.75rem;
  color: var(--brand-fg-300);
}

.benefits-card__title {
  margin: 0;
  font-family: var(--ui-font-heading);
  font-size: clamp(1.25rem, 2vw, 1.6rem);
  color: var(--brand-fg-100);
}

.benefits-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--buy-space-12, 12px);
}

.benefits-card__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--buy-space-12, 12px);
  align-items: start;
}

.benefits-card__icon {
  font-size: 1.35rem;
  line-height: 1;
}

.benefits-card__text {
  font-size: var(--ui-type-body);
  color: var(--brand-fg-200);
}

.benefits-card__cta {
  margin-top: var(--buy-space-8, 8px);
  align-self: flex-start;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--brand-accent-electric);
  text-decoration: none;
  transition: color 0.2s ease;
}

.benefits-card__cta:hover,
.benefits-card__cta:focus {
  color: var(--brand-neon-pink);
  text-decoration: underline;
}
</style>
