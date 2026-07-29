<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
  cdxIconChart,
} from '@wikimedia/codex-icons'

import type { HomeTrending } from '../../musical-group/data/types'
import {
  externalArticleHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeTrending[]
  loading?: boolean
  error?: string | null
  previewLimit?: number
  listsVersion?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  error: null,
  previewLimit: 2,
  listsVersion: 0,
})

defineEmits<{
  retry: []
}>()

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

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}
</script>

<template>
  <div class="trending-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading trending" />

    <template v-else-if="error">
      <div class="trending-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">Try again</CdxButton>
      </div>
    </template>

    <template v-else>
      <template v-for="item in displayItems" :key="item.enwikiTitle">
        <WikitaLiteCardWithAction
          v-if="item.itemId"
          :url="externalArticleHref(item)"
          :title="item.title"
          :description="item.description"
          :supporting-text="item.viewsLabel"
          :supporting-icon="cdxIconChart"
          :thumbnail-url="item.thumbnailUrl"
          :force-thumbnail="true"
          :action-label="saveLabel(item.itemId)"
          :action-icon="saveIcon(item.itemId)"
          @action-click="onRelatedReadingSave(item.itemId, item.title, item.thumbnailUrl)"
        />

        <CdxCard
          v-else
          :url="externalArticleHref(item)"
          :thumbnail="cardThumbnail(item.thumbnailUrl)"
          :force-thumbnail="true"
        >
          <template #title>
            {{ item.title }}
          </template>
          <template v-if="item.description" #description>
            {{ item.description }}
          </template>
          <template v-if="item.viewsLabel" #supporting-text>
            <WikitaLiteSupportingRow :icon="cdxIconChart">
              {{ item.viewsLabel }}
            </WikitaLiteSupportingRow>
          </template>
        </CdxCard>
      </template>

      <p v-if="standalone && !displayItems.length" class="trending-module__empty">
        No trending articles are available right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.trending-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.trending-module__error,
.trending-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.trending-module__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}
</style>
