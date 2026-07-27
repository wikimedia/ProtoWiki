<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
} from '@wikimedia/codex-icons'

import {
  formatRelatedToLabel,
  getCachedSavedPageTitles,
} from '../../musical-group/data/relatedToLabel'
import type { HomeRelated } from '../../musical-group/data/types'
import {
  externalArticleHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import WikitaLiteCard from '../components/WikitaLiteCard.vue'

interface Props {
  standalone?: boolean
  items?: HomeRelated[]
  loading?: boolean
  previewLimit?: number
  listsVersion?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 3,
  listsVersion: 0,
})

const listsVersionRef = computed(() => props.listsVersion)

const { relatedReadingSaved, relatedReadingInList, onRelatedReadingSave } =
  useWikitaLiteSaveActions(listsVersionRef)

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function relatedLabel(relatedToTitle: string): string {
  return formatRelatedToLabel(relatedToTitle, getCachedSavedPageTitles(), { alwaysShow: true })
}

function saveIcon(itemId: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(itemId) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(itemId: string): string {
  return relatedReadingSaved(itemId) ? 'Saved' : 'Save'
}
</script>

<template>
  <div class="related-module">
    <WikitaLiteCard
      v-for="item in displayItems"
      :key="`${item.relatedToTitle}-${item.title}`"
      :title="item.title"
      :subtitle="item.description"
      :show-subtitle="Boolean(item.description)"
      show-info
      :info-left="relatedLabel(item.relatedToTitle)"
      :show-thumbnail="Boolean(item.thumbnailUrl)"
      :thumbnail-url="item.thumbnailUrl"
      :thumbnail-alt="item.title"
      :external-href="externalArticleHref(item)"
      :show-top-action="Boolean(item.itemId)"
      :top-action-label="item.itemId ? saveLabel(item.itemId) : ''"
      :top-action-icon="item.itemId ? saveIcon(item.itemId) : undefined"
      @top-action-click="
        () => item.itemId && onRelatedReadingSave(item.itemId, item.title, item.thumbnailUrl)
      "
    />

    <CdxProgressBar v-if="loading" inline aria-label="Loading further reading" />

    <p v-if="standalone && !displayItems.length && !loading" class="related-module__empty">
      No further reading suggestions yet.
    </p>
  </div>
</template>

<style scoped>
.related-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.related-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
