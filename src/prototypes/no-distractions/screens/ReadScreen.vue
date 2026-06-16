<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleHeader from '@/components/article/ArticleHeader.vue'
import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

import { useArticleHtml } from '../data/useArticleHtml'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const displayTitle = computed(() => props.flow.title.value.replace(/_/g, ' ').trim())

const { html, loading, error } = useArticleHtml(computed(() => props.flow.title.value))

function onBookmark(): void {
  props.flow.goTo('account')
}
</script>

<template>
  <ChromeWrapper skin="mobile">
    <div v-if="!displayTitle" class="read-empty">
      <CdxMessage type="notice" :allow-user-dismiss="false">
        Pick an article to read first.
      </CdxMessage>
      <CdxButton action="progressive" weight="primary" @click="props.flow.goTo('picker')">
        Choose an article
      </CdxButton>
    </div>

    <article v-else class="article nd-article" data-skin="mobile">
      <ArticleHeader
        :title="displayTitle"
        skin="mobile"
        bookmark-affordance="bookmark"
        @bookmark-click="onBookmark"
      />

      <CdxProgressBar v-if="loading" inline aria-label="Loading article" />

      <CdxMessage v-if="error" type="error" :allow-user-dismiss="false">
        Couldn't load this article: {{ error }}
      </CdxMessage>

      <ArticleRenderer v-if="html !== null" skin="mobile">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="html" />
      </ArticleRenderer>
    </article>
  </ChromeWrapper>
</template>

<style scoped>
.nd-article {
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-150, 24px) var(--spacing-100, 16px) var(--spacing-100, 16px);
  background-color: var(--background-color-base);
  text-align: start;
}

.read-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-150, 24px) var(--spacing-100, 16px);
}
</style>
