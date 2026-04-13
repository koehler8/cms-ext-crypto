<template>
  <section class="presale-faq" data-analytics-section="presale-faq">
    <header class="presale-faq__header">
      <div class="presale-faq__eyebrow" v-if="highlightLabel">
        <span class="presale-faq__badge">{{ highlightLabel }}</span>
      </div>
      <h2 class="presale-faq__title">{{ title }}</h2>
      <p v-if="description" class="presale-faq__description">{{ description }}</p>
    </header>
    <div class="presale-faq__accordion" role="region" :aria-label="title">
      <div
        v-for="(item, index) in displayItems"
        :key="item.id || index"
        :class="['presale-faq__item', { 'presale-faq__item--open': openIndex === index }]"
      >
        <h3 class="presale-faq__question">
          <button
            type="button"
            class="presale-faq__trigger"
            :aria-expanded="openIndex === index"
            :aria-controls="`faq-panel-${uid}-${index}`"
            :id="`faq-trigger-${uid}-${index}`"
            @click="toggle(index)"
            @keydown.space.prevent="toggle(index)"
            @keydown.enter.prevent="toggle(index)"
          >
            <span>{{ item.question }}</span>
            <span class="presale-faq__icon" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path
                  d="M3.5 6l4.5 4 4.5-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
        </h3>
        <Transition name="faq-panel">
          <div
            v-show="openIndex === index"
            :id="`faq-panel-${uid}-${index}`"
            class="presale-faq__panel"
            role="region"
            :aria-labelledby="`faq-trigger-${uid}-${index}`"
          >
            <p class="presale-faq__answer">
              <template v-if="Array.isArray(item.answer)">
                <component
                  v-for="(chunk, chunkIndex) in item.answer"
                  :key="chunkIndex"
                  :is="chunk.type || 'span'"
                  v-bind="chunk.props || {}"
                >
                  <template v-if="chunk.text">{{ chunk.text }}</template>
                </component>
              </template>
              <template v-else>
                <span v-html="item.answer"></span>
              </template>
            </p>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { trackFunnelEvent } from '@koehler8/cms/utils/analytics';

const props = defineProps({
  title: {
    type: String,
    default: 'Frequently Asked Questions',
  },
  description: {
    type: String,
    default: '',
  },
  items: {
    type: Array,
    default: () => [],
  },
  defaultOpenIndex: {
    type: Number,
    default: 0,
  },
  badge: {
    type: String,
    default: 'FAQ',
  },
});

const displayItems = computed(() => (Array.isArray(props.items) ? props.items : []));

const uid = Math.random().toString(36).slice(2, 9);

const highlightLabel = computed(() => {
  return typeof props.badge === 'string' && props.badge.trim() ? props.badge.trim() : 'FAQ';
});

function clampIndex(index, itemsLength) {
  if (typeof index !== 'number' || !Number.isFinite(index)) return -1;
  if (index < 0 || index >= itemsLength) return -1;
  return index;
}

const openIndex = ref(clampIndex(props.defaultOpenIndex, displayItems.value.length));

watch(displayItems, (next) => {
  const safeIndex = clampIndex(props.defaultOpenIndex, next.length);
  if (safeIndex !== -1) {
    openIndex.value = safeIndex;
    return;
  }

  if (openIndex.value >= next.length) {
    openIndex.value = next.length ? 0 : -1;
  }
});

watch(
  () => props.defaultOpenIndex,
  (next) => {
    const nextIndex = clampIndex(next, displayItems.value.length);
    openIndex.value = nextIndex;
  }
);

function toggle(index) {
  const nextIndex = openIndex.value === index ? -1 : index;
  openIndex.value = nextIndex;
  if (nextIndex === index) {
    const safeItems = displayItems.value;
    const item = safeItems[index] || props.items[index] || {};
    trackFunnelEvent('faq_question_open', {
      source: 'presale_faq',
      question_id: item.id || `faq-${index}`,
      question: item.question || '',
      index,
    });
  }
}
</script>

<style scoped>
.presale-faq {
  --faq-surface-bg: var(--brand-surface-card-bg, rgba(13, 16, 34, 0.88));
  --faq-surface-border: color-mix(in srgb, var(--brand-accent-electric, #4f6cf0) 28%, transparent);
  --faq-surface-shadow: var(--brand-surface-card-shadow, 0 25px 60px rgba(10, 12, 28, 0.45));
  --faq-text-color: var(--ui-text-primary, var(--brand-card-text, #f8fafc));
  --faq-muted-color: var(--ui-text-muted, rgba(226, 232, 240, 0.78));
  --faq-accent-color: var(--brand-accent-electric, #4f6cf0);
  --faq-accent-soft: color-mix(in srgb, var(--faq-accent-color) 18%, transparent);
  --faq-accent-softer: color-mix(in srgb, var(--faq-accent-color) 10%, transparent);

  margin: 40px 0 0;
  padding: clamp(20px, 4vw, 32px);
  border-radius: var(--brand-card-radius, 28px);
  position: relative;
  overflow: hidden;
  color: var(--faq-text-color);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--faq-accent-color) 14%, transparent),
      color-mix(in srgb, var(--brand-bg-900, #0a0d1c) 72%, transparent)
    ),
    var(--faq-surface-bg);
  border: 1px solid var(--faq-surface-border);
  box-shadow:
    var(--faq-surface-shadow),
    inset 0 0 0 1px color-mix(in srgb, var(--brand-card-border, rgba(148, 163, 184, 0.08)) 100%, transparent);
}

.presale-faq__header {
  text-align: left;
  margin-bottom: clamp(18px, 3vw, 26px);
  display: grid;
  gap: 8px;
}

.presale-faq__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.presale-faq__badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
  background: var(--faq-accent-soft);
  color: var(--faq-text-color);
  backdrop-filter: blur(6px);
}

.presale-faq__spark {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 0.8), transparent 70%);
  filter: blur(0.2px);
}

.presale-faq__title {
  margin: 0 0 8px;
  font-size: clamp(22px, 4.8vw, 32px);
  font-weight: 700;
  color: var(--faq-text-color);
  letter-spacing: -0.01em;
}

.presale-faq__description {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--faq-muted-color);
}

.presale-faq__accordion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.presale-faq__item {
  position: relative;
  border-radius: var(--brand-radius-md, 18px);
  border: 1px solid color-mix(in srgb, var(--brand-card-border, rgba(148, 163, 184, 0.18)) 100%, transparent);
  background: color-mix(in srgb, var(--faq-surface-bg) 92%, transparent);
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.presale-faq__item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--faq-accent-soft), transparent 55%);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.presale-faq__item--open {
  border-color: color-mix(in srgb, var(--faq-accent-color) 55%, transparent);
  background: color-mix(in srgb, var(--faq-surface-bg) 85%, var(--faq-accent-softer) 15%);
  box-shadow: 0 18px 38px color-mix(in srgb, var(--brand-bg-900, #11182f) 45%, transparent);
  transform: translateY(-2px);
}

.presale-faq__item--open::before {
  opacity: 1;
}

.presale-faq__question {
  margin: 0;
}

.presale-faq__trigger {
  position: relative;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: clamp(14px, 3vw, 18px) clamp(18px, 3.8vw, 22px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.presale-faq__trigger:focus {
  outline: 2px solid color-mix(in srgb, var(--faq-accent-color) 55%, transparent);
  outline-offset: 3px;
}

.presale-faq__trigger:hover {
  background: var(--faq-accent-softer);
}

.presale-faq__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--faq-accent-softer);
  transition: transform 0.25s ease, background 0.25s ease, color 0.25s ease;
}

.presale-faq__icon svg {
  width: 12px;
  height: 12px;
  transform: rotate(0deg);
  transition: transform 0.25s ease;
}

.presale-faq__item--open .presale-faq__icon {
  background: var(--faq-accent-soft);
  color: var(--faq-text-color);
}

.presale-faq__item--open .presale-faq__icon svg {
  transform: rotate(180deg);
}

.presale-faq__panel {
  padding: clamp(6px, 1.2vw, 10px) clamp(18px, 3.5vw, 24px) clamp(18px, 3.5vw, 22px);
  overflow: hidden;
}

.presale-faq__answer {
  margin: clamp(4px, 1vw, 8px) 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--faq-muted-color);
}

.presale-faq__answer a {
  color: var(--faq-accent-color);
  text-decoration: underline;
}

.faq-panel-enter-from,
.faq-panel-leave-to {
  max-height: 0;
  opacity: 0;
}

.faq-panel-enter-active,
.faq-panel-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
}

.faq-panel-enter-to,
.faq-panel-leave-from {
  max-height: 440px;
  opacity: 1;
}

@media (max-width: 768px) {
  .presale-faq {
    margin-top: 32px;
    padding: 20px;
  }

  .presale-faq__trigger {
    font-size: 15px;
  }

  .presale-faq__answer {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .presale-faq,
  .presale-faq__item,
  .presale-faq__icon svg,
  .presale-faq__icon,
  .faq-panel-enter-active,
  .faq-panel-leave-active {
    transition: none !important;
  }

  .faq-panel-enter-from,
  .faq-panel-leave-to,
  .faq-panel-enter-to,
  .faq-panel-leave-from {
    max-height: none !important;
    opacity: 1 !important;
  }
}
</style>
