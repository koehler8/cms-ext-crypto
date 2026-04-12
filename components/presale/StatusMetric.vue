<template>
  <div class="status-metric" role="listitem">
    <div class="status-metric__label ui-label-sm">
      <span
        v-if="icon"
        class="ui-icon"
        :class="`ui-icon--${icon}`"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16">
          <circle v-if="icon === 'token'" cx="8" cy="8" r="6" />
          <line v-if="icon === 'token'" x1="8" y1="4.5" x2="8" y2="11.5" />
          <line v-if="icon === 'token'" x1="5.5" y1="6.5" x2="10.5" y2="6.5" />
          <line v-if="icon === 'token'" x1="5.5" y1="9.5" x2="10.5" y2="9.5" />
          <path
            v-if="icon === 'yield'"
            d="M4 11.5h8M8 4.5v7M5.8 7l2.2-3 2.2 3"
          />
          <rect
            v-if="icon === 'lock'"
            x="3.5"
            y="7"
            width="9"
            height="6"
            rx="1.5"
          />
          <path v-if="icon === 'lock'" d="M6 7V5a2 2 0 0 1 4 0v2" />
          <path
            v-if="icon === 'rewards'"
            d="m8 3.2 1.2 2.4 2.7.4-2 2 .5 2.7L8 9.8l-2.4 1.5.5-2.7-2-2 2.7-.4Z"
          />
          <path
            v-if="icon === 'users'"
            d="M3 12.5c0-1.66 1.57-3 3.5-3s3.5 1.34 3.5 3M9 6a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
          />
          <path
            v-if="icon === 'users'"
            d="M10.5 9.75A2.5 2.5 0 0 1 12 7a2.5 2.5 0 0 1 0-5"
          />
          <circle v-if="icon === 'currency'" cx="8" cy="8" r="6" />
          <path
            v-if="icon === 'currency'"
            d="M6 10.8a2.4 2.4 0 0 0 2 1.2c1.1 0 2-.7 2-1.7 0-1-.6-1.5-1.8-1.8l-.9-.2c-1.3-.3-2.1-1-2.1-2.2 0-1.1.9-2 2.1-2.2l.2-.02c1.3-.1 2.5.7 2.8 1.9M8 4.2v7.6"
          />
          <path
            v-if="icon === 'purchase'"
            d="M5.4 6.3h5.2l.6 5.1c.06.6-.38 1.1-.98 1.1H5.8c-.6 0-1.04-.5-.98-1.1l.58-5.1Z"
          />
          <path
            v-if="icon === 'purchase'"
            d="M6.5 6.3v-.8A1.5 1.5 0 0 1 8 4a1.5 1.5 0 0 1 1.5 1.5v.8"
          />
          <ellipse
            v-if="icon === 'supply'"
            cx="8"
            cy="4.9"
            rx="3.4"
            ry="1.6"
          />
          <path
            v-if="icon === 'supply'"
            d="M4.6 4.9V8c0 1 1.5 1.8 3.4 1.8s3.4-.8 3.4-1.8V4.9"
          />
          <path
            v-if="icon === 'supply'"
            d="M4.6 7.8V11c0 1 1.5 1.8 3.4 1.8s3.4-.8 3.4-1.8V7.8"
          />
          <rect
            v-if="icon === 'wallet'"
            x="3.5"
            y="6"
            width="9"
            height="7"
            rx="1.4"
          />
          <path
            v-if="icon === 'wallet'"
            d="M12.5 8.5h-2.2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2.2"
          />
          <circle v-if="icon === 'wallet'" cx="10.8" cy="9.5" r="0.7" />
          <path
            v-if="icon === 'stake'"
            d="M4.8 6.6v4.4c0 2.8 2.2 5.2 5.2 5.9 3-.7 5.2-3.1 5.2-5.9V6.6L10 4.5Z"
          />
          <path
            v-if="icon === 'stake'"
            d="m7.8 10.7 2 1.9 3.2-3.6"
          />
        </svg>
      </span>
      <span>{{ label }}</span>
      <span
        v-if="tooltip"
        class="info-tooltip status-metric__tooltip"
        role="img"
        tabindex="0"
        :title="tooltip"
        :aria-label="tooltip"
      >
        ?
      </span>
    </div>
    <span class="status-metric__value">
      <SkeletonPulse
        v-if="loading"
        class="status-metric__loader"
        :width="loaderWidth"
        height="1.6rem"
        radius="12px"
        :label="`${label} is loading`"
        inline
      />
      <template v-else>
        <slot name="value">
          <span class="status-metric__number">{{ value }}</span>
          <UnitChip v-if="unit" class="status-metric__chip" :label="unit" />
        </slot>
      </template>
    </span>
  </div>
</template>

<script setup>
import UnitChip from '@d2sg/cms/components/ui/UnitChip.vue';
import SkeletonPulse from '@d2sg/cms/components/ui/SkeletonPulse.vue';

defineProps({
  label: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  tooltip: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loaderWidth: {
    type: String,
    default: '8ch',
  },
  value: {
    type: [String, Number],
    default: '',
  },
  unit: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.status-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(6px, 0.95vw, 12px);
  padding: clamp(12px, 1.35vw, 16px) clamp(14px, 1.85vw, 18px);
  border-radius: 16px;
  background: var(--brand-surface-card-bg, #ffffff);
  border: 1px solid var(--brand-surface-card-border, rgba(79, 108, 240, 0.16));
  box-shadow: var(--brand-surface-card-shadow, 0 18px 40px rgba(15, 23, 42, 0.12));
  width: 100%;
}

.status-metric--personal {
  background: color-mix(
    in srgb,
    var(--brand-surface-card-bg, #ffffff) 88%,
    var(--brand-accent-electric, #4f6cf0) 12%
  );
  border-color: color-mix(in srgb, var(--brand-accent-electric, #4f6cf0) 55%, transparent);
  box-shadow: 0 18px 42px rgba(28, 42, 96, 0.2);
}

.status-metric__label {
  margin: 0;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ui-text-muted, var(--brand-fg-300, #a798b0));
  font-family: var(--ui-font-body, 'Inter', 'Space Grotesk', sans-serif);
  font-size: clamp(0.64rem, 0.85vw, 0.8rem);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.status-metric__tooltip {
  margin-left: 6px;
}

.status-metric__value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: clamp(2px, 0.8vw, 8px);
  width: 100%;
  color: var(--ui-text-primary, var(--brand-fg-100));
  font-family: var(--ui-font-heading, 'Space Grotesk', 'Inter', sans-serif);
}

.status-metric__loader {
  display: inline-flex;
  min-width: 8ch;
}

.status-metric__number {
  font-size: clamp(1.45rem, 2.4vw, 1.95rem);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: 0.012em;
  word-break: break-word;
  text-shadow: 0 0 9px rgba(79, 108, 240, 0.18), 0 0 20px rgba(79, 108, 240, 0.1);
}

.status-metric__chip {
  transform: translateY(-1px);
  margin-left: clamp(4px, 0.8vw, 10px);
  padding: 0 8px;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
}

.info-tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 65%, transparent);
  background: color-mix(in srgb, var(--brand-accent-electric, #27f3ff) 18%, transparent);
  color: var(--brand-accent-electric, #27f3ff);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  cursor: help;
}

.info-tooltip:focus-visible {
  outline: 2px solid var(--brand-accent-electric, #27f3ff);
  outline-offset: 2px;
}

.ui-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--brand-fg-300, #a798b0);
}

.ui-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ui-icon--token {
  color: var(--brand-accent-electric, #4f6cf0);
}

.ui-icon--yield {
  color: var(--brand-accent-lime, #79ffb4);
}

.ui-icon--lock {
  color: var(--brand-accent-sun, #ffb347);
}

.ui-icon--rewards {
  color: var(--brand-accent-electric, #27f3ff);
}

.ui-icon--wallet {
  color: var(--brand-accent-lime, #79ffb4);
}

.ui-icon--stake {
  color: var(--brand-accent-electric, #4f6cf0);
}

.ui-icon--users {
  color: var(--brand-accent-electric, #4f6cf0);
}

.ui-icon--currency {
  color: var(--brand-accent-sun, #ffb347);
}

.ui-icon--purchase {
  color: var(--brand-accent-electric, #4f6cf0);
}

.ui-icon--supply {
  color: var(--brand-accent-lime, #79ffb4);
}

@media (max-width: 600px) {
  .status-metric {
    align-items: center;
    text-align: center;
    justify-content: center;
  }

  .status-metric__label {
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .status-metric__value {
    align-items: center;
    justify-content: center;
    text-align: center;
  }
}
</style>
