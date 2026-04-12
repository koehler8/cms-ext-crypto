<template>
  <figure class="chart-figure" role="img" :aria-label="resolvedAriaLabel">
    <Doughnut
      :options="resolvedOptions"
      :data="chartData"
    />
    <span class="sr-only">{{ resolvedAriaLabel }}</span>
  </figure>
</template>

<script>
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js';

function resolveCssVar(varName, fallback) {
  if (!varName) return fallback;
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}

const FALLBACK_GLOW = 'rgba(255, 255, 255, 0.4)';

function parseHexToRgb(value) {
  if (typeof value !== 'string' || !value.startsWith('#')) return null;
  const hex = value.slice(1).trim();
  const normalized = hex.length === 3
    ? hex
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : hex;
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((component) => Number.isNaN(component))) return null;
  return { r, g, b };
}

function parseRgbString(value) {
  if (typeof value !== 'string') return null;
  const match = value.replace(/\s+/g, '').match(/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,[^)]+)?\)$/i);
  if (!match) return null;
  const [, r, g, b] = match;
  return { r: Number(r), g: Number(g), b: Number(b) };
}

function toRgbaString(rgb, alpha = 0.45) {
  if (!rgb) return FALLBACK_GLOW;
  const { r, g, b } = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildGlowColor(segmentColor) {
  const rgbFromSegment =
    (typeof segmentColor === 'string' && (parseHexToRgb(segmentColor) || parseRgbString(segmentColor))) ||
    null;
  if (rgbFromSegment) {
    return toRgbaString(rgbFromSegment);
  }
  const accent = resolveCssVar('--brand-accent-warm') || resolveCssVar('--brand-accent-electric');
  const accentRgb = parseHexToRgb(accent) || parseRgbString(accent);
  if (accentRgb) {
    return toRgbaString(accentRgb);
  }
  return FALLBACK_GLOW;
}

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  {
    id: 'centerText',
    beforeDraw(chart) {
      const {
        ctx,
        chartArea: { top, bottom, left, right },
      } = chart;
      ctx.save();
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const centerFill =
        resolveCssVar('--brand-chart-center-text') ||
        resolveCssVar('--brand-chart-center-text', '#fff');
      ctx.fillStyle = centerFill;
      ctx.font = '600 24px "Space Grotesk", "Inter", sans-serif';
      const dataset = chart?.data?.datasets?.[0];
      const value = dataset?.data?.[0] ?? 0;
      const segmentColor = Array.isArray(dataset?.backgroundColor)
        ? dataset.backgroundColor[0]
        : dataset?.backgroundColor;
      ctx.shadowColor = buildGlowColor(segmentColor);
      ctx.shadowBlur = 18;
      ctx.fillText(`${value}%`, centerX, centerY);
      ctx.shadowBlur = 0;
      ctx.restore();
    },
  }
);

export default {
  name: 'DoughnutChart',
  components: { Doughnut },
  props: {
    percent: { type: Number, required: true },
    color: { type: String, required: true },
    ariaLabel: { type: String, default: '' },
  },
  data() {
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const viewportMq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(max-width: 520px)')
        : null;
    return {
      prefersReducedMotion: mq ? mq.matches : false,
      reduceMotionQuery: mq,
      handleMotionChange: null,
      isCompactViewport: viewportMq ? viewportMq.matches : false,
      viewportQuery: viewportMq,
      handleViewportChange: null,
    };
  },
  computed: {
    chartTrackColor() {
      return (
        resolveCssVar('--brand-chart-track') ||
        resolveCssVar('--brand-chart-track', '#39444a')
      );
    },
    chartData() {
      return {
        datasets: [
          {
            backgroundColor: [this.color, this.chartTrackColor],
            borderColor: [this.color, 'transparent'],
            borderWidth: [0, 0],
            data: [this.percent, Math.max(0, 100 - this.percent)],
          },
        ],
      };
    },
    resolvedOptions() {
      const padding = this.isCompactViewport ? 14 : 18;
      const radius = this.isCompactViewport ? '90%' : '94%';
      const cutout = this.isCompactViewport ? '66%' : '68%';
      return {
        responsive: true,
        maintainAspectRatio: false,
        cutout,
        radius,
        plugins: {
          datalabels: { display: false },
          legend: { display: false },
          tooltip: { enabled: false },
        },
        layout: {
          padding: { top: padding, right: padding, bottom: padding, left: padding },
        },
        animation: this.prefersReducedMotion ? false : { animateRotate: true },
        elements: {
          arc: {
            borderJoinStyle: 'round',
            borderWidth: 0,
          },
        },
      };
    },
    resolvedAriaLabel() {
      if (this.ariaLabel) return this.ariaLabel;
      const percentValue = Number.isFinite(this.percent) ? this.percent : 0;
      return `Chart showing ${percentValue}% allocation`;
    },
  },
  mounted() {
    if (this.reduceMotionQuery) {
      this.handleMotionChange = (event) => {
        this.prefersReducedMotion = event.matches;
      };
      if (this.reduceMotionQuery.addEventListener) {
        this.reduceMotionQuery.addEventListener('change', this.handleMotionChange);
      } else if (this.reduceMotionQuery.addListener) {
        this.reduceMotionQuery.addListener(this.handleMotionChange);
      }
    }

    if (this.viewportQuery) {
      this.handleViewportChange = (event) => {
        this.isCompactViewport = event.matches;
      };
      if (this.viewportQuery.addEventListener) {
        this.viewportQuery.addEventListener('change', this.handleViewportChange);
      } else if (this.viewportQuery.addListener) {
        this.viewportQuery.addListener(this.handleViewportChange);
      }
    }
  },
  beforeUnmount() {
    if (this.reduceMotionQuery && this.handleMotionChange) {
      if (this.reduceMotionQuery.removeEventListener) {
        this.reduceMotionQuery.removeEventListener('change', this.handleMotionChange);
      } else if (this.reduceMotionQuery.removeListener) {
        this.reduceMotionQuery.removeListener(this.handleMotionChange);
      }
    }

    if (this.viewportQuery && this.handleViewportChange) {
      if (this.viewportQuery.removeEventListener) {
        this.viewportQuery.removeEventListener('change', this.handleViewportChange);
      } else if (this.viewportQuery.removeListener) {
        this.viewportQuery.removeListener(this.handleViewportChange);
      }
    }
  },
};
</script>

<style scoped>
.chart-figure {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0 0 12px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
