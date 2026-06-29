<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconLink } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import type { MusicalGroupOverviewRelated } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  related: MusicalGroupOverviewRelated
}

const props = defineProps<Props>()
const { itemRoute } = useMusicalGroupRoute()

const cardHref = computed(() => (props.related.id ? itemRoute(props.related.id) : undefined))

const infoRight = computed(() => {
  const views = props.related.viewsLabel
  return views && views !== '—' ? views : ''
})
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
    :show-snippet="false"
    :show-info="Boolean(related.lastEditedLabel || infoRight)"
    :title-bold="true"
    type="Related"
    :type-icon="cdxIconLink"
    :title="related.title"
    :body="related.description"
    :info-left="related.lastEditedLabel"
    :info-right="infoRight"
    :thumbnail-url="related.thumbnailUrl"
    :show-thumbnail="Boolean(related.thumbnailUrl)"
  />
</template>
