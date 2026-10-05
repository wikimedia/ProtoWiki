<script setup lang="ts">
import { computed, inject } from 'vue'

import ArticleHeader from './ArticleHeader.vue'
import { globalSkin, globalTheme, PROTOWIKI_CHROME_SKIN, PROTOWIKI_CHROME_THEME } from '@/theme'
import type { Skin, Theme } from '@/theme'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  /**
   * Title string **`ArticleHeader`** derives from when **`header`** is **`undefined`** (underscores → spaces).
   */
  title?: string
  /**
   * Reader-visible **`ArticleHeader`** override. **`undefined`** → derive from **`title`**.
   */
  header?: string
  skin?: Skin
  theme?: Theme
  /** Passed to **`ArticleHeader`** interlanguage control (**`N` languages**). */
  languagesCount?: number
  /**
   * In-app reader shell: the web **`ArticleHeader`** gives way to the apps' lead
   * block (image, title, description, rule), the inline gutter is left to the app
   * chrome, and the skin is pinned to **`'mobile'`**.
   */
  app?: boolean
  /** Short description under the title — app shell only. */
  description?: string
  /** Lead image — app shell only; the frame stays as a placeholder without one. */
  leadImageUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  title: undefined,
  header: undefined,
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
  app: false,
  description: undefined,
  leadImageUrl: undefined,
})

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN)
const inheritedTheme = inject(PROTOWIKI_CHROME_THEME)

const effectiveSkin = computed<Skin>(() => {
  if (props.app) return 'mobile'
  return props.skin ?? inheritedSkin?.value ?? globalSkin.value
})
const effectiveTheme = computed<Theme>(
  () => props.theme ?? inheritedTheme?.value ?? globalTheme.value,
)

const derivedHeader = computed(() => (props.title ?? '').replace(/_/g, ' ').trim())

/** Title as given — empty until a live surface resolves one (e.g. a random article). */
const leadTitle = computed(() => props.header?.trim() || derivedHeader.value)

/** Non-empty string for **`ArticleHeader`** (explicit **`header`** wins, else **`title`**, else fallback). */
const chromeHeaderLabel = computed(() => leadTitle.value || 'Article')
</script>

<template>
  <article
    class="article"
    :class="{ 'article--app': props.app }"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
    :lang="props.lang"
    :dir="props.dir"
  >
    <template v-if="props.app">
      <div class="article__lead-image">
        <img
          v-if="props.leadImageUrl"
          class="article__lead-image-img"
          :src="props.leadImageUrl"
          :alt="leadTitle"
        />
      </div>

      <h1 v-if="leadTitle" class="article__lead-title">{{ leadTitle }}</h1>
      <p v-if="props.description" class="article__lead-description">{{ props.description }}</p>
      <hr class="article__lead-divider" />
    </template>

    <ArticleHeader
      v-else
      :title="chromeHeaderLabel"
      :languages-count="props.languagesCount"
      :skin="props.skin"
    />

    <slot />
  </article>
</template>

<style scoped>
.article {
  min-width: 0;
  width: 100%;
  padding-block: var(--spacing-150, 24px);
  padding-inline: var(--spacing-100, 16px);
  text-align: start;
  background-color: var(--background-color-base);
}

.article[data-skin='desktop'] {
  /* 984px content column; padding-inline sits inside max-width (border-box). */
  max-width: calc(984px + 2 * var(--spacing-100, 16px));
  margin-inline: auto;
}

.article[data-skin='mobile'] {
  padding-block-end: var(--spacing-100, 16px);
  padding-block-start: var(--spacing-150, 24px);
}

/*
 * App shell: the app chrome already pads the screen edges, so the article adds
 * none — and the lead image bleeds back out through that gutter.
 */
.article[data-skin='mobile'].article--app {
  --app-article-bleed-inline: var(--spacing-150, 24px);
  padding-block: 0 var(--spacing-150, 24px);
  padding-inline: 0;
}

.article__lead-image {
  aspect-ratio: 16 / 9;
  margin-inline: calc(-1 * var(--app-article-bleed-inline, var(--spacing-150, 24px)));
  background-color: var(--background-color-neutral, #eaecf0);
}

.article__lead-image-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article__lead-title {
  margin: var(--spacing-100, 16px) 0 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large, 1.75rem);
  font-weight: var(--font-weight-normal, 400);
  color: var(--color-base, #202122);
}

.article__lead-description {
  margin: var(--spacing-25, 4px) 0 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  font-style: italic;
  line-height: var(--line-height-small, 1.4);
}

/*
 * Short rule closing the lead block, as the apps draw it — the bottom margin is
 * also the gap to the first parser block (lead hatnote).
 */
.article__lead-divider {
  width: 60px;
  margin: var(--spacing-75, 12px) 0 var(--spacing-100, 16px);
  border: 0;
  border-block-start: 1px solid var(--border-color-muted, var(--border-color-subtle));
}
</style>
