<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
} from '@wikimedia/codex-icons'

import type { HomeBornOnThisDay } from '../../musical-group/data/types'
import {
  externalArticleHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import WikitaLiteCard from '../components/WikitaLiteCard.vue'

interface Props {
  standalone?: boolean
  items?: HomeBornOnThisDay[]
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

function saveIcon(itemId: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(itemId) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(itemId: string): string {
  return relatedReadingSaved(itemId) ? 'Saved' : 'Save'
}
</script>

<template>
  <div class="born-on-this-day-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading Born on this day" />

    <template v-else>
      <WikitaLiteCard
        v-for="item in displayItems"
        :key="item.enwikiTitle"
        :title="item.title"
        :subtitle="`Born ${item.year}: ${item.text}`"
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

      <p v-if="standalone && !displayItems.length" class="born-on-this-day-module__empty">
        No birthdays are available right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.born-on-this-day-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.born-on-this-day-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
