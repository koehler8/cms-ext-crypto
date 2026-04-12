<template>
  <section
    class="social-proof"
    data-analytics-section="social-proof"
  >
    <div class="container">
      <header class="social-proof__header">
        <div class="social-proof__intro">
          <p v-if="badgeText" class="social-proof__badge">{{ badgeText }}</p>
          <h2 class="social-proof__title">{{ titleText }}</h2>
          <p v-if="subtitleText" class="social-proof__subtitle">{{ subtitleText }}</p>
        </div>
        <div class="social-proof__meta">
          <div v-if="communityLabel" class="social-proof__counter">
            <span class="social-proof__counter-count">{{ formattedCommunityCount }}</span>
            <span class="social-proof__counter-label">{{ communityLabel }}</span>
            <span v-if="communityDailyDisplay" class="social-proof__counter-daily">
              {{ communityDailyDisplay }}
            </span>
          </div>
          <button
            v-if="shareEnabled"
            type="button"
            class="social-proof__share"
            @click="handleShareClick"
          >
            Share this presale
          </button>
        </div>
      </header>

      <div class="social-proof__feed" ref="feedRef">
        <article
          v-for="post in postsToRender"
          :key="post.id"
          class="social-proof__card"
        >
          <header class="social-proof__card-header">
            <div class="social-proof__avatar" :data-fallback="post.initials">
              <img
                v-if="post.avatar"
                :src="post.avatar"
                :alt="`${post.author} avatar`"
                loading="lazy"
              >
              <span v-else>{{ post.initials }}</span>
            </div>
            <div>
              <p class="social-proof__author">
                {{ post.author }}
                <span v-if="post.handle" class="social-proof__handle">{{ post.handle }}</span>
              </p>
              <p class="social-proof__source">
                {{ post.source }}
                <span v-if="post.timestamp">• {{ post.timestamp }}</span>
              </p>
            </div>
          </header>
          <p class="social-proof__content">{{ post.safeContent }}</p>
          <footer class="social-proof__card-footer">
            <a
              v-if="post.link"
              :href="post.link"
              target="_blank"
              rel="noopener"
              class="social-proof__permalink"
              @click="handlePostClick(post)"
            >
              View post
            </a>
          </footer>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { trackEvent } from '@d2sg/cms/utils/analytics';
import { getTokenSymbol } from '@d2sg/cms/utils/tokenFormat';

const pageContent = inject('pageContent', ref({}));
const siteData = inject('siteData', ref({}));

const feedRef = ref(null);
const communityCount = ref(null);
const communityDaily = ref(null);
let refreshTimer = null;

const tokenSymbol = getTokenSymbol();
const defaultTweetText = tokenSymbol
  ? `I just joined the presale for ${tokenSymbol}. Grab your spot before the next price jump!`
  : 'I just joined the presale. Grab your spot before the next price jump!';

const socialProofConfig = computed(() => pageContent.value?.socialProof || {});

const badgeText = computed(
  () => sanitizeString(socialProofConfig.value?.badge) || 'Backroom whispers'
);
const titleText = computed(
  () =>
    sanitizeString(socialProofConfig.value?.title) ||
    'Fans are lighting up the timeline'
);
const subtitleText = computed(() => sanitizeString(socialProofConfig.value?.subtitle));

const shareConfig = computed(() => socialProofConfig.value?.share || {});
const shareEnabled = computed(() => Boolean(shareConfig.value?.tweetText || shareConfig.value?.url));

const communityConfig = computed(() => socialProofConfig.value?.community || {});
const communityLabel = computed(() => sanitizeString(communityConfig.value?.label));

const communityRefreshMs = computed(() => {
  const minutes = Number.parseInt(communityConfig.value?.refreshMinutes, 10);
  if (Number.isFinite(minutes) && minutes > 0) {
    return minutes * 60_000;
  }
  return 180_000;
});

const communityDailyDisplay = computed(() => {
  if (communityDaily.value === null) return '';
  const value = Number(communityDaily.value);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `+${new Intl.NumberFormat('en-US').format(value)} today`;
});

const formattedCommunityCount = computed(() => {
  const value = communityCount.value;
  if (!Number.isFinite(value)) return '';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US').format(value);
});

const postsToRender = computed(() => {
  const posts = Array.isArray(socialProofConfig.value?.posts)
    ? socialProofConfig.value.posts
    : [];

  const sanitized = posts
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const content = sanitizeString(entry.content);
      if (!content) return null;

      const author = sanitizeString(entry.author) || 'Anonymous';
      const handle = sanitizeString(entry.handle);
      const source = sanitizeString(entry.source) || 'Community';
      const timestamp = sanitizeString(entry.timestamp);
      const link = sanitizeUrl(entry.link);
      const avatar = sanitizeUrl(entry.avatar);
      const id = entry.id || `social-proof-${index}`;

      return {
        id,
        author,
        handle,
        source,
        timestamp,
        link,
        avatar,
        safeContent: truncateContent(content),
        initials: author.trim().slice(0, 2).toUpperCase(),
      };
    })
    .filter(Boolean);

  if (sanitized.length >= 3) {
    return sanitized.slice(0, 12);
  }

  const testimonials = Array.isArray(siteData.value?.shared?.testimonials)
    ? siteData.value.shared.testimonials
    : [];

  testimonials.forEach((entry, index) => {
    if (sanitized.length >= 6) return;
    const quote = sanitizeString(entry.quote);
    if (!quote) return;
    sanitized.push({
      id: `testimonial-${index}`,
      author: sanitizeString(entry.author) || 'Community member',
      handle: '',
      source: 'Community testimonial',
      timestamp: '',
      link: '',
      avatar: '',
      safeContent: truncateContent(quote),
      initials: (sanitizeString(entry.author) || 'C').charAt(0).toUpperCase(),
    });
  });

  if (!sanitized.length) {
    sanitized.push({
      id: 'fallback-social-proof',
      author: 'Community News Desk',
      handle: '',
      source: 'Community',
      timestamp: 'Live',
      link: '',
      avatar: '',
      safeContent:
        'Presale members are spreading the word—bring a friend before the next price jump.',
      initials: 'CN',
    });
  }

  return sanitized;
});

function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function sanitizeUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;
  return '';
}

function truncateContent(value) {
  if (!value) return '';
  const words = value.split(/\s+/);
  if (words.length <= 60) return value;
  return `${words.slice(0, 60).join(' ')}…`;
}

function buildShareUrl() {
  const url = sanitizeUrl(shareConfig.value?.url) || window.location.href;
  const tweetText =
    shareConfig.value?.tweetText ||
    defaultTweetText;
  const hashtags = Array.isArray(shareConfig.value?.hashtags)
    ? shareConfig.value.hashtags.filter(Boolean).join(',')
    : '';
  const utm = sanitizeString(shareConfig.value?.utm);

  const searchParams = new URLSearchParams();
  searchParams.set('text', tweetText);
  if (url) searchParams.set('url', utm ? appendUtmToUrl(url, utm) : url);
  if (hashtags) searchParams.set('hashtags', hashtags);

  return `https://twitter.com/intent/tweet?${searchParams.toString()}`;
}

function appendUtmToUrl(baseUrl, utmString) {
  try {
    const url = new URL(baseUrl);
    if (utmString) {
      const pairs = utmString.split('&');
      pairs.forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value !== undefined) {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  } catch (error) {
    return baseUrl;
  }
}

function handleShareClick() {
  const shareUrl = buildShareUrl();
  trackEvent('social_proof_share_click', {
    token: (import.meta.env.VITE_TOKEN || 'unknown').toLowerCase(),
    share_url: shareUrl,
  });

  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank', 'noopener');
  }
}

function handlePostClick(post) {
  trackEvent('social_proof_post_click', {
    token: (import.meta.env.VITE_TOKEN || 'unknown').toLowerCase(),
    post_id: post.id,
    source: (post.source || '').toLowerCase(),
  });
}

async function refreshCommunityCounts() {
  const endpoint = sanitizeUrl(communityConfig.value?.endpoint);
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const nextCount = toSafeInteger(data?.count);
      const nextDaily = toSafeInteger(data?.daily ?? data?.delta);
      if (nextCount !== null) communityCount.value = nextCount;
      if (nextDaily !== null) communityDaily.value = nextDaily;
      return;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[SocialProofFeed] Failed to refresh community counter', error);
      }
    }
  }

  const fallbackCount = toSafeInteger(communityConfig.value?.count);
  const fallbackDaily = toSafeInteger(communityConfig.value?.daily);
  if (fallbackCount !== null) communityCount.value = fallbackCount;
  if (fallbackDaily !== null) communityDaily.value = fallbackDaily;
}

function toSafeInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim().replace(/,/g, ''), 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

function startRefreshLoop() {
  stopRefreshLoop();
  refreshCommunityCounts();
  refreshTimer = window.setInterval(refreshCommunityCounts, communityRefreshMs.value);
}

function stopRefreshLoop() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return;
  startRefreshLoop();
});

onBeforeUnmount(() => {
  stopRefreshLoop();
});
</script>

<style scoped>
.social-proof {
  padding: 80px 0;
  background: radial-gradient(circle at top left, rgba(16, 18, 45, 0.95), rgba(9, 10, 28, 0.9));
  color: #e2e8f0;
}

@media (min-width: 992px) {
  .social-proof {
    padding: 120px 0;
  }
}

.social-proof__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 3rem;
}

.social-proof__badge {
  display: inline-block;
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(190, 242, 100, 0.9);
  margin-bottom: 0.75rem;
}

.social-proof__title {
  margin: 0 0 1.5rem;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(2.25rem, 4.4vw, 3.1rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f8fafc;
}

.social-proof__subtitle {
  margin: 0;
  font-size: clamp(0.95rem, 2.3vw, 1.05rem);
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(226, 232, 240, 0.7);
  max-width: 560px;
}

.social-proof__meta {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex: 1 1 200px;
  justify-content: flex-end;
  min-width: 260px;
}

.social-proof__counter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.social-proof__counter-count {
  font-size: clamp(1.4rem, 2.8vw, 1.8rem);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 700;
  color: #a855f7;
}

.social-proof__counter-label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(226, 232, 240, 0.7);
}

.social-proof__counter-daily {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(226, 232, 240, 0.6);
}

.social-proof__share {
  border: 1px solid rgba(129, 140, 248, 0.5);
  background: rgba(30, 64, 175, 0.25);
  color: #c4b5fd;
  font-weight: 600;
  letter-spacing: 0.14em;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  text-transform: uppercase;
  border-radius: var(--brand-button-radius, 14px);
  padding: 0.65rem 1.6rem;
  cursor: pointer;
  transition: background 0.2s ease, border 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.social-proof__share:hover,
.social-proof__share:focus {
  background: rgba(129, 140, 248, 0.35);
  border-color: rgba(129, 140, 248, 0.8);
  color: #f8fafc;
  transform: translateY(-1px);
}

.social-proof__feed {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.social-proof__card {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(129, 140, 248, 0.25);
  border-radius: var(--brand-card-radius, 24px);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 210px;
  box-shadow: var(--brand-surface-card-shadow, 0 8px 24px rgba(217, 22, 75, 0.18));
}

.social-proof__card-header {
  display: flex;
  gap: 0.9rem;
  align-items: center;
}

.social-proof__avatar {
  width: 46px;
  height: 46px;
  border-radius: var(--brand-radius-md, 14px);
  background: rgba(39, 243, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-electric-blue, #27f3ff);
  font-weight: 700;
  text-transform: uppercase;
  overflow: hidden;
}

.social-proof__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.social-proof__author {
  margin: 0;
  font-weight: 600;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  color: #f8fafc;
}

.social-proof__handle {
  margin-left: 0.4rem;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.85rem;
}

.social-proof__source {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(148, 163, 184, 0.75);
}

.social-proof__content {
  margin: 0;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: rgba(226, 232, 240, 0.85);
  line-height: 1.55;
  font-size: 0.95rem;
}

.social-proof__permalink {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  color: #8fd4ff;
  text-decoration: none;
  transition: color 0.2s ease;
}

.social-proof__permalink:hover,
.social-proof__permalink:focus {
  color: #c4e8ff;
  text-decoration: underline;
}

@media (max-width: 1024px) {
  .social-proof__meta {
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;
  }

  .social-proof__counter {
    align-items: flex-start;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .social-proof {
    padding: 48px 0;
  }

  .social-proof__header {
    gap: 1.5rem;
  }

  .social-proof__feed {
    display: flex;
    overflow-x: auto;
    gap: 1rem;
    padding-bottom: 0.25rem;
  }

  .social-proof__card {
    min-width: 260px;
    flex: 0 0 auto;
  }
}
</style>
