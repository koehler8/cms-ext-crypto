<template>
  <div
    ref="wrapperRef"
    class="fuse-meter"
    role="img"
    :aria-label="ariaLabel"
  >
    <svg
      class="fuse-meter__svg"
      viewBox="0 0 320 60"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="fuse-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f97316" />
          <stop offset="45%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#fde68a" />
        </linearGradient>
        <radialGradient id="spark-glow" fx="50%" fy="50%" r="50%">
          <stop offset="0%" stop-color="#fcd34d" stop-opacity="1" />
          <stop offset="55%" stop-color="#fcd34d" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#f97316" stop-opacity="0" />
        </radialGradient>
      </defs>

      <path
        class="fuse-meter__track"
        d="M20 30 C 120 10, 200 50, 300 30"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        stroke-width="8"
        stroke-linecap="round"
      />

      <path
        class="fuse-meter__progress"
        :d="pathData"
        fill="none"
        stroke="url(#fuse-fill)"
        stroke-width="6"
        stroke-linecap="round"
        :style="progressDash"
      />

      <g
        class="fuse-meter__spark"
        v-if="showSpark"
        :style="sparkTransform"
      >
        <circle cx="0" cy="0" r="14" fill="url(#spark-glow)" />
        <circle cx="0" cy="0" r="4" fill="#fef3c7" />
      </g>

      <g class="fuse-meter__bomb" transform="translate(300,30)">
        <circle r="16" class="fuse-meter__bomb-body" />
        <path d="M0 -18 L4 -26" class="fuse-meter__bomb-stem" />
        <circle r="4" cx="6" cy="-30" class="fuse-meter__bomb-spark" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  progress: {
    type: Number,
    default: 0,
  },
  mode: {
    type: String,
    default: 'sold',
  },
  label: {
    type: String,
    default: '',
  },
  animates: {
    type: Boolean,
    default: true,
  },
});

const normalizedProgress = computed(() => {
  const value = Number.isFinite(props.progress) ? props.progress : 0;
  return Math.min(Math.max(value, 0), 100);
});

const prefersMotion = ref(true);
const isVisible = ref(false);
const sparkProgress = ref(normalizedProgress.value);
let animationFrame;
let observer;
let motionQuery;

const pathLength = 260;
const pathData = 'M20 30 C 120 10, 200 50, 300 30';

const ariaLabel = computed(() => {
  if (props.label) return props.label;
  const modeLabel = props.mode === 'time' ? 'time remaining' : 'tokens sold';
  return `Fuse progress showing ${normalizedProgress.value.toFixed(0)}% ${modeLabel}`;
});

const progressDash = computed(() => ({
  strokeDasharray: `${pathLength}`,
  strokeDashoffset: `${((100 - normalizedProgress.value) / 100) * pathLength}`,
}));

const sparkTransform = computed(() => {
  const t = sparkProgress.value / 100;
  const clamped = Math.min(Math.max(t, 0), 1);
  const x = 20 + 280 * clamped;
  const y = 30 + Math.sin(clamped * Math.PI * 2) * 6;
  return {
    transform: `translate(${x}px, ${y}px)`
  };
});

const showSpark = computed(() => prefersMotion.value && isVisible.value && props.animates);

function animateSpark() {
  if (!showSpark.value) return;
  const target = normalizedProgress.value;
  const current = sparkProgress.value;
  const delta = target - current;
  if (Math.abs(delta) > 0.2) {
    sparkProgress.value = current + delta * 0.08;
  } else {
    const flicker = Math.sin(Date.now() / 120) * 1.5;
    sparkProgress.value = target + flicker;
  }
  animationFrame = window.requestAnimationFrame(animateSpark);
}

function stopAnimation() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function handleMotionChange(event) {
  prefersMotion.value = !event.matches;
  if (!prefersMotion.value) {
    stopAnimation();
  } else if (!animationFrame && isVisible.value && props.animates) {
    animationFrame = window.requestAnimationFrame(animateSpark);
  }
}

function setupIntersectionObserver(el) {
  if (!('IntersectionObserver' in window)) {
    isVisible.value = true;
    if (prefersMotion.value && props.animates && !animationFrame) {
      animationFrame = window.requestAnimationFrame(animateSpark);
    }
    return;
  }
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isVisible.value = entry.isIntersecting;
      if (!isVisible.value) {
        stopAnimation();
      } else if (prefersMotion.value && props.animates && !animationFrame) {
        animationFrame = window.requestAnimationFrame(animateSpark);
      }
    });
  }, { threshold: 0.2 });
  observer.observe(el);
}

const wrapperRef = ref(null);

onMounted(() => {
  if (typeof window === 'undefined' || !props.animates) return;

  if (typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersMotion.value = !motionQuery.matches;
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(handleMotionChange);
    }
  } else {
    prefersMotion.value = true;
  }

  if (prefersMotion.value && isVisible.value) {
    animationFrame = window.requestAnimationFrame(animateSpark);
  }

  if (wrapperRef.value) {
    setupIntersectionObserver(wrapperRef.value);
  }
});

onUnmounted(() => {
  stopAnimation();
  if (observer) observer.disconnect();
  if (motionQuery) {
    if (motionQuery.removeEventListener) {
      motionQuery.removeEventListener('change', handleMotionChange);
    } else if (motionQuery.removeListener) {
      motionQuery.removeListener(handleMotionChange);
    }
  }
});

watch(
  () => props.animates,
  (animates) => {
    if (!animates) {
      stopAnimation();
      return;
    }
    if (prefersMotion.value && isVisible.value && !animationFrame) {
      animationFrame = window.requestAnimationFrame(animateSpark);
    }
  }
);

watch(normalizedProgress, (value) => {
  if (!showSpark.value) {
    sparkProgress.value = value;
  }
});
</script>

<style scoped>
.fuse-meter {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.fuse-meter__svg {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 4px 14px rgba(250, 204, 21, 0.25));
}

.fuse-meter__track {
  stroke-dasharray: 260;
  stroke-dashoffset: 0;
}

.fuse-meter__progress {
  transition: stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fuse-meter__bomb-body {
  fill: var(--brand-bg-900, #0a0a0d);
  stroke: rgba(255, 255, 255, 0.18);
  stroke-width: 2px;
}

.fuse-meter__bomb-stem {
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 3px;
  stroke-linecap: round;
}

.fuse-meter__bomb-spark {
  fill: #facc15;
}

@media (prefers-reduced-motion: reduce) {
  .fuse-meter__progress {
    transition: none;
  }
}
</style>
