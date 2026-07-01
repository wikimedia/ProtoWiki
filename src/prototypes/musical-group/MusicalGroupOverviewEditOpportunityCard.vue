<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconEdit } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import { enwikiVisualEditorUrl } from './data/wikidataApi'
import type { MusicalGroupOverviewEditOpportunity } from './data/types'

interface Props {
  editOpportunity: MusicalGroupOverviewEditOpportunity
  enwikiTitle?: string
  articleTitle?: string
  articleThumbnailUrl?: string
}

const props = defineProps<Props>()

const externalHref = computed(() =>
  props.enwikiTitle ? enwikiVisualEditorUrl(props.enwikiTitle) : undefined,
)
</script>

<template>
  <WikitaCardItem
    :external-href="externalHref"
    :show-snippet="false"
    :show-info="false"
    type="Edit"
    :type-icon="cdxIconEdit"
    :title="editOpportunity.title"
    :body="editOpportunity.body"
    :thumbnail-url="articleThumbnailUrl"
    :show-thumbnail="Boolean(articleThumbnailUrl)"
  />
</template>
