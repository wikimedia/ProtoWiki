<script setup lang="ts">
definePage({
  meta: {
    title: 'Article',
    description: 'Template for an in-app article reading screen with live content.',
    category: 'template',
    platform: 'app',
  },
})

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxMessage, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconArticleSearch,
  cdxIconBookmarkOutline,
  cdxIconLanguage,
  cdxIconListBullet,
  cdxIconTextStyle,
} from '@wikimedia/codex-icons'

import AppChromeHeader from '@/components/app/AppChromeHeader.vue'
import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import { useIsIos } from '@/composables/useAppPlatform'
import { wikiHostFromLang } from '@/config'

import { enhanceCollapsibleTables } from './collapsibleTables'
import { fetchArticleHtml } from './fetchArticleHtml'
import { fetchArticleView, type ArticleView } from './fetchArticleView'

const route = useRoute()
const router = useRouter()
const isIos = useIsIos()

/** Article title — driven by `?article=` (e.g. navigated here from search); defaults for direct visits. */
const article = computed(() => {
  const value = route.query.article
  return typeof value === 'string' && value.trim().length ? value : 'Baltimore'
})

/** Wikipedia language code — driven by `?lang=`. */
const lang = computed(() => {
  const value = route.query.lang
  return typeof value === 'string' && value.trim().length ? value : 'en'
})

const view = ref<ArticleView | null>(null)
const articleHtml = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const bodyRef = ref<InstanceType<typeof ArticleRenderer> | null>(null)

let loadAbort: AbortController | null = null

async function load(): Promise<void> {
  loadAbort?.abort()
  loadAbort = new AbortController()
  const { signal } = loadAbort

  loading.value = true
  error.value = null

  const host = wikiHostFromLang(lang.value)

  try {
    const [foundView, foundHtml] = await Promise.all([
      fetchArticleView(article.value, { signal, lang: lang.value }),
      fetchArticleHtml(article.value, { signal, host }),
    ])
    if (signal.aborted) return
    view.value = foundView
    articleHtml.value = foundHtml
  } catch (err) {
    if (signal.aborted) return
    error.value = err instanceof Error ? err.message : 'Failed to load article.'
    view.value = null
    articleHtml.value = null
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

onMounted(() => {
  void load()
})

watch([article, lang], () => {
  void load()
})

watch(articleHtml, async () => {
  await nextTick()
  const root = bodyRef.value?.$el as HTMLElement | undefined
  if (root) enhanceCollapsibleTables(root)
})

function goBack(): void {
  router.back()
}

function goToSearch(): void {
  router.push('/template-app-search')
}

/** iOS convention is a plain chevron; Android uses a full back arrow. */
const backIcon = computed(() => (isIos.value ? 'previous' : 'arrow-previous'))

const headerLeft = computed(
  (): AppHeaderItem[] => [
    { type: 'button', icon: backIcon.value, label: 'Back', onClick: goBack },
    { type: 'button', icon: 'search', label: 'Search', onClick: goToSearch },
  ],
)

const headerMiddle: AppHeaderItem[] = [{ type: 'link', icon: 'logo-wikipedia', label: 'Wikipedia' }]

const headerRight: AppHeaderItem[] = [
  { type: 'button', icon: 'tabs', label: 'Tabs' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
]
</script>

<template>
  <MobileWrapper>
    <div class="template-app-article-shell">
      <AppChromeHeader :left="headerLeft" :middle="headerMiddle" :right="headerRight" />

      <div class="template-app-article">
        <CdxProgressBar v-if="loading" inline />

        <CdxMessage v-else-if="error" type="error">{{ error }}</CdxMessage>

        <template v-else-if="view">
          <div class="template-app-article__lead-image">
            <img
              v-if="view.thumbnailUrl"
              class="template-app-article__lead-image-img"
              :src="view.thumbnailUrl"
              :alt="view.title"
            />
          </div>

          <h1 class="template-app-article__title">{{ view.title }}</h1>
          <p v-if="view.description" class="template-app-article__description">
            {{ view.description }}
          </p>

          <div v-if="articleHtml" class="article template-app-article__reader" data-skin="mobile">
            <ArticleRenderer ref="bodyRef" skin="mobile">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="articleHtml" />
            </ArticleRenderer>
          </div>
        </template>
      </div>

      <div
        class="template-app-article__toolbar"
        :class="{ 'template-app-article__toolbar--ios': isIos }"
      >
        <CdxButton weight="quiet" aria-label="Save">
          <CdxIcon :icon="cdxIconBookmarkOutline" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="Languages">
          <CdxIcon :icon="cdxIconLanguage" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="Find in article">
          <CdxIcon :icon="cdxIconArticleSearch" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="Text settings">
          <CdxIcon :icon="cdxIconTextStyle" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="Contents">
          <CdxIcon :icon="cdxIconListBullet" />
        </CdxButton>
      </div>
    </div>
  </MobileWrapper>
</template>

<style scoped>
.template-app-article-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.template-app-article {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: var(--spacing-150, 24px);
}

.template-app-article__lead-image {
  aspect-ratio: 16 / 9;
  background-color: var(--background-color-neutral, #eaecf0);
}

.template-app-article__lead-image-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-app-article__title {
  margin: var(--spacing-100, 16px) var(--spacing-150, 24px) 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large, 1.75rem);
  font-weight: var(--font-weight-normal, 400);
  color: var(--color-base, #202122);
}

.template-app-article__description {
  margin: var(--spacing-25, 4px) var(--spacing-150, 24px) 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  font-style: italic;
  line-height: var(--line-height-small, 1.4);
}

.template-app-article__reader {
  padding-inline: var(--spacing-150, 24px);
}

.template-app-article__toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-50, 8px) var(--spacing-150, 24px);
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

/* iOS devices need extra clearance above the home-indicator gesture bar. */
.template-app-article__toolbar--ios {
  padding-bottom: var(--spacing-125, 20px);
}
</style>

<!--
  Targets DOM built by ./collapsibleTables.ts (raw nodes inserted into v-html
  content, not compiled by this SFC) — must stay unscoped to match.
-->
<style>
.pw-collapsible-table {
  margin: var(--spacing-100, 16px) 0;
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.pw-collapsible-table__summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  border: 0;
  background: none;
  text-align: start;
  color: var(--color-base, #202122);
  font: inherit;
  cursor: pointer;
}

.pw-collapsible-table__label {
  flex-shrink: 0;
  font-weight: var(--font-weight-bold, 700);
}

.pw-collapsible-table__preview {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--color-subtle, #54595d);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-collapsible-table__chevron {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0.7;
}

.pw-collapsible-table__chevron svg {
  display: block;
  width: 100%;
  height: 100%;
}

.pw-collapsible-table__panel {
  border-top: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  padding: var(--spacing-100, 16px);
}

.pw-collapsible-table__panel--collapsed {
  display: none;
}

.pw-collapsible-table__panel table {
  margin: 0 !important;
}

.pw-collapsible-table__close {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  margin-top: var(--spacing-100, 16px);
  padding: var(--spacing-75, 12px) 0 0;
  border: 0;
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background: none;
  color: var(--color-subtle, #54595d);
  font: inherit;
  cursor: pointer;
}
</style>
