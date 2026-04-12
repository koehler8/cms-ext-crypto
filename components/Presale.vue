<template>
  <section id="presale" class="ui-section" data-analytics-section="presale">
    <div class="ui-section__container">
      <div class="ui-section__grid">
          <div class="ui-section__panel ui-section__panel--status">
            <!-- Status column renders countdown + live price ahead of metrics for clear screen-reader order -->
            <h3 class="section-title section-title--muted presale-status-title">
              {{ panelTitles.status }}
            </h3>
            <div class="ui-section__card ui-section__card--status brand-card ui-card">
              <Status />
            </div>
          </div>
          <div class="ui-section__panel ui-section__panel--actions">
            <div class="presale-tabs" role="tablist" aria-label="Presale actions">
              <button
                v-for="tab in tabConfigs"
                :key="tab.id"
                type="button"
                class="presale-tab"
                :class="{ 'presale-tab--active': activeTab === tab.id }"
                role="tab"
                :id="tabButtonId(tab.id)"
                :aria-selected="activeTab === tab.id"
                :aria-controls="tabPanelId(tab.id)"
                :tabindex="activeTab === tab.id ? 0 : -1"
                @click="setActiveTab(tab.id)"
                @keydown="handleTabKeydown($event, tab.id)"
              >
                <span class="presale-tab__label">{{ tab.label }}</span>
              </button>
            </div>
          <div
            v-for="tab in tabConfigs"
            :key="`${tab.id}-panel`"
            :id="tabPanelId(tab.id)"
            class="presale-tab-panel"
              role="tabpanel"
              :aria-labelledby="tabButtonId(tab.id)"
              :aria-hidden="activeTab !== tab.id"
              v-show="activeTab === tab.id"
            >
              <div
                :class="[
                  'ui-section__card',
                  tab.id === 'buy' ? 'ui-section__card--buy' : 'ui-section__card--stake',
                  'brand-card',
                  'ui-card',
                ]"
              >
                <component :is="tab.component" />
              </div>
            </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import Buy from './presale/Buy.vue';
import Stake from './presale/Stake.vue';
import Status from './presale/Status.vue';
import { usePresaleContext } from '../composables/usePresaleContext';
import { getTokenSymbol } from '../utils/tokenFormat';

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

const pageContent = inject('pageContent', ref({}));

const { presalePulse, personalPresaleSummary } = usePresaleContext();

provide('presalePulse', presalePulse);
provide('personalPresaleSummary', personalPresaleSummary);

const tokenSymbol = getTokenSymbol();
const defaultBuyLabel = tokenSymbol ? `Buy ${tokenSymbol}` : 'Buy';

function resolvePanelTitle(value, fallback) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

const panelTitles = computed(() => {
  const titles = pageContent.value?.presale?.panelTitles || {};
  return {
    status: resolvePanelTitle(titles.status, 'Status'),
    buy: resolvePanelTitle(titles.buy, defaultBuyLabel),
    stake: resolvePanelTitle(titles.stake, 'Stake & Rewards'),
  };
});

const activeTab = ref('buy');

const tabConfigs = computed(() => [
  { id: 'buy', step: '2', label: panelTitles.value.buy, component: Buy },
  { id: 'stake', step: '3', label: panelTitles.value.stake, component: Stake },
]);

function tabButtonId(tabId) {
  return `presale-tab-${tabId}`;
}

function tabPanelId(tabId) {
  return `presale-panel-${tabId}`;
}

function setActiveTab(tabId) {
  const availableIds = tabConfigs.value.map((tab) => tab.id);
  if (!availableIds.includes(tabId)) return;
  activeTab.value = tabId;
}
provide('setActivePresaleTab', setActiveTab);

function focusTabButton(tabId) {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(tabButtonId(tabId));
  if (target) target.focus();
}

function handleTabKeydown(event, currentId) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  const ids = tabConfigs.value.map((tab) => tab.id);
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1) return;
  const delta = event.key === 'ArrowRight' ? 1 : -1;
  const nextIndex = (currentIndex + delta + ids.length) % ids.length;
  const nextId = ids[nextIndex];
  setActiveTab(nextId);
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(() => focusTabButton(nextId));
  }
}

function normalizeHash(hash) {
  return typeof hash === 'string' ? hash.trim().toLowerCase() : '';
}

function syncStateWithHash(hash) {
  const normalized = normalizeHash(hash);
  if (normalized === '#rightpresale' || normalized === '#stake') {
    setActiveTab('stake');
  } else if (normalized === '#centerpresale' || normalized === '#buy') {
    setActiveTab('buy');
  }
}

function handleHashChange() {
  if (typeof window === 'undefined') return;
  syncStateWithHash(window.location.hash);
}

onMounted(() => {
  if (typeof window === 'undefined') return;
  syncStateWithHash(window.location.hash);
  window.addEventListener('hashchange', handleHashChange);
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('hashchange', handleHashChange);
});

</script>

<style>
#presale {
  --ui-card-padding: 24px;
  --ui-card-gap: 24px;
  --ui-gap-lg: 24px;
  --ui-gap-md: 16px;
  --ui-gap-tight: 8px;
  --ui-radius-card: var(--brand-card-radius, 24px);
  --ui-shadow-card: var(--brand-surface-card-shadow, 0 8px 24px rgba(15, 23, 42, 0.12));
  --ui-type-title: 1.75rem;
  --ui-type-subheadline: 1.25rem;
  --ui-type-value: 1.5rem;
  --ui-type-body: 1rem;
  --ui-type-caption: 0.8125rem;
  --ui-font-heading: 'Space Grotesk', 'Inter', sans-serif;
  --ui-font-body: 'Inter', 'Space Grotesk', sans-serif;
  --ui-title-spacing: 20px;
}
</style>

<style scoped>

#presale {
  --presale-grid-gap: clamp(24px, 3vw, 32px);
}

.ui-section__container {
  width: min(var(--layout-container-max-width, min(1180px, 92vw)), 100%);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--layout-container-padding, clamp(16px, 4vw, 48px));
  padding-right: var(--layout-container-padding, clamp(16px, 4vw, 48px));
  box-sizing: border-box;
}

.ui-section__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--presale-grid-gap);
  margin-bottom: clamp(32px, 6vw, 64px);
}

.ui-section__panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-md, 16px);
  height: 100%;
}

.presale-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 999px;
  border: 1px solid var(--tabs-border, color-mix(in srgb, var(--brand-border-highlight, rgba(255, 255, 255, 0.08)) 90%, transparent));
  background: color-mix(in srgb, var(--brand-card-soft, rgba(0, 0, 0, 0.4)) 92%, transparent);
  box-shadow: var(--tabs-shadow, 0 16px 36px color-mix(in srgb, var(--brand-shadow-color, rgba(0, 0, 0, 0.35)) 65%, transparent));
}

.presale-tab {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 22px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--tab-color, var(--brand-fg-300, #a798b0));
  font-family: var(--ui-font-heading);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.presale-tab:hover {
  color: var(--brand-fg-100, #f5f5f5);
  transform: translateY(-1px);
}

.presale-tab:focus-visible {
  outline: 2px solid var(--brand-accent-electric, #27f3ff);
  outline-offset: 3px;
}

.presale-tab__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--tab-step-border, rgba(255, 255, 255, 0.18));
  background: var(--tab-step-bg, rgba(255, 255, 255, 0.06));
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: border 0.2s ease, background 0.2s ease, color 0.2s ease;
  color: var(--tab-step-color, rgba(255, 255, 255, 0.72));
}

.presale-tab__label {
  white-space: nowrap;
}

.presale-tab--active {
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--brand-accent-secondary, #ff6edc) 32%, transparent),
    color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 22%, transparent)
  );
  color: var(--tab-active-color, var(--brand-fg-100, #f5f5f5));
  box-shadow: var(--tab-active-shadow, 0 18px 42px color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 18%, transparent));
}

.presale-tab--active .presale-tab__step {
  background: color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 18%, transparent);
  border-color: color-mix(in srgb, var(--brand-accent-primary, #27f3ff) 42%, transparent);
  color: var(--tab-active-step-color, var(--brand-accent-primary, #27f3ff));
}

.presale-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-tight, 4px);
  margin-top: -20px;
}

.section-title {
  margin: var(--ui-title-spacing) 0 0;
  font-family: var(--ui-font-heading);
  font-weight: 700;
  font-size: var(--ui-type-title);
  line-height: 1.2;
  letter-spacing: 0.015em;
  text-transform: uppercase;
  color: var(--ui-text-primary, var(--brand-fg-100, #f5f5f5));
}

.section-title--muted {
  color: var(--ui-text-muted, var(--brand-fg-300, #a798b0));
  font-weight: 600;
}

.presale-status-title {
  display: block;
  color: var(
    --ui-status-heading-color,
    var(--ui-text-muted, var(--brand-fg-300, #a798b0))
  );
}

.ui-section__card--buy,
.ui-section__card--stake {
  position: relative;
  overflow: hidden;
}

.ui-section__card {
  flex: 1 1 auto;
}

.presale-scroll-highlight {
  position: relative;
}

.presale-scroll-highlight::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: calc(var(--ui-radius-card, 24px) + 10px);
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 85%, transparent);
  box-shadow:
    0 0 32px color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 35%, transparent),
    0 0 72px color-mix(in srgb, var(--brand-neon-pink, #ff2d86) 25%, transparent);
  opacity: 0;
  animation: presaleCardPulse 1.25s ease-out forwards;
  pointer-events: none;
  z-index: 0;
}
@keyframes presaleCardPulse {
  0% {
    opacity: 0;
    box-shadow: 0 0 0 0 rgba(39, 243, 255, 0);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    box-shadow: 0 0 0 0 rgba(39, 243, 255, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .presale-scroll-highlight::after {
    animation-duration: 0.01s;
  }
}

@media (min-width: 768px) {
  .ui-section__grid {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .ui-section__panel--status {
    position: sticky;
    top: 80px;
  }
}

@media (min-width: 1280px) {
  .ui-section__panel--actions {
    align-self: flex-start;
  }

  .ui-section__card--buy {
    position: sticky;
    top: 108px;
    z-index: var(--layer-sticky-card, 0);
  }
}

@media (max-width: 768px) {
  .presale-tabs {
    width: 100%;
    justify-content: center;
    gap: 8px;
    padding: 6px;
  }

  .presale-tab {
    flex: 1 1 calc(50% - 8px);
    justify-content: center;
    padding: 10px 16px;
    font-size: 0.85rem;
    letter-spacing: 0.1em;
  }

  .presale-tab__label {
    white-space: normal;
    text-align: center;
  }

  .presale-tab__step {
    width: 24px;
    height: 24px;
    font-size: 0.6875rem;
  }
}

@media (max-width: 640px) {
  .ui-section {
    padding: 28px 0 36px;
    --ui-title-spacing: 16px;
    scroll-margin-top: 76px;
  }

  .ui-section__grid {
    gap: var(--ui-gap-tight, 8px);
  }

  .presale-tab-panel {
    margin-top: -22px;
  }

  .ui-section__inner {
    padding-inline: 16px;
  }

  .section-title {
    font-size: 1.5rem;
    letter-spacing: 0.01em;
  }

  .presale-status-title {
    opacity: 0;
  }
}

@media (max-width: 480px) {
  .presale-tab {
    flex: 1 1 100%;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }

  .section-title {
    font-size: 1.4rem;
  }
}

@media (max-width: 960px) and (min-width: 641px) {
  .ui-section {
    padding-top: 78px;
    scroll-margin-top: clamp(124px, 19vh, 180px);
  }
}

:global(.brand-card) {
  background: var(--brand-surface-card-bg, #ffffff);
  border: 1px solid var(--brand-surface-card-border, rgba(79, 108, 240, 0.16));
  border-radius: var(--ui-radius-card, 24px);
  padding: var(--ui-card-padding, 24px);
  box-shadow: var(--ui-shadow-card, var(--brand-surface-card-shadow, 0 18px 40px rgba(15, 23, 42, 0.12)));
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: var(--brand-fg-200, #334261);
  line-height: 1.6;
}

@media (max-width: 1024px) {
  :global(.brand-card) {
    padding: 20px;
  }
}

@media (max-width: 600px) {
  :global(.brand-card) {
    padding: 16px;
  }
}
</style>
