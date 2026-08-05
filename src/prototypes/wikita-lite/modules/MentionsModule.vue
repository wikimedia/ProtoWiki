<script setup lang="ts">
import { computed } from 'vue'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
  cdxIconQuotes,
} from '@wikimedia/codex-icons'

import {
  formatRelatedToLabel,
  getCachedSavedPageTitles,
} from '../../musical-group/data/relatedToLabel'
import type { HomeMention } from '../../musical-group/data/types'
import { useWikitaLiteSaveActions } from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeMention[]
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

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
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
  <div class="mentions-module">
    <div :class="['mentions-module__cards', groupClass]">
      <template v-for="item in displayItems" :key="`${item.mentionedInTitle}-${item.title}`">
      <WikitaLiteCardWithAction
        v-if="item.itemId"
        :url="item.articleUrl"
        :title="item.title"
        :description-html="item.snippetHtml"
        :supporting-text="relatedLabel(item.mentionedInTitle)"
        :supporting-icon="cdxIconQuotes"
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
        :url="item.articleUrl"
        :thumbnail="cardThumbnail(item.thumbnailUrl)"
        :force-thumbnail="true"
      >
        <template #title>
          {{ item.title }}
        </template>
        <template v-if="item.snippetHtml" #description>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="mentions-module__snippet" v-html="item.snippetHtml" />
        </template>
        <template v-if="item.mentionedInTitle" #supporting-text>
          <WikitaLiteSupportingRow :icon="cdxIconQuotes">
            {{ relatedLabel(item.mentionedInTitle) }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>
      </template>
    </div>

    <CdxProgressBar v-if="standalone && loading" inline aria-label="Loading mentions" />
  </div>
</template>

<style scoped>
.mentions-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.mentions-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.mentions-module__snippet {
  display: block;
}

.mentions-module__snippet :deep(.searchmatch) {
  padding: 0 1px;
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
  background-color: #ffe49c;
}
</style>
