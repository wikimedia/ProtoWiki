<script setup lang="ts">
import { computed, ref, toRef } from 'vue'

import { CdxButton, CdxProgressBar } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconAlert,
  cdxIconError,
  cdxIconHeart,
  cdxIconHeartOutline,
  cdxIconReference,
  cdxIconUserAdd,
} from '@wikimedia/codex-icons'

import { formatEditStatusLabel } from '../../musical-group/data/fetchRecentChanges'
import {
  isThankableEditFlag,
  type HomeRecentChange,
  type HomeRecentChangeFlag,
  type HomeSavedItem,
} from '../../musical-group/data/types'
import { useActivityFeed } from '../../musical-group/useActivityFeed'
import { useCommonsPhotosInfiniteScroll } from '../../musical-group/useCommonsPhotosFeed'
import { useWikitaLiteThankActions } from '../composables/useWikitaLiteCardActions'
import WikitaLiteCard, { type WikitaLiteCardFlagColor } from '../components/WikitaLiteCard.vue'

interface Props {
  standalone?: boolean
  /** Home preview items from {@link useMusicalGroupHome}. */
  items?: HomeRecentChange[]
  savedItems?: HomeSavedItem[]
  savedItemsLoading?: boolean
  loading?: boolean
  previewLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  savedItems: () => [],
  savedItemsLoading: false,
  loading: false,
  previewLimit: 3,
})

const activeRef = computed(() => props.standalone)
const savedItemsRef = toRef(() => props.savedItems)
const feedMode = computed(() => (props.standalone ? 'full' : 'latest'))

const {
  changes: activityChanges,
  loading: activityLoading,
  hasMore: activityHasMore,
  queueReady: activityQueueReady,
  revisionLookupFailed,
  loadMore: loadMoreActivity,
  retry: retryActivity,
} = useActivityFeed(savedItemsRef, activeRef, feedMode)

const activitySentinel = ref<HTMLElement | null>(null)

useCommonsPhotosInfiniteScroll({
  sentinel: activitySentinel,
  active: computed(() => props.standalone),
  hasMore: activityHasMore,
  loading: activityLoading,
  loadMore: loadMoreActivity,
})

const { editThanked, onToggleEditThank } = useWikitaLiteThankActions()

const previewItems = computed(() => props.items.slice(0, props.previewLimit))

const displayItems = computed(() => (props.standalone ? activityChanges.value : previewItems.value))

const showPreviewLoading = computed(() => !props.standalone && props.loading)

const itemsWithEnwiki = computed(() =>
  props.savedItems.filter((item) => item.enwikiTitle),
)

interface FlagPresentation {
  label: string
  icon?: Icon
  color: WikitaLiteCardFlagColor
}

const FLAG_PRESENTATION: Record<Exclude<HomeRecentChangeFlag, 'none'>, FlagPresentation> = {
  'first-edit': { label: "User's first edit", icon: cdxIconUserAdd, color: 'success' },
  'new-editor': { label: 'New editor', icon: cdxIconUserAdd, color: 'success' },
  'good-faith': { label: 'Good faith', icon: cdxIconHeartOutline, color: 'success' },
  'needs-reference': { label: 'Needs a reference check', icon: cdxIconReference, color: 'progressive' },
  'tone-issue': { label: 'Tone issue', icon: cdxIconAlert, color: 'warning' },
  'high-revert-risk': { label: 'High revert risk', icon: cdxIconError, color: 'error' },
}

function flagPresentation(flag: HomeRecentChangeFlag): FlagPresentation | null {
  if (flag === 'none') return null
  return FLAG_PRESENTATION[flag]
}

function editCardStatusLabel(change: HomeRecentChange): string {
  return formatEditStatusLabel(change.reverted, change.isLatest)
}
</script>

<template>
  <div class="recent-activity-module">
    <CdxProgressBar v-if="showPreviewLoading || (standalone && savedItemsLoading)" inline aria-label="Loading recent activity" />

    <template v-else-if="standalone && !savedItemsLoading">
      <p v-if="!savedItems.length" class="recent-activity-module__empty">
        You have not saved any pages yet.
      </p>
      <p v-else-if="!itemsWithEnwiki.length" class="recent-activity-module__empty">
        None of your saved pages have English Wikipedia articles.
      </p>
      <div
        v-else-if="activityQueueReady && revisionLookupFailed && !activityChanges.length && !activityLoading"
        class="recent-activity-module__error"
      >
        <p>Could not load recent edits on your saved pages.</p>
        <CdxButton weight="quiet" @click="retryActivity">Try again</CdxButton>
      </div>
      <p
        v-else-if="activityQueueReady && !activityChanges.length && !activityLoading"
        class="recent-activity-module__empty"
      >
        No recent edits on your saved pages.
      </p>
    </template>

    <WikitaLiteCard
      v-for="change in displayItems"
      :key="`${change.enwikiTitle}-${change.revid}`"
      :show-flag="flagPresentation(change.flag) !== null"
      :flag="flagPresentation(change.flag)?.label"
      :flag-icon="flagPresentation(change.flag)?.icon"
      :flag-color="flagPresentation(change.flag)?.color ?? 'base'"
      :title="change.title"
      :subtitle="change.editSummary"
      :show-subtitle="Boolean(change.editSummary)"
      show-info
      :info-left="change.editedLabel"
      :info-right="editCardStatusLabel(change)"
      :show-thumbnail="Boolean(change.thumbnailUrl)"
      :thumbnail-url="change.thumbnailUrl"
      :thumbnail-alt="change.title"
      :external-href="change.diffUrl"
      :show-bottom-action="isThankableEditFlag(change.flag)"
      :bottom-action-label="editThanked(change.revid) ? 'Thanked' : 'Thank'"
      :bottom-action-icon="editThanked(change.revid) ? cdxIconHeart : cdxIconHeartOutline"
      @bottom-action-click="onToggleEditThank(change.revid)"
    />

    <CdxProgressBar v-if="standalone && activityLoading" inline aria-label="Loading activity" />

    <div
      v-if="standalone"
      ref="activitySentinel"
      class="recent-activity-module__sentinel"
      aria-hidden="true"
    />

    <p
      v-if="!standalone && !showPreviewLoading && !displayItems.length"
      class="recent-activity-module__empty"
    >
      No recent activity on your saved pages.
    </p>
  </div>
</template>

<style scoped>
.recent-activity-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.recent-activity-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.recent-activity-module__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}

.recent-activity-module__error p {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.recent-activity-module__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
