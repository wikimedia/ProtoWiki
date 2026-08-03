<script setup lang="ts">
import { computed } from 'vue'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
  cdxIconLink,
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
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

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

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })
</script>

<template>
  <div class="related-module">
    <div :class="['related-module__cards', groupClass]">
      <template v-for="item in displayItems" :key="`${item.relatedToTitle}-${item.title}`">
      <WikitaLiteCardWithAction
        v-if="item.itemId"
        :url="externalArticleHref(item)"
        :title="item.title"
        :description="item.description"
        :supporting-text="relatedLabel(item.relatedToTitle)"
        :supporting-icon="cdxIconLink"
        :thumbnail-url="item.thumbnailUrl"
        thumbnail-size="large"
        :force-thumbnail="true"
        :action-label="saveLabel(item.itemId)"
        :action-icon="saveIcon(item.itemId)"
        @action-click="onRelatedReadingSave(item.itemId, item.title, item.thumbnailUrl)"
      />

      <CdxCard
        v-else
        :class="[WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE, cardClass]"
        :url="externalArticleHref(item)"
        :thumbnail="item.thumbnailUrl?.trim() ? { url: item.thumbnailUrl.trim() } : null"
        :force-thumbnail="true"
      >
        <template #title>
          {{ item.title }}
        </template>
        <template v-if="item.description" #description>
          {{ item.description }}
        </template>
        <template #supporting-text>
          <WikitaLiteSupportingRow :icon="cdxIconLink">
            {{ relatedLabel(item.relatedToTitle) }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>
      </template>
    </div>

    <CdxProgressBar v-if="standalone && loading" inline aria-label="Loading further reading" />

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

.related-module__cards {
  display: flex;
  flex-direction: column;
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
