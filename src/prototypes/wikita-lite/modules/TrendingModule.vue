<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

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
  items?: HomeTrending[]
  loading?: boolean
  error?: string | null
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
  error: null,
  previewLimit: 2,
  skeletons: 0,
  listsVersion: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  retry: []
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

const listsVersionRef = computed(() => props.listsVersion)

const { relatedReadingSaved, relatedReadingInList, onRelatedReadingSave } =
  useWikitaLiteSaveActions(listsVersionRef)

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function saveIcon(itemId: string, title: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(title) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(title: string): string {
  return relatedReadingSaved(title) ? t('common.savedState') : t('common.save')
}

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
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
</script>

<template>
  <div class="trending-module">
    <CdxProgressBar v-if="standalone && loading" inline :aria-label="t('home.loadingTrending')" />

    <template v-else-if="error">
      <div class="trending-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">{{ t('common.tryAgain') }}</CdxButton>
      </div>
    </template>

    <template v-else>
      <div
        :class="['trending-module__cards', groupClass]"
        :aria-busy="skeletons > 0 || undefined"
      >
        <template v-for="item in displayItems" :key="item.enwikiTitle">
        <WikitaLiteCardWithAction
          v-if="item.itemId"
          :url="externalArticleHref(item)"
          :title="item.title"
          :description="item.description"
          :supporting-text="item.viewsLabel"
          :supporting-icon="cdxIconChart"
          :thumbnail-url="item.thumbnailUrl"
          thumbnail-size="large"
          :force-thumbnail="true"
          :action-label="saveLabel(item.title)"
          :action-icon="saveIcon(item.itemId, item.title)"
          :action-active="relatedReadingSaved(item.title)"
          @action-click="onRelatedReadingSave(item.itemId, item.title, item.thumbnailUrl)"
        />

        <CdxCard
          v-else
          :class="[WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE, cardClass]"
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
        <WikitaLiteCardSkeletons :count="skeletons" />
      </div>

      <slot name="after-cards" />

      <WikitaLiteShowMore
        v-if="showMoreControl"
        :to="moreTo"
        :expandable="expandable"
        @expand="$emit('expand')"
      >
        {{ MESSAGES.showMoreTrending }}
      </WikitaLiteShowMore>

      <p v-if="standalone && !displayItems.length" class="trending-module__empty">
        {{ MESSAGES.emptyTrending }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.trending-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  width: 100%;
}

.trending-module__cards {
  display: flex;
  flex-direction: column;
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
