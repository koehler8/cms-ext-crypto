<template>
  <section id="tokenomics" class="tokenomics-section container-fluid" data-analytics-section="tokenomics">
    <div class="container">
      <header class="tokenomics-header text-center">
        <div class="tokenomics-heading">
          <h2 class="tokenomics-title">
            {{ tokenomicsHeading }}
          </h2>
        </div>
        <p v-if="tokenomicsIntro" class="tokenomics-intro">{{ tokenomicsIntro }}</p>
      </header>
      <div class="tokenomics-grid">
        <div
          v-for="(item, idx) in items"
          :key="idx"
          class="tokenomics-card"
        >
          <div
            class="tokenomics-chart"
            :class="{ 'tokenomics-chart--visible': chartVisibility[idx] }"
            :data-index="idx"
            :ref="(el) => setChartRef(el, idx)"
          >
            <PercentDoughnut
              :percent="item.percent"
              :color="item.color"
              :ariaLabel="formatChartLabel(item)"
            />
          </div>
          <h4 class="tokenomics-card-title">
            {{ item.title }}
          </h4>
          <p class="tokenomics-card-description">
            {{ item.description }}
          </p>
        </div>
      </div>
      <div v-if="details" class="tokenomics-details">
          <h3 v-if="details.title" class="tokenomics-details-title">
            {{ details.title }}
          </h3>
          <ul class="tokenomics-details-list">
            <li v-for="(detail, index) in details.items" :key="index" class="tokenomics-details-item">
              <span v-if="detail.label" class="tokenomics-details-label">{{ detail.label }}</span>
              <span v-if="detail.value && detail.href" class="tokenomics-details-value">
                <a
                  :href="detail.href"
                  class="tokenomics-details-link"
                  :target="detail.external ? '_blank' : null"
                  :rel="detail.external ? 'noopener noreferrer' : null"
                >
                  <code v-if="detail.monospace">{{ detail.value }}</code>
                  <template v-else>{{ detail.value }}</template>
                </a>
              </span>
              <span v-else-if="detail.value" class="tokenomics-details-value">
                <code v-if="detail.monospace">{{ detail.value }}</code>
                <template v-else>{{ detail.value }}</template>
              </span>
              <span v-else-if="detail.text" class="tokenomics-details-text">
                {{ detail.text }}
              </span>
              <span v-if="detail.note" class="tokenomics-details-note">{{ detail.note }}</span>
            </li>
          </ul>
          <p v-if="details.footnote" class="tokenomics-details-footnote">
            {{ details.footnote }}
          </p>
        </div>
    </div>
  </section>
</template>

<script setup>
  import PercentDoughnut from './PercentDoughnut.vue';
  import { computed, inject, ref, onMounted, onBeforeUnmount, onBeforeUpdate, watch, nextTick } from 'vue';
  import { resolveThemeColor, DEFAULT_THEME_COLOR_ORDER } from '@koehler8/cms/utils/themeColors';

  const pageContent = inject('pageContent', ref({}));

  const tokenomicsHeading = computed(() => {
    const heading = pageContent.value?.tokenomicsHeading;
    if (typeof heading === 'string' && heading.trim()) {
      return heading.trim();
    }
    return 'Tokenomics';
  });

  const tokenomicsIntro = computed(() => {
    const intro = pageContent.value?.tokenomicsIntro;
    if (typeof intro === 'string' && intro.trim()) {
      return intro.trim();
    }
    return 'Token allocation breakdown:';
  });

  const rawItems = computed(() =>
    Array.isArray(pageContent.value?.tokenomics) ? pageContent.value.tokenomics : []
  );

  const items = computed(() =>
    rawItems.value.map((entry, index) => {
      if (!entry || typeof entry !== 'object') return entry;

      const providedToken =
        typeof entry.colorToken === 'string' && entry.colorToken.trim()
          ? entry.colorToken.trim()
          : null;

      const fallbackToken = DEFAULT_THEME_COLOR_ORDER[index % DEFAULT_THEME_COLOR_ORDER.length];
      const colorKey = providedToken || fallbackToken;
      const resolvedColor =
        resolveThemeColor(colorKey) ||
        resolveThemeColor(fallbackToken);

      return {
        ...entry,
        colorToken: colorKey,
        color: resolvedColor,
      };
    })
  );

  const chartElements = ref([]);
  const chartVisibility = ref([]);
  let intersectionObserver = null;

  const ensureVisibilityState = () => {
    const next = items.value.map((_, index) => chartVisibility.value[index] || false);
    chartVisibility.value = next;
  };

  const teardownObserver = () => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  };

  const handleIntersections = (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const rawIndex = entry.target?.dataset?.index;
      const parsedIndex = typeof rawIndex === 'string' ? Number(rawIndex) : Number(rawIndex);
      if (!Number.isFinite(parsedIndex) || parsedIndex < 0) {
        return;
      }

      const next = chartVisibility.value.slice();
      if (!next[parsedIndex]) {
        next[parsedIndex] = true;
        chartVisibility.value = next;
      }

      if (intersectionObserver) {
        intersectionObserver.unobserve(entry.target);
      }
    });
  };

  const initObserver = () => {
    teardownObserver();
    ensureVisibilityState();

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      chartVisibility.value = chartVisibility.value.map(() => true);
      return;
    }

    intersectionObserver = new IntersectionObserver(handleIntersections, {
      threshold: 0.45,
      rootMargin: '0px 0px -10% 0px',
    });

    chartElements.value.forEach((element, index) => {
      if (!element || chartVisibility.value[index]) return;
      intersectionObserver.observe(element);
    });
  };

  const setChartRef = (element, index) => {
    if (!element) {
      chartElements.value[index] = undefined;
      return;
    }
    chartElements.value[index] = element;
    if (intersectionObserver && !chartVisibility.value[index]) {
      intersectionObserver.observe(element);
    }
  };

  onBeforeUpdate(() => {
    chartElements.value = [];
  });

  onMounted(() => {
    ensureVisibilityState();
    nextTick(() => {
      initObserver();
    });
  });

  onBeforeUnmount(() => {
    teardownObserver();
  });

  watch(
    items,
    async () => {
      ensureVisibilityState();
      await nextTick();
      initObserver();
    },
    { flush: 'post' }
  );

  function formatChartLabel(item) {
    const title = typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Token allocation segment';
    const percent = Number.isFinite(item?.percent) ? item.percent : 0;
    return `${title}: ${percent}% of total tokens`;
  }

  const details = computed(() => {
    const raw = pageContent.value?.tokenomicsDetails;
    if (!raw || typeof raw !== 'object') return null;

    const parseItem = (entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const text = entry.trim();
        if (!text) return null;
        return { text };
      }

      if (typeof entry !== 'object') return null;

      const label = typeof entry.label === 'string' ? entry.label.trim() : '';
      const value = typeof entry.value === 'string' ? entry.value.trim() : '';
      const text = typeof entry.text === 'string' ? entry.text.trim() : '';
      const href = typeof entry.href === 'string' ? entry.href.trim() : '';
      const note = typeof entry.note === 'string' ? entry.note.trim() : '';
      const external = entry.external !== false;
      const monospace = entry.monospace === true;

      if (!label && !value && !text) return null;

      return {
        label,
        value,
        text,
        href,
        note,
        external,
        monospace,
      };
    };

    const items = Array.isArray(raw.items)
      ? raw.items.map(parseItem).filter((item) => Boolean(item && (item.text || item.value || item.label)))
      : [];

    if (!items.length) return null;

    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const footnote = typeof raw.footnote === 'string' ? raw.footnote.trim() : '';

    return {
      title,
      items,
      footnote,
    };
  });
</script>

<style scoped>
.tokenomics-section {
  padding: clamp(60px, 8vw, 110px) 0 clamp(45px, 7vw, 90px);
  background: var(--tokenomics-bg, var(--brand-bg-900, #0f0f16));
  color: var(--tokenomics-text, var(--ui-text-primary, #f0eaf3));
}

.tokenomics-header {
  max-width: 48rem;
  margin: 0 auto clamp(32px, 4vw, 48px);
}

.tokenomics-heading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding-bottom: 0.85rem;
  margin-bottom: 0.5rem;
}

.tokenomics-heading::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: clamp(90px, 14vw, 140px);
  height: 3px;
  background: var(
    --tokenomics-heading-accent,
    var(--brand-border-highlight, var(--brand-accent-electric, #27f3ff))
  );
  transform: translateX(-50%);
  border-radius: 999px;
}

.tokenomics-title {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(2rem, 5vw, 2.6rem);
  text-transform: uppercase;
  letter-spacing: 0.32em;
  color: var(--tokenomics-title-color, var(--ui-text-primary, #f0eaf3));
  margin: 0;
}

.tokenomics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(20px, 4vw, 36px);
  text-align: center;
}

.tokenomics-card {
  padding-inline: clamp(10px, 3vw, 18px);
}

.tokenomics-card-title {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1.1rem, 3vw, 1.3rem);
  letter-spacing: 0.18em;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--tokenomics-title-color, var(--ui-text-primary, #f0eaf3));
  margin-bottom: 0.65rem;
}

.tokenomics-card-description {
  color: var(
    --tokenomics-body-color,
    var(--ui-text-muted, var(--brand-card-text, #f0eaf3))
  );
  font-size: 1rem;
  margin: 0;
}

.tokenomics-intro {
  margin: 0 auto 30px;
  max-width: 36rem;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1rem, 2.4vw, 1.1rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(
    --tokenomics-intro-color,
    var(--brand-countdown-label, var(--ui-text-muted, var(--brand-card-text, #f0eaf3)))
  );
}

.tokenomics-chart {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(210px, 68vw, 260px);
  max-width: 100%;
  margin: 0 auto 22px;
  padding: clamp(16px, 4vw, 24px);
  box-sizing: content-box;
  overflow: visible;
  opacity: 0;
  transform: translateY(30px) scale(0.9);
  filter: saturate(0.85);
  transition: opacity 0.6s ease, transform 0.65s cubic-bezier(0.22, 0.61, 0.36, 1), filter 0.6s ease;
}

.tokenomics-chart::before {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--brand-card-text, #ffffff) 25%, transparent),
    transparent 70%
  );
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
  z-index: 0;
}

.tokenomics-chart :deep(.chart-figure) {
  transition: transform 0.65s cubic-bezier(0.22, 0.61, 0.36, 1), filter 0.6s ease, opacity 0.6s ease;
  width: 100%;
  aspect-ratio: 1 / 1;
  margin: 0;
  transform: rotate(-6deg) scale(0.9);
  opacity: 0.2;
  position: relative;
  z-index: 1;
  color: inherit;
}

.tokenomics-chart :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}

.tokenomics-chart--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: saturate(1.1);
}

.tokenomics-chart--visible :deep(.chart-figure) {
  transform: rotate(0deg) scale(1);
  opacity: 1;
  filter: drop-shadow(
    0 0 18px var(
      --tokenomics-chart-glow,
      color-mix(in srgb, var(--brand-border-highlight, #ff2d86) 35%, transparent)
    )
  );
}

.tokenomics-chart--visible::before {
  animation: tokenomicsHalo 1.6s ease-out 0.12s both;
}

@keyframes tokenomicsHalo {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  45% {
    opacity: 0.55;
    transform: scale(1.05);
  }
  80% {
    opacity: 0.42;
    transform: scale(1.2);
  }
  100% {
    opacity: 0;
    transform: scale(1.32);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tokenomics-chart,
  .tokenomics-chart::before,
  .tokenomics-chart :deep(.chart-figure) {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }

  .tokenomics-chart {
    opacity: 1 !important;
    filter: none !important;
  }

  .tokenomics-chart::before {
    opacity: 0 !important;
  }

  .tokenomics-chart :deep(.chart-figure) {
    opacity: 1 !important;
    filter: none !important;
  }
}

@media (max-width: 576px) {
  .tokenomics-title {
    letter-spacing: 0.22em;
  }

  .tokenomics-card {
    padding: 0 4px;
  }

  .tokenomics-intro {
    margin-bottom: 24px;
    letter-spacing: 0.12em;
  }

  .tokenomics-chart {
    width: min(82vw, 260px);
    padding: clamp(18px, 6vw, 26px);
  }
}

.tokenomics-details {
  margin: clamp(32px, 6vw, 64px) auto 0;
  max-width: 840px;
}

.tokenomics-details-title {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--tokenomics-title-color, var(--ui-text-primary, var(--brand-card-text, #f0eaf3)));
  margin-bottom: 1.5rem;
}

.tokenomics-details-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tokenomics-details-item {
  position: relative;
  padding-left: 1.75rem;
  margin-bottom: 1rem;
  color: var(
    --tokenomics-body-color,
    var(--ui-text-muted, var(--brand-card-text, #f0eaf3))
  );
  font-size: 1rem;
  line-height: 1.6;
}

.tokenomics-details-item::before {
  content: '•';
  position: absolute;
  left: 0;
  top: 0;
  color: var(--tokenomics-bullet-color, var(--brand-border-highlight, var(--brand-accent-electric, #27f3ff)));
  font-size: 1.5rem;
  line-height: 1.1;
}

.tokenomics-details-label {
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(
    --tokenomics-label-color,
    color-mix(in srgb, var(--ui-text-primary, #ffffff) 70%, transparent)
  );
  margin-bottom: 0.35rem;
}

.tokenomics-details-value,
.tokenomics-details-text {
  display: block;
}

.tokenomics-details-value code {
  font-family: 'Space Grotesk', 'Fira Code', 'Source Code Pro', monospace;
  font-size: 0.95rem;
  background: var(
    --tokenomics-code-bg,
    color-mix(in srgb, var(--brand-card-text, #ffffff) 12%, transparent)
  );
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
}

.tokenomics-details-link {
  color: var(--tokenomics-link-color, var(--brand-electric-blue, #27f3ff));
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-decoration-color: var(
    --tokenomics-link-underline,
    color-mix(in srgb, var(--tokenomics-link-color, var(--brand-electric-blue, #27f3ff)) 45%, transparent)
  );
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.tokenomics-details-link:hover,
.tokenomics-details-link:focus {
  color: var(--tokenomics-link-hover, var(--brand-crimson-red, #d9164b));
  text-decoration-color: currentColor;
}

.tokenomics-details-note {
  display: block;
  margin-top: 0.35rem;
  color: var(
    --tokenomics-note-color,
    color-mix(in srgb, var(--ui-text-primary, #ffffff) 55%, transparent)
  );
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.tokenomics-details-footnote {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(
    --tokenomics-footnote-color,
    color-mix(in srgb, var(--ui-text-primary, #ffffff) 52%, transparent)
  );
}

@media (max-width: 576px) {
  .tokenomics-details-title {
    letter-spacing: 0.14em;
  }

  .tokenomics-details-item {
    padding-left: 1.4rem;
    margin-bottom: 0.85rem;
  }
}
</style>
