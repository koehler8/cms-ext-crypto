<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="visible"
        class="first-onboarding"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-describedby="description ? descriptionId : undefined"
      >
        <div class="first-onboarding__backdrop" @click="handleBackdrop"></div>
        <div class="first-onboarding__surface" ref="surface" role="document">
          <span class="first-onboarding__glow" aria-hidden="true"></span>
          <button
            ref="closeButton"
            type="button"
            class="first-onboarding__close"
            :aria-label="dismissAriaLabel"
            @click="emitDismiss('close')"
          >
            ✕
          </button>
          <p v-if="eyebrow" class="first-onboarding__eyebrow">{{ eyebrow }}</p>
          <h3 v-if="title" :id="titleId" class="first-onboarding__title">{{ title }}</h3>
          <p v-if="description" :id="descriptionId" class="first-onboarding__description">
            {{ description }}
          </p>
          <ol class="first-onboarding__steps">
            <li
              v-for="(step, index) in normalizedSteps"
              :key="step.id"
              class="first-onboarding__step"
            >
              <span class="first-onboarding__badge">{{ index + 1 }}</span>
              <div class="first-onboarding__step-copy">
                <span v-if="step.title" class="first-onboarding__step-title">{{ step.title }}</span>
                <p class="first-onboarding__step-text">{{ step.text }}</p>
              </div>
            </li>
          </ol>
          <button
            ref="ctaButton"
            type="button"
            class="first-onboarding__cta"
            :class="{ 'first-onboarding__cta--disabled': props.enableConnect && !canOpenConnect }"
            :disabled="props.enableConnect && !canOpenConnect"
            @click="handlePrimaryClick"
          >
            {{ props.enableConnect ? connectLabel : ctaLabel }}
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useAppKit } from '@reown/appkit/vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  eyebrow: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  steps: {
    type: Array,
    default: () => [],
  },
  enableConnect: {
    type: Boolean,
    default: false,
  },
  ctaLabel: {
    type: String,
    default: 'Got it',
  },
  connectLabel: {
    type: String,
    default: 'Connect Wallet',
  },
  dismissAriaLabel: {
    type: String,
    default: 'Dismiss onboarding prompt',
  },
});

const emit = defineEmits(['dismiss']);

const surface = ref(null);
const ctaButton = ref(null);
const closeButton = ref(null);
const baseId = `first-onboarding-${Math.random().toString(36).slice(2, 9)}`;
const titleId = `${baseId}-title`;
const descriptionId = `${baseId}-description`;

let appKit = null;
try {
  appKit = useAppKit();
} catch (error) {
  if (import.meta.env?.DEV) {
    console.warn('FirstTimeOnboarding: AppKit not initialised for connect CTA.', error);
  }
}

const canOpenConnect = computed(() => Boolean(appKit && typeof appKit.open === 'function'));
const connectLabel = computed(() => {
  if (typeof props.connectLabel === 'string' && props.connectLabel.trim()) {
    return props.connectLabel.trim();
  }
  return 'Connect Wallet';
});

function sanitizeStep(entry, index) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const text = entry.trim();
    if (!text) return null;
    return {
      id: `${baseId}-step-${index}`,
      text,
      title: '',
    };
  }

  if (typeof entry === 'object') {
    const text = typeof entry.text === 'string' ? entry.text.trim() : '';
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    if (!text) return null;
    return {
      id: entry.id || `${baseId}-step-${index}`,
      text,
      title,
    };
  }

  return null;
}

const normalizedSteps = computed(() =>
  (props.steps || [])
    .map((entry, index) => sanitizeStep(entry, index))
    .filter(Boolean)
    .slice(0, 4)
);

function getFocusableElements() {
  if (!surface.value) return [];
  return Array.from(
    surface.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((node) => !node.hasAttribute('disabled') && node.offsetParent !== null);
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation();
    emitDismiss('escape');
    return;
  }

  if (event.key !== 'Tab') return;

  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const currentIndex = focusable.indexOf(document.activeElement);
  let nextIndex = currentIndex;
  if (event.shiftKey) {
    nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
  }

  focusable[nextIndex].focus();
  event.preventDefault();
}

function focusPrimaryAction() {
  if (typeof window === 'undefined') return;
  nextTick(() => {
    if (ctaButton.value) {
      ctaButton.value.focus();
    } else if (closeButton.value) {
      closeButton.value.focus();
    }
  });
}

function addKeyListener() {
  if (typeof document === 'undefined') return;
  document.addEventListener('keydown', handleKeydown, { capture: true });
}

function removeKeyListener() {
  if (typeof document === 'undefined') return;
  document.removeEventListener('keydown', handleKeydown, { capture: true });
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      addKeyListener();
      focusPrimaryAction();
    } else {
      removeKeyListener();
    }
  }
);

onBeforeUnmount(() => {
  removeKeyListener();
});

function emitDismiss(reason) {
  emit('dismiss', reason);
}

function handleBackdrop() {
  emitDismiss('backdrop');
}

function handlePrimaryClick() {
  if (props.enableConnect) {
    if (!appKit || typeof appKit.open !== 'function') {
      emitDismiss('cta_disabled');
      return;
    }
    appKit.open({ view: 'Connect' });
    emitDismiss('connect_cta');
    return;
  }

  emitDismiss('cta');
}
</script>

<style scoped>
.first-onboarding {
  position: fixed;
  inset: 0;
  z-index: 2147483639;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 5vw, 40px);
}

.first-onboarding__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 6, 18, 0.82);
  backdrop-filter: blur(6px);
}

.first-onboarding__surface {
  position: relative;
  width: min(520px, 90vw);
  display: grid;
  gap: clamp(16px, 3vw, 22px);
  padding: clamp(28px, 5vw, 40px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(24, 18, 36, 0.94);
  box-shadow:
    0 26px 80px rgba(10, 8, 18, 0.6),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  color: var(--brand-fg-100, #f8f8ff);
  pointer-events: auto;
}

.first-onboarding__glow {
  position: absolute;
  inset: -30%;
  background: radial-gradient(55% 60% at 50% 20%, rgba(255, 45, 134, 0.4), rgba(39, 243, 255, 0.18), transparent 75%);
  filter: blur(24px);
  opacity: 0.9;
  pointer-events: none;
}

.first-onboarding__close {
  position: absolute;
  top: 18px;
  right: 18px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  font-size: 1.1rem;
  cursor: pointer;
}

.first-onboarding__close:focus-visible {
  outline: 2px solid rgba(255, 243, 102, 0.8);
  outline-offset: 2px;
}

.first-onboarding__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(255, 255, 255, 0.68);
}

.first-onboarding__title {
  margin: 0;
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
  font-family: var(--ui-font-heading, 'Space Grotesk', sans-serif);
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.first-onboarding__description {
  margin: 0;
  font-size: 0.95rem;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(255, 255, 255, 0.76);
}

.first-onboarding__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

.first-onboarding__step {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 12px;
  align-items: start;
}

.first-onboarding__badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 61, 162, 0.82), rgba(39, 243, 255, 0.68));
  color: #0a0612;
  font-weight: 700;
  font-size: 0.94rem;
  font-family: var(--ui-font-heading, 'Space Grotesk', sans-serif);
}

.first-onboarding__step-copy {
  display: grid;
  gap: 4px;
}

.first-onboarding__step-title {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  color: rgba(255, 255, 255, 0.74);
}

.first-onboarding__step-text {
  margin: 0;
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  font-size: 0.98rem;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.5;
}

.first-onboarding__cta {
  border: none;
  background: linear-gradient(135deg, rgba(255, 45, 134, 0.92), rgba(39, 243, 255, 0.92));
  color: #09060f;
  font-family: var(--ui-font-heading, 'Space Grotesk', sans-serif);
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 14px 26px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(12, 10, 22, 0.45);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.first-onboarding__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(12, 10, 22, 0.5);
}

.first-onboarding__cta:focus-visible {
  outline: 2px solid rgba(255, 243, 102, 0.9);
  outline-offset: 3px;
}

.first-onboarding__cta:disabled,
.first-onboarding__cta--disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  filter: grayscale(0.1) brightness(0.9);
}

:deep(.fade-enter-active),
:deep(.fade-leave-active) {
  transition: opacity 0.22s ease;
}

:deep(.fade-enter-from),
:deep(.fade-leave-to) {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .first-onboarding__cta {
    transition: none;
  }

  :deep(.fade-enter-active),
  :deep(.fade-leave-active) {
    transition: none;
  }
}
</style>
