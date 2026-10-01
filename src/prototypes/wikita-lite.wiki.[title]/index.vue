<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleHeader from '@/components/article/ArticleHeader.vue'
import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import { t } from '@/i18n'
import { globalSkin } from '@/theme'

import WikitaLiteChromeHeader from '../wikita-lite/components/WikitaLiteChromeHeader.vue'
import WikitaLiteLeavePrototypeDialog from '../wikita-lite/components/WikitaLiteLeavePrototypeDialog.vue'
import { useWikitaLiteLeavePrototype } from '../wikita-lite/composables/useWikitaLiteLeavePrototype'
import { useWikitaLiteRoute } from '../wikita-lite/composables/useWikitaLiteRoute'
import { initWikitaLiteUrlState } from '../wikita-lite/composables/useWikitaLiteUrlState'
import { resolveArticleLink } from '../wikita-lite/onboarding/data/articleLinks'
import { useArticleHtml } from '../wikita-lite/onboarding/data/useArticleHtml'
import { articlePagePath } from '../wikita-lite/routes'

/**
 * An article read while logged in — where the chrome's search lands once the
 * reader has a Home. Same live body as the onboarding read screen, but none of
 * the logged-out flow around it: the header's Home button is the way back.
 */
initWikitaLiteUrlState()

const route = useRoute()
const { router, wikitaLiteRoute } = useWikitaLiteRoute()
const { onLeaveCapture } = useWikitaLiteLeavePrototype()

const title = computed(() => {
  const raw = (route.params as { title?: string | string[] }).title
  const value = Array.isArray(raw) ? raw[0] : raw
  return (value ?? '').replace(/_/g, ' ').trim()
})

const { html, loading, error } = useArticleHtml(title)

watch(title, () => window.scrollTo(0, 0))

function onArticleLinkClick(event: MouseEvent): void {
  const anchor = (event.target as HTMLElement).closest('a')
  if (!anchor) return

  const target = resolveArticleLink(anchor)
  if (target.kind === 'in-page') return

  event.preventDefault()
  if (target.kind === 'inert') return

  if (target.title.replace(/_/g, ' ') === title.value) {
    if (target.fragment) {
      document.getElementById(target.fragment)?.scrollIntoView({ block: 'center' })
    }
    return
  }

  void router.push(wikitaLiteRoute(articlePagePath(target.title)))
}
</script>

<template>
  <MobileWrapper fluid>
    <div class="wikita-lite-article" @click.capture="onLeaveCapture">
      <ChromeWrapper :last-edited-notice="false">
        <template #header>
          <WikitaLiteChromeHeader floating-home />
        </template>

        <article class="wikita-lite-article__body" :data-skin="globalSkin">
          <ArticleHeader :title="title" bookmark-affordance="bookmark" />

          <CdxProgressBar v-if="loading" inline :aria-label="t('pages.loadingArticle')" />

          <CdxMessage v-if="error" type="error" :allow-user-dismiss="false">
            {{ t('pages.articleLoadError', error) }}
          </CdxMessage>

          <ArticleRenderer v-if="html !== null" @click="onArticleLinkClick">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-html="html" />
          </ArticleRenderer>
        </article>
      </ChromeWrapper>
      <WikitaLiteLeavePrototypeDialog />
    </div>
  </MobileWrapper>
</template>

<style scoped>
.wikita-lite-article {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
}

.wikita-lite-article__body {
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-150, 24px) var(--spacing-100, 16px) var(--spacing-100, 16px);
  background-color: var(--background-color-base);
  text-align: start;
}

/* Same 984px content column the onboarding read screen mirrors from `ArticleWrapper`. */
.wikita-lite-article__body[data-skin='desktop'] {
  max-width: calc(984px + 2 * var(--spacing-100, 16px));
  margin-inline: auto;
}
</style>
