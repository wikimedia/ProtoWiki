<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconNewspaper } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import type { MusicalGroupOverviewArticle } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  article?: MusicalGroupOverviewArticle
  noArticle?: boolean
}

const props = defineProps<Props>()
const { tabRoute } = useMusicalGroupRoute()

const cardHref = computed(() =>
  props.article && !props.noArticle ? tabRoute('article') : undefined,
)

function plainExtract(html?: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const cardTitle = computed(() =>
  props.article && !props.noArticle ? 'English Wikipedia' : 'No English Wikipedia article',
)

const cardBody = computed(() =>
  props.article && !props.noArticle ? (props.article.wordCountLabel ?? '') : '',
)

const cardSnippet = computed(() =>
  props.article && !props.noArticle ? plainExtract(props.article.extractHtml) : '',
)

const infoRight = computed(() => {
  const views = props.article?.viewsLabel
  return views && views !== '—' ? views : ''
})
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
    :show-snippet="Boolean(cardSnippet)"
    :title-bold="false"
    type="Article"
    :type-icon="cdxIconNewspaper"
    :title="cardTitle"
    :body="cardBody"
    :snippet="cardSnippet"
    :info-left="article?.lastEditedLabel ?? ''"
    :info-right="infoRight"
    :thumbnail-url="article?.thumbnailUrl"
    :show-info="Boolean(article && !noArticle)"
    :show-thumbnail="Boolean(article?.thumbnailUrl && !noArticle)"
  />
</template>
