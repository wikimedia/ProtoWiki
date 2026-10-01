<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleHeader from '@/components/article/ArticleHeader.vue'
import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { t } from '@/i18n'
import { globalSkin } from '@/theme'

import WikitaLitePrototypeMenuPopover from '../../components/WikitaLitePrototypeMenuPopover.vue'
import { useWikitaLiteChromeHeaderRight } from '../../composables/useWikitaLiteChromeHeaderRight'
import SavePagesSheet from '../components/SavePagesSheet.vue'
import ReturnHomeBanner from '../components/ReturnHomeBanner.vue'
import { resolveArticleLink } from '../data/articleLinks'
import { useOnboardingArticleOpener } from '../data/useOnboardingArticleOpener'
import { useArticleHtml } from '../data/useArticleHtml'
import type { FlowState, OnboardingScreen } from '../data/useWikitaLiteOnboardingFlow'

const props = defineProps<{ flow: FlowState }>()

const MAIN_PAGE_TITLE = 'Main Page'
const effectiveTitle = computed(() => props.flow.title.value.trim() || MAIN_PAGE_TITLE)
const displayTitle = computed(() => effectiveTitle.value.replace(/_/g, ' ').trim())
const isMainPage = computed(() => effectiveTitle.value === MAIN_PAGE_TITLE)
/*
 * The Main Page is a landing page rather than an article: no title, languages
 * control, tabs or tagline on either skin — the portal boxes are the page.
 */
const showArticleHeader = computed(() => !isMainPage.value)
const saveSheetOpen = ref(false)
const saveSheetVisible = ref(false)
const articleHeaderRef = ref<InstanceType<typeof ArticleHeader> | null>(null)
const bookmarkAnchor = computed(() => articleHeaderRef.value?.bookmarkAnchor ?? null)

const { html, lang: articleLang, dir: articleDir, loading, error } = useArticleHtml(effectiveTitle)

// Search in the chrome above opens its results here rather than on the real wiki.
useOnboardingArticleOpener(props.flow)

function onBookmark(): void {
  saveSheetVisible.value = true
  saveSheetOpen.value = true
}

function onSaveSheetNavigate(screen: OnboardingScreen): void {
  saveSheetVisible.value = false
  if (screen === 'account') {
    void props.flow.goToAccountFromSave(effectiveTitle.value)
    return
  }
  void props.flow.goTo(screen)
}

function onSaveSheetClosed(): void {
  saveSheetVisible.value = false
}

function onSearch(): void {
  void props.flow.goTo('search')
}

const { headerRight } = useWikitaLiteChromeHeaderRight({
  search: { type: 'button', icon: 'search', label: t('onboarding.search'), onClick: onSearch },
})

function onArticleLinkClick(event: MouseEvent): void {
  const anchor = (event.target as HTMLElement).closest('a')
  if (!anchor) return

  const target = resolveArticleLink(anchor)
  if (target.kind === 'in-page') return

  event.preventDefault()
  if (target.kind === 'inert') return

  const sameArticle = target.title.replace(/_/g, ' ') === displayTitle.value
  if (sameArticle) {
    if (target.fragment) {
      document.getElementById(target.fragment)?.scrollIntoView({ block: 'center' })
    }
    return
  }

  void props.flow.goTo('article', { title: target.title })
}
</script>

<template>
  <div class="read-screen">
    <ChromeWrapper :last-edited-notice="false">
      <template #header>
        <ChromeHeader :right="headerRight" :brand-link="false">
          <template #menu>
            <WikitaLitePrototypeMenuPopover />
          </template>
        </ChromeHeader>
      </template>

      <ReturnHomeBanner :flow="props.flow" />
      <article
        class="article nd-article"
        :class="{ 'nd-article--main-page': isMainPage }"
        :data-skin="globalSkin"
      >
        <ArticleHeader
          v-if="showArticleHeader"
          ref="articleHeaderRef"
          :title="displayTitle"
          bookmark-affordance="bookmark"
          @bookmark-click="onBookmark"
        />

        <CdxProgressBar v-if="loading" inline :aria-label="t('onboarding.loadingArticle')" />

        <CdxMessage v-if="error" type="error" :allow-user-dismiss="false">
          {{ t('onboarding.articleLoadError', error) }}
        </CdxMessage>

        <ArticleRenderer
          v-if="html !== null"
          :lang="articleLang"
          :dir="articleDir === 'rtl' ? 'rtl' : undefined"
          @click="onArticleLinkClick"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-html="html" />
        </ArticleRenderer>
      </article>
    </ChromeWrapper>

    <SavePagesSheet
      v-if="saveSheetVisible"
      v-model:open="saveSheetOpen"
      :anchor="bookmarkAnchor"
      @navigate="onSaveSheetNavigate"
      @closed="onSaveSheetClosed"
    />
  </div>
</template>

<style scoped>
.read-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
}

.nd-article {
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-150, 24px) var(--spacing-100, 16px) var(--spacing-100, 16px);
  background-color: var(--background-color-base);
  text-align: start;
}

/*
 * This screen composes its own `<article>` rather than using `ArticleWrapper`
 * (it needs the bookmark click that wrapper swallows), so that component's
 * scoped column rule never reaches here. Mirror it: 984px content column,
 * padding-inline inside the max-width because the box is border-box.
 */
.nd-article[data-skin='desktop'] {
  max-width: calc(984px + 2 * var(--spacing-100, 16px));
  margin-inline: auto;
}

/*
 * The Main Page is laid out in columns rather than read as prose, so it gets
 * the wide container `SpecialPageWrapper` uses instead of the 984px measure.
 */
.nd-article--main-page[data-skin='desktop'] {
  max-width: 99.75rem;
}
</style>
