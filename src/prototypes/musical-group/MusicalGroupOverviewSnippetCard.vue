<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconQuotes } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import type { MusicalGroupOverviewSnippet } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  snippet: MusicalGroupOverviewSnippet
}

const props = defineProps<Props>()
const { itemRoute } = useMusicalGroupRoute()

const cardHref = computed(() => (props.snippet.id ? itemRoute(props.snippet.id) : undefined))
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
    :external-href="snippet.id ? undefined : snippet.articleUrl"
    :show-info="false"
    :title-bold="true"
    type="Mentioned"
    :type-icon="cdxIconQuotes"
    :title="snippet.title"
    :show-title="true"
    body=""
    :snippet-html="snippet.snippetHtml"
    :thumbnail-url="snippet.thumbnailUrl"
    :show-thumbnail="Boolean(snippet.thumbnailUrl)"
  />
</template>
