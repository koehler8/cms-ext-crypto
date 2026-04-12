<template>
  <section v-if="faqItems.length" class="presale-faq-wrapper">
    <div class="presale-faq-wrapper__container">
      <PresaleFaqContent
        :title="faqTitle"
        :description="faqDescription"
        :items="faqItems"
        :default-open-index="faqDefaultOpen"
        :badge="faqBadge"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, inject, ref } from 'vue';
import PresaleFaqContent from './presale/PresaleFaqContent.vue';

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

const faqConfig = computed(() => pageContent.value?.presale?.faq || {});

const faqTitle = computed(() => {
  const title = faqConfig.value?.title;
  return typeof title === 'string' && title.trim() ? title.trim() : 'Presale FAQ';
});

const faqDescription = computed(() => {
  const description = faqConfig.value?.description;
  return typeof description === 'string' && description.trim() ? description.trim() : '';
});

const faqBadge = computed(() => {
  const badge = faqConfig.value?.badge;
  return typeof badge === 'string' && badge.trim() ? badge.trim() : '';
});

const faqDefaultOpen = computed(() => {
  const value = Number.parseInt(faqConfig.value?.defaultOpenIndex ?? -1, 10);
  const itemsCount = Array.isArray(faqConfig.value?.items) ? faqConfig.value.items.length : 0;
  if (!Number.isFinite(value) || value < 0 || value >= itemsCount) return -1;
  return value;
});

const faqItems = computed(() => {
  const items = Array.isArray(faqConfig.value?.items) ? faqConfig.value.items : [];
  return items
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const question =
        typeof entry.question === 'string' && entry.question.trim()
          ? entry.question.trim()
          : `Question ${index + 1}`;
      const answer = typeof entry.answer === 'string' ? entry.answer.trim() : entry.answer;
      return {
        id: entry.id || `faq-${index}`,
        question,
        answer,
      };
    })
    .slice(0, 8);
});
</script>

<style scoped>
.presale-faq-wrapper {
  width: 100%;
  margin: 48px 0 0;
}

.presale-faq-wrapper__container {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding-inline: clamp(16px, 4vw, 32px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .presale-faq-wrapper {
    margin-top: 32px;
  }
}
</style>
