<script setup lang="ts">
definePage({
  meta: {
    title: 'Home',
    description: 'Template for the app Explore/Home screen, with a real live Community feed.',
    category: 'template',
    platform: 'app',
  },
})

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CdxButton,
  CdxCard,
  CdxIcon,
  CdxMessage,
  CdxProgressBar,
  CdxTab,
  CdxTabs,
  CdxThumbnail,
} from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconBookmarkOutline,
  cdxIconDownload,
  cdxIconDownTriangle,
  cdxIconExpand,
  cdxIconGlobe,
  cdxIconHelpNotice,
  cdxIconInfo,
  cdxIconInstance,
  cdxIconShareAndroid,
  cdxIconShareIOS,
  cdxIconUpTriangle,
  cdxIconUserAvatarOutline,
} from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_MAIN_BOTTOM_NAV_ITEMS,
  IOS_MAIN_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import { useIsIos } from '@/composables/useAppPlatform'

import FeedSectionHeader from './FeedSectionHeader.vue'
import { fetchFeed, type Feed } from './fetchFeed'
import { rewriteWikiLinks } from './rewriteWikiLinks'

const router = useRouter()
const isIos = useIsIos()

const lang = 'en'

const feed = ref<Feed | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const activeTab = ref<'community' | 'foryou'>('community')

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    feed.value = await fetchFeed({ lang })
  } catch {
    error.value = 'Unable to load the feed right now.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

function articleUrl(title: string): string {
  return `/template-app-article?article=${encodeURIComponent(title)}&lang=${lang}`
}

function html(raw: string): string {
  return rewriteWikiLinks(raw, lang)
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

const currentYear = new Date().getFullYear()

function yearsAgo(year: number): number {
  return currentYear - year
}

const activeNewsIndex = ref(0)
const newsScrollRef = ref<HTMLElement | null>(null)

function onNewsScroll(): void {
  const el = newsScrollRef.value
  if (!el || el.clientWidth === 0) return
  activeNewsIndex.value = Math.round(el.scrollLeft / el.clientWidth)
}

function scrollToNews(index: number): void {
  const el = newsScrollRef.value
  if (!el) return
  el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
}

function onBottomNav(item: AppBottomNavItem): void {
  if (item === 'search') router.push('/template-app-search')
  else if (item === 'bookmarks') router.push('/template-app-saved')
  else if (item === 'history') router.push('/template-app-activity')
}

const bottomNavItems = computed(() =>
  isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS,
)

const activeNavItem = computed<AppBottomNavItem>(() => (isIos.value ? 'globe' : 'home'))

const headerLeft: AppHeaderItem[] = [{ type: 'link', icon: 'logo-wikipedia', label: 'Wikipedia' }]

/** Android default Explore header is tabs+bell; iOS swaps bell for account, no ellipsis. */
const headerRight = computed(
  (): AppHeaderItem[] =>
    isIos.value
      ? [
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'user-avatar-outline', label: 'Account' },
        ]
      : [
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'bell-outline', label: 'Notifications' },
        ],
)

const shareIcon = computed(() => (isIos.value ? cdxIconShareIOS : cdxIconShareAndroid))


</script>

<template>
  <AppChromeWrapper
    :left="headerLeft"
    :right="headerRight"
    :bottom-nav-items="bottomNavItems"
    :active-nav-item="activeNavItem"
    @navigate="onBottomNav"
  >
    <div class="template-app-home">
      <div class="template-app-home__tabs-row">
        <CdxTabs
          v-model:active="activeTab"
          class="template-app-home__tabs"
        >
          <CdxTab
            name="community"
            label="Community"
          />
          <CdxTab
            name="foryou"
            label="For you"
          />
        </CdxTabs>
        <CdxButton
          class="template-app-home__lang-pill"
          weight="quiet"
        >
          EN
          <CdxIcon :icon="cdxIconExpand" />
        </CdxButton>
      </div>

      <div
        v-if="activeTab === 'foryou'"
        class="template-app-home__empty"
      >
        <p>Nothing here yet.</p>
      </div>

      <template v-else>
        <div
          v-if="loading"
          class="template-app-home__progress"
        >
          <CdxProgressBar
            inline
            aria-label="Loading"
          />
        </div>
        <p
          v-else-if="error"
          class="template-app-home__status"
        >
          {{ error }}
        </p>

        <div
          v-else-if="feed"
          class="template-app-home__feed"
        >
          <CdxMessage
            class="template-app-home__intro-banner"
            type="notice"
            :icon="cdxIconGlobe"
          >
            Content and resources selected by and about the Wikimedia community.
          </CdxMessage>

          <h3 class="template-app-home__date-heading">
            {{ feed.dateLabel }}
          </h3>

          <template v-if="feed.tfa">
            <FeedSectionHeader
              heading="Featured article"
              description="One of Wikipedia's best articles, updated daily."
            />
            <div
              class="template-app-home__tfa"
              :class="{ 'template-app-home__tfa--with-image': feed.tfa.thumbnailUrl }"
            >
              <img
                v-if="feed.tfa.thumbnailUrl"
                class="template-app-home__tfa-image"
                :src="feed.tfa.thumbnailUrl"
                :alt="feed.tfa.displayTitle"
              >
              <div
                v-if="feed.tfa.thumbnailUrl"
                class="template-app-home__floating-actions"
              >
                <CdxButton
                  weight="normal"
                  aria-label="Save"
                >
                  <CdxIcon :icon="cdxIconBookmarkOutline" />
                </CdxButton>
                <CdxButton
                  weight="normal"
                  aria-label="Share"
                >
                  <CdxIcon :icon="shareIcon" />
                </CdxButton>
              </div>

              <CdxCard
                :url="articleUrl(feed.tfa.title)"
                class="template-app-home__tfa-card"
              >
                <template #title>
                  {{ feed.tfa.displayTitle }}
                </template>
                <template #description>
                  {{ feed.tfa.description }}
                </template>
                <template #supporting-text>
                  <hr class="template-app-home__divider">
                  <p
                    class="template-app-home__tfa-extract"
                    v-html="html(feed.tfa.extractHtml)"
                  />
                </template>
              </CdxCard>
            </div>
          </template>

          <template v-if="feed.mostRead.length">
            <FeedSectionHeader
              heading="Top read"
              description="What is trending today on Wikipedia."
            />
            <ol class="template-app-home__top-read-list">
              <li
                v-for="(article, index) in feed.mostRead"
                :key="article.pageid"
              >
                <a
                  class="template-app-home__rank-link"
                  :href="articleUrl(article.title)"
                >
                  <span class="template-app-home__rank-badge">{{ index + 1 }}</span>
                  <strong class="template-app-home__rank-title">{{ article.displayTitle }}</strong>
                  <span class="template-app-home__rank-description">{{
                    article.description
                  }}</span>
                  <div class="template-app-home__rank-meta">
                    <CdxIcon
                      :icon="article.trend === 'down' ? cdxIconDownTriangle : cdxIconUpTriangle"
                      :class="{
                        'template-app-home__trend--down': article.trend === 'down',
                        'template-app-home__trend--up': article.trend !== 'down',
                      }"
                    />
                    <span>{{ formatNumber(article.views) }} views</span>
                  </div>
                  <CdxThumbnail
                    class="template-app-home__rank-thumb"
                    :thumbnail="article.thumbnailUrl ? { url: article.thumbnailUrl } : null"
                  />
                </a>
              </li>
            </ol>
            <CdxButton
              class="template-app-home__more-link"
              action="progressive"
              weight="quiet"
            >
              More top read
              <CdxIcon :icon="cdxIconArrowNext" />
            </CdxButton>
          </template>

          <template v-if="feed.dyk.length">
            <FeedSectionHeader
              heading="Did you know?"
              description="Interesting facts from newly created or expanded articles."
            />
            <ul class="template-app-home__dyk-list">
              <li
                v-for="(fact, index) in feed.dyk"
                :key="index"
              >
                <CdxIcon
                  class="template-app-home__dyk-icon"
                  :icon="cdxIconHelpNotice"
                />
                <span v-html="html(fact)" />
              </li>
            </ul>
            <CdxButton
              class="template-app-home__more-link"
              action="progressive"
              weight="quiet"
            >
              More did you know
              <CdxIcon :icon="cdxIconArrowNext" />
            </CdxButton>
          </template>

          <template v-if="feed.news.length">
            <FeedSectionHeader
              heading="In the news"
              description="Current events from around the world."
            />
            <div
              ref="newsScrollRef"
              class="template-app-home__news-carousel"
              @scroll="onNewsScroll"
            >
              <div
                v-for="(story, index) in feed.news"
                :key="index"
                class="template-app-home__news-slide"
                :class="{ 'template-app-home__news-slide--with-image': story.thumbnailUrl }"
              >
                <img
                  v-if="story.thumbnailUrl"
                  class="template-app-home__news-image"
                  :src="story.thumbnailUrl"
                  alt=""
                >
                <p
                  class="template-app-home__news-caption"
                  v-html="html(story.storyHtml)"
                />
              </div>
            </div>
            <div
              v-if="feed.news.length > 1"
              class="template-app-home__news-dots"
            >
              <button
                v-for="(story, index) in feed.news"
                :key="index"
                type="button"
                class="template-app-home__news-dot"
                :class="{ 'template-app-home__news-dot--active': index === activeNewsIndex }"
                :aria-label="`Story ${index + 1}`"
                @click="scrollToNews(index)"
              />
            </div>
          </template>

          <template v-if="feed.onThisDay.length">
            <FeedSectionHeader
              heading="On this day"
              description="Discover historical events from this day."
            />
            <div class="template-app-home__otd-timeline">
              <div
                v-for="item in feed.onThisDay"
                :key="item.year"
                class="template-app-home__otd-entry"
              >
                <span class="template-app-home__otd-marker" />
                <div class="template-app-home__otd-date">
                  <span class="template-app-home__otd-year">{{ item.year }}</span>
                  <span class="template-app-home__otd-years-ago">{{ yearsAgo(item.year) }} years ago</span>
                </div>
                <p class="template-app-home__otd-text">
                  {{ item.text }}
                </p>
                <div
                  v-if="item.pages.length"
                  class="template-app-home__otd-pages"
                >
                  <CdxCard
                    v-for="page in item.pages"
                    :key="page.pageid"
                    :url="articleUrl(page.title)"
                    :thumbnail="page.thumbnailUrl ? { url: page.thumbnailUrl } : null"
                    force-thumbnail
                    class="template-app-home__otd-page-card"
                  >
                    <template #title>
                      {{ page.displayTitle }}
                    </template>
                    <template #description>
                      {{ page.description }}
                    </template>
                  </CdxCard>
                </div>
              </div>
            </div>
          </template>

          <template v-if="feed.image">
            <FeedSectionHeader
              heading="Picture of the day"
              description="A photo, drawing, or animation featured today."
            />
            <div class="template-app-home__potd">
              <div class="template-app-home__potd-image-wrap">
                <img
                  v-if="feed.image.thumbnailUrl"
                  class="template-app-home__potd-image"
                  :src="feed.image.thumbnailUrl"
                  alt=""
                >
                <div class="template-app-home__floating-actions">
                  <CdxButton
                    weight="normal"
                    aria-label="Download"
                  >
                    <CdxIcon :icon="cdxIconDownload" />
                  </CdxButton>
                  <CdxButton
                    weight="normal"
                    aria-label="Share"
                  >
                    <CdxIcon :icon="shareIcon" />
                  </CdxButton>
                </div>
                <div class="template-app-home__potd-overlay">
                  <p
                    class="template-app-home__potd-caption"
                    v-html="html(feed.image.descriptionHtml)"
                  />
                  <p class="template-app-home__potd-credit">
                    <CdxIcon :icon="cdxIconUserAvatarOutline" />
                    <span v-html="html(feed.image.artistHtml)" />
                  </p>
                  <p
                    v-if="feed.image.licenseType"
                    class="template-app-home__potd-license"
                  >
                    <CdxIcon :icon="cdxIconInfo" />
                    <a
                      :href="feed.image.licenseUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                    >{{
                      feed.image.licenseType
                    }}</a>
                  </p>
                </div>
              </div>
            </div>
          </template>

          <CdxButton
            class="template-app-home__cta"
            action="progressive"
            weight="primary"
          >
            <CdxIcon :icon="cdxIconInstance" />
            See past community content
          </CdxButton>
        </div>
      </template>
    </div>
  </AppChromeWrapper>
</template>

<style scoped>
.template-app-home {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-block: var(--spacing-100, 16px);
}

.template-app-home__tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75, 12px);
}

.template-app-home__tabs {
  flex: 1 1 auto;
  min-width: 0;
}

.template-app-home__lang-pill {
  flex-shrink: 0;
}

.template-app-home__empty {
  padding: var(--spacing-150, 24px) 0;
  color: var(--color-subtle, #54595d);
  text-align: center;
}

.template-app-home__progress {
  padding: var(--spacing-150, 24px) 0;
}

.template-app-home__status {
  color: var(--color-subtle, #54595d);
}

.template-app-home__feed {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.template-app-home__date-heading {
  margin: 0;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-home__more-link {
  width: 100%;
  justify-content: flex-start;
}

.template-app-home__divider {
  margin: var(--spacing-100, 16px) 0;
  border: 0;
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

/* Featured article */

.template-app-home__tfa {
  display: flex;
  flex-direction: column;
}

/* With an image, the card floats on top of a full-height hero photo instead
   of sitting in normal flow below it. */
.template-app-home__tfa--with-image {
  position: relative;
  height: 340px;
}

.template-app-home__tfa-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--border-radius-base, 2px);
}

.template-app-home__floating-actions {
  position: absolute;
  top: var(--spacing-75, 12px);
  right: var(--spacing-75, 12px);
  z-index: 2;
  display: flex;
  gap: var(--spacing-50, 8px);
}

.template-app-home__tfa--with-image .template-app-home__tfa-card {
  position: absolute;
  z-index: 1;
  inset-inline: var(--spacing-150, 24px);
  bottom: var(--spacing-150, 24px);
}

.template-app-home__tfa-card {
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-drop-medium, 0 2px 6px rgba(0, 0, 0, 0.3));
}

.template-app-home__tfa-card :deep(.cdx-card__text__title) {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-normal, 400);
}

/* Codex's own card spacing (8px above supporting-text) plus our divider's
   default margin left too much air above/below the rule — tighten both. */
.template-app-home__tfa-card :deep(.cdx-card__text__supporting-text) {
  margin-top: var(--spacing-25, 4px);
}

.template-app-home__tfa-card .template-app-home__divider {
  margin: var(--spacing-50, 8px) 0;
}

.template-app-home__tfa-extract {
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Top read */

.template-app-home__top-read-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.template-app-home__rank-link {
  display: grid;
  grid-template-columns: auto 1fr auto;
  column-gap: var(--spacing-75, 12px);
  row-gap: var(--spacing-12, 2px);
  color: inherit;
  text-decoration: none;
}

.template-app-home__rank-badge {
  display: flex;
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-home__rank-title {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  color: var(--color-base, #202122);
}

.template-app-home__rank-description {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-home__rank-meta {
  display: flex;
  grid-column: 2;
  grid-row: 3;
  align-items: center;
  gap: var(--spacing-50, 8px);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

.template-app-home__trend--up {
  color: var(--color-success, #14866d);
}

.template-app-home__trend--down {
  color: var(--color-error, #bf3c2c);
}

.template-app-home__rank-thumb {
  grid-column: 3;
  grid-row: 1 / span 3;
  align-self: center;
}

/* Did you know */

.template-app-home__dyk-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.template-app-home__dyk-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  color: var(--color-base, #202122);
}

.template-app-home__dyk-icon {
  flex-shrink: 0;
  margin-top: var(--spacing-12, 2px);
  color: var(--color-progressive, #36c);
}

.template-app-home__dyk-list :deep(.template-app-home__inline-link) {
  color: var(--color-progressive, #36c);
}

/* In the news */

.template-app-home__news-carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  border-radius: var(--border-radius-base, 2px);
}

.template-app-home__news-slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  position: relative;
}

.template-app-home__news-image {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.template-app-home__news-caption {
  margin: 0;
  padding: var(--spacing-75, 12px);
  background-color: var(--background-color-neutral, #eaecf0);
  color: var(--color-base, #202122);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-home__news-caption :deep(a) {
  color: var(--color-progressive, #36c);
}

/* When a story has a hero image, the caption overlays its bottom edge with a
   gradient scrim instead of sitting in a separate box below. */
.template-app-home__news-slide--with-image .template-app-home__news-caption {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding-top: 48px;
  background-color: transparent;
  background-image: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0));
  color: #fff;
}

.template-app-home__news-slide--with-image .template-app-home__news-caption :deep(a) {
  color: #fff;
  text-decoration: underline;
}

.template-app-home__news-dots {
  display: flex;
  justify-content: center;
  gap: var(--spacing-50, 8px);
}

.template-app-home__news-dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--border-color-subtle, #c8ccd1);
  cursor: pointer;
}

.template-app-home__news-dot--active {
  background-color: var(--color-progressive, #36c);
}

/* On this day */

.template-app-home__otd-timeline {
  display: flex;
  flex-direction: column;
  /* Every entry keeps the same top padding (so the marker's offset below is
     uniform); pull the whole list back up to cancel the first entry's. */
  margin-top: calc(-1 * var(--spacing-100, 16px));
  margin-inline-start: var(--spacing-50, 8px);
  padding-inline-start: var(--spacing-150, 24px);
  /* One continuous rail behind the whole list, instead of a border per entry. */
  border-left: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.template-app-home__otd-entry {
  position: relative;
  padding-block: var(--spacing-100, 16px);
}

.template-app-home__otd-entry:last-child {
  padding-bottom: 0;
}

.template-app-home__otd-marker {
  position: absolute;
  top: calc(var(--spacing-100, 16px) + 0.55em);
  left: calc(-1 * var(--spacing-150, 24px) - 4px);
  width: 8px;
  height: 8px;
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--color-progressive, #36c);
}

.template-app-home__otd-date {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-50, 8px);
}

.template-app-home__otd-year {
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-large, 1.125rem);
  color: var(--color-progressive, #36c);
}

.template-app-home__otd-years-ago {
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  white-space: nowrap;
}

.template-app-home__otd-text {
  margin: 0 0 var(--spacing-75, 12px);
  color: var(--color-base, #202122);
}

.template-app-home__otd-pages {
  display: flex;
  gap: var(--spacing-75, 12px);
  overflow-x: auto;
}

.template-app-home__otd-page-card {
  flex: 0 0 280px;
}

.template-app-home__otd-page-card :deep(.cdx-card__text__title) {
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-home__otd-page-card :deep(.cdx-card__text__description) {
  font-size: var(--font-size-x-small, 0.75rem);
}

/* Picture of the day */

.template-app-home__potd-image-wrap {
  position: relative;
  height: 420px;
  margin-inline: calc(-1 * var(--spacing-150, 24px));
  overflow: hidden;
}

.template-app-home__potd-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* All caption/credit/license text sits on top of the image itself, readable
   against a gradient scrim instead of in plain text below it. */
.template-app-home__potd-overlay {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding: 64px var(--spacing-150, 24px) var(--spacing-150, 24px);
  background-image: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0));
}

.template-app-home__potd-caption {
  margin: 0;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-app-home__potd-caption :deep(a),
.template-app-home__potd-credit :deep(a) {
  color: #fff;
  text-decoration: underline;
}

.template-app-home__potd-credit,
.template-app-home__potd-license {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-home__potd-credit .cdx-icon,
.template-app-home__potd-license .cdx-icon {
  color: rgba(255, 255, 255, 0.85);
}

.template-app-home__potd-license a {
  color: #fff;
  text-decoration: underline;
}

.template-app-home__cta {
  width: 100%;
}
</style>
