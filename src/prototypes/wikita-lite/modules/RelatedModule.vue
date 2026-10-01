<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

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
import {
  externalArticleHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { useWikitaLiteOverflowShowMore } from '../composables/useWikitaLiteOverflowShowMore'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'
import WikitaLiteShowMore from '../components/WikitaLiteShowMore.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import { MESSAGES, t } from '../i18n'

interface Props {
  standalone?: boolean
  items?: HomeRelated[]
  loading?: boolean
  loadingMore?: boolean
  previewLimit?: number
  /** Empty card slots held at the end of the grid while the feed loads. */
  skeletons?: number
  listsVersion?: number
  /**
   * Reveal the next cards in place instead of navigating to the module's own
   * page. The owner grows `previewLimit` in response to `expand`.
   */
  expandable?: boolean
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  loadingMore: false,
  previewLimit: 3,
  skeletons: 0,
  listsVersion: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

const listsVersionRef = computed(() => props.listsVersion)
const { currentUserPageLists } = useConfig()

const { relatedReadingSaved, relatedReadingInList, onRelatedReadingSave } =
  useWikitaLiteSaveActions(listsVersionRef)

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function relatedLabel(relatedToTitle: string): string {
  const savedTitles = currentUserPageLists.value.readingList.map((title) => ({ title }))
  return formatRelatedToLabel(relatedToTitle, savedTitles, { alwaysShow: true })
}

function saveIcon(itemId: string, title: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(title) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(title: string): string {
  return relatedReadingSaved(title) ? t('common.savedState') : t('common.save')
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

const showMoreLink = useWikitaLiteOverflowShowMore({
  standalone: () => props.standalone,
  moreTo: () => props.moreTo,
  hasItems: () => displayItems.value.length > 0,
})

/*
 * Navigating always has somewhere to go; revealing in place only makes sense
 * while the feed holds more than the preview is showing.
 */
const showMoreControl = computed(
  () => showMoreLink.value && (!props.expandable || props.items.length > props.previewLimit),
)

const saveActionsDisabled = computed(() => !props.standalone && props.loading)
</script>

<template>
  <div class="related-module">
    <div
      :class="['related-module__cards', groupClass]"
      :aria-busy="skeletons > 0 || undefined"
    >
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
        :action-active="relatedReadingSaved(item.title)"
        :action-disabled="saveActionsDisabled"
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
      <WikitaLiteCardSkeletons :count="skeletons" />
    </div>

    <slot name="after-cards" />

    <WikitaLiteShowMore
      v-if="showMoreControl"
      :to="moreTo"
      :expandable="expandable"
      @expand="$emit('expand')"
    >
      {{ MESSAGES.showMoreFurtherReading }}
    </WikitaLiteShowMore>

    <CdxProgressBar
      v-if="standalone && (loading || loadingMore)"
      inline
      :aria-label="t('home.loadingFurtherReading')"
    />

    <p
      v-if="standalone && !displayItems.length && !loading && !loadingMore"
      class="related-module__empty"
    >
      {{ t('home.emptyFurtherReading') }}
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
