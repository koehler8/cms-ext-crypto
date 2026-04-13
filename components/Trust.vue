<template>
  <section id="trust" class="trust-section section-shell" data-analytics-section="trust">
    <div class="container">
      <SbCard class="trust-card" :aria-labelledby="headingId">
        <h2 :id="headingId" class="trust-card__headline">
          {{ trustHeader }}
        </h2>
        <p v-if="trustBlurb" class="trust-card__blurb">
          {{ trustBlurb }}
        </p>
        <ul v-if="trustLinks.length" class="trust-card__links">
          <li v-for="link in trustLinks" :key="link.href" class="trust-card__link-item">
            <a
              class="trust-card__link"
              :href="link.href"
              :target="link.external ? '_blank' : undefined"
              rel="noopener"
            >
              {{ link.text }}
              <span aria-hidden="true" class="trust-card__link-icon">↗</span>
            </a>
          </li>
        </ul>
      </SbCard>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, ref } from 'vue';
import SbCard from '@koehler8/cms/components/ui/SbCard.vue';

const pageContent = inject('pageContent', ref({}));

const trustContent = computed(() => pageContent.value?.trust || {});

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const trustHeader = computed(() => sanitize(trustContent.value?.header));
const trustBlurb = computed(() => sanitize(trustContent.value?.blurb));
const trustLinks = computed(() => {
  const raw = Array.isArray(trustContent.value?.links) ? trustContent.value.links : [];
  return raw
    .map((entry) => {
      const text = sanitize(entry?.text || entry?.label);
      const href = sanitize(entry?.href || entry?.url);
      if (!text || !href) return null;
      const external = entry?.external !== false;
      return { text, href, external };
    })
    .filter(Boolean);
});

const headingId = `trust-heading-${Math.random().toString(36).slice(2, 9)}`;
</script>

<style scoped>
.trust-card {
  text-align: center;
  color: var(--brand-fg-100, #f0eaf3);
  display: grid;
  gap: 20px;
}

.trust-card__headline {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 700;
  color: var(--brand-accent-electric, #27f3ff);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.trust-card__blurb {
  margin: 0 auto;
  max-width: 48rem;
  font-size: clamp(1rem, 2.2vw, 1.15rem);
  line-height: 1.6;
  color: rgba(240, 234, 243, 0.88);
}

.trust-card__links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.trust-card__link-item {
  margin: 0;
}

.trust-card__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--brand-surface-card-border, rgba(39, 243, 255, 0.35));
  color: var(--brand-accent-electric, #27f3ff);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.trust-card__link:hover,
.trust-card__link:focus-visible {
  border-color: var(--brand-input-border-active, rgba(39, 243, 255, 0.65));
  box-shadow: var(--brand-focus-ring, 0 0 0 2px rgba(39, 243, 255, 0.35));
  transform: translateY(-2px);
  outline: none;
}

.trust-card__link-icon {
  font-size: 0.85em;
}
</style>
