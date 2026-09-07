<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { useConfig } from '@/composables/useConfig'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
  cdxIconLink,
} from '@wikimedia/codex-icons'

import {
  formatRelatedToLabel,
} from '../../musical-group/data/relatedToLabel'
import type { HomeRelated } from '../../musical-group/data/types'
import WikitaLiteDailyReadsTabs from '../components/WikitaLiteDailyReadsTabs.vue'
import {
  externalArticleHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { useWikitaLiteDailyReadsTabs } from '../composables/useWikitaLiteDailyReadsTabs'
import { useWikitaLiteOverflowShowMore } from '../composables/useWikitaLiteOverflowShowMore'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeRelated[]
  loading?: boolean
  loadingMore?: boolean
  previewLimit?: number
  listsVersion?: number
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  loadingMore: false,
  previewLimit: 3,
  listsVersion: 0,
  moreTo: undefined,
})

const listsVersionRef = computed(() => props.listsVersion)
const { currentUserPageLists } = useConfig()

const { relatedReadingSaved, relatedReadingInList, onRelatedReadingSave } =
  useWikitaLiteSaveActions(listsVersionRef)

const { tabs, activeTabId, showTabs, filteredItems } = useWikitaLiteDailyReadsTabs({
  items: () => props.items,
  listsVersion: () => props.listsVersion,
})

const displayItems = computed(() => {
  const filtered = filteredItems.value
  return props.standalone ? filtered : filtered.slice(0, props.previewLimit)
})

function relatedLabel(relatedToTitle: string): string {
  const savedTitles = currentUserPageLists.value.readingList.map((title) => ({ title }))
  return formatRelatedToLabel(relatedToTitle, savedTitles, { alwaysShow: true })
}

function saveIcon(itemId: string, title: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(title) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(title: string): string {
  return relatedReadingSaved(title) ? 'Saved' : 'Save'
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

const showMoreLink = useWikitaLiteOverflowShowMore({
  standalone: () => props.standalone,
  moreTo: () => props.moreTo,
  hasItems: () => displayItems.value.length > 0,
})
</script>

<template>
  <div class="related-module">
    <WikitaLiteDailyReadsTabs
      v-if="showTabs"
      v-model:active-tab-id="activeTabId"
      :tabs="tabs"
    />

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
        :action-label="saveLabel(item.title)"
        :action-icon="saveIcon(item.itemId, item.title)"
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

    <slot name="after-cards" />

    <RouterLink
      v-if="showMoreLink && moreTo"
      :to="moreTo"
      class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled wikita-lite-button-link"
    >
      Show more further reading
    </RouterLink>

    <CdxProgressBar
      v-if="standalone && (loading || loadingMore)"
      inline
      aria-label="Loading further reading"
    />

    <p
      v-if="standalone && !displayItems.length && !loading && !loadingMore"
      class="related-module__empty"
    >
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
