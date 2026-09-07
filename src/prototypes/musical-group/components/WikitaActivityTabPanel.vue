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

import WikitaCardItem, {
  type WikitaCardItemTypeColor,
} from './WikitaCardItem.vue'
import { isEditThanked, toggleEditThank } from '../data/editThanks'
import { formatEditStatusLabel } from '../data/fetchRecentChanges'
import {
  isThankableEditFlag,
  type HomeRecentChange,
  type HomeRecentChangeFlag,
  type HomeSavedItem,
} from '../data/types'
import { useActivityFeed, type ActivityFeedMode } from '../useActivityFeed'
import { useCommonsPhotosInfiniteScroll } from '../useCommonsPhotosFeed'

interface Props {
  items: HomeSavedItem[]
  active: boolean
  savedItemsLoading?: boolean
  scope?: 'home' | 'item'
}

const props = withDefaults(defineProps<Props>(), {
  savedItemsLoading: false,
  scope: 'home',
})

const itemsRef = toRef(props, 'items')
const activeRef = toRef(props, 'active')

const feedMode = computed<ActivityFeedMode>(() =>
  props.scope === 'home' ? 'latest' : 'full',
)

const itemsWithEnwiki = computed(() =>
  props.items.filter((item) => item.enwikiTitle),
)
const hasItems = computed(() => props.items.length > 0)

const activitySentinel = ref<HTMLElement | null>(null)

const {
  changes: activityChanges,
  loading: activityLoading,
  hasMore: activityHasMore,
  queueReady: activityQueueReady,
  itemIdsWithoutRevisions,
  revisionLookupFailed,
  loadMore: loadMoreActivity,
  retry: retryActivity,
} = useActivityFeed(itemsRef, activeRef, feedMode)

useCommonsPhotosInfiniteScroll({
  sentinel: activitySentinel,
  active: computed(() => activeRef.value && feedMode.value === 'full'),
  hasMore: activityHasMore,
  loading: activityLoading,
  loadMore: loadMoreActivity,
})

interface FlagPresentation {
  label: string
  icon?: Icon
  color: WikitaCardItemTypeColor
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

const editThankState = ref<Record<number, boolean>>({})

function editThanked(revid: number): boolean {
  if (Object.prototype.hasOwnProperty.call(editThankState.value, revid)) {
    return editThankState.value[revid]
  }
  return isEditThanked(revid)
}

function onToggleEditThank(revid: number) {
  const thanked = toggleEditThank(revid)
  editThankState.value = {
    ...editThankState.value,
    [revid]: thanked,
  }
}

const activityLoadErrorMessage = computed(() =>
  props.scope === 'item'
    ? 'Could not load recent edits on this page.'
    : 'Could not load recent edits on your saved pages.',
)

const noEditsMessage = computed(() =>
  props.scope === 'item'
    ? 'No recent edits on this page.'
    : 'No recent edits on your saved pages.',
)

const allEnwikiItemsMissingRevisions = computed(() => {
  if (!itemsWithEnwiki.value.length) return false
  if (!itemIdsWithoutRevisions.value.length) return false
  const missing = new Set(itemIdsWithoutRevisions.value)
  return itemsWithEnwiki.value.every((item) => missing.has(item.id))
})
</script>

<template>
  <div class="wikita-activity-tab-panel">
    <template v-if="scope === 'home'">
      <div v-if="savedItemsLoading" class="wikita-activity-tab-panel__loading">
        <CdxProgressBar inline aria-label="Loading saved pages" />
      </div>
      <template v-else>
      <p v-if="!hasItems" class="wikita-activity-tab-panel__empty">
        You have not saved any pages yet.
      </p>
      <p v-else-if="!itemsWithEnwiki.length" class="wikita-activity-tab-panel__empty">
        None of your saved pages have English Wikipedia articles.
      </p>
      <div
        v-else-if="activityQueueReady && revisionLookupFailed && !activityChanges.length && !activityLoading"
        class="wikita-activity-tab-panel__error"
      >
        <p>{{ activityLoadErrorMessage }}</p>
        <CdxButton weight="quiet" @click="retryActivity">Try again</CdxButton>
      </div>
      <div
        v-else-if="
          activityQueueReady &&
          !activityChanges.length &&
          !activityLoading &&
          allEnwikiItemsMissingRevisions
        "
        class="wikita-activity-tab-panel__error"
      >
        <p>{{ activityLoadErrorMessage }}</p>
        <CdxButton weight="quiet" @click="retryActivity">Try again</CdxButton>
      </div>
      <p
        v-else-if="activityQueueReady && !activityChanges.length && !activityLoading"
        class="wikita-activity-tab-panel__empty"
      >
        {{ noEditsMessage }}
      </p>
      </template>
    </template>
    <template v-else>
      <p
        v-if="activityQueueReady && !activityChanges.length && !activityLoading"
        class="wikita-activity-tab-panel__empty"
      >
        {{ noEditsMessage }}
      </p>
    </template>

    <template v-if="(scope === 'item' || itemsWithEnwiki.length) && activityChanges.length">
      <WikitaCardItem
        v-for="change in activityChanges"
        :key="`${change.enwikiTitle}-${change.revid}`"
        :show-type="flagPresentation(change.flag) !== null"
        :type="flagPresentation(change.flag)?.label"
        :type-icon="flagPresentation(change.flag)?.icon"
        :type-color="flagPresentation(change.flag)?.color ?? 'base'"
        :title="change.title"
        :body="change.editSummary"
        :show-snippet="false"
        :show-info="Boolean(change.editedLabel || editCardStatusLabel(change))"
        :info-left="change.editedLabel"
        :info-right="editCardStatusLabel(change)"
        :info-right-subtle="Boolean(editCardStatusLabel(change))"
        :show-action="isThankableEditFlag(change.flag)"
        :action-active="editThanked(change.revid)"
        :action-label="editThanked(change.revid) ? 'Thanked' : 'Thank'"
        :action-icon="editThanked(change.revid) ? cdxIconHeart : cdxIconHeartOutline"
        :thumbnail-url="change.thumbnailUrl"
        :thumbnail-alt="change.title"
        :external-href="change.diffUrl"
        @action-click="onToggleEditThank(change.revid)"
      />
    </template>

    <div v-if="activityLoading" class="wikita-activity-tab-panel__loading">
      <CdxProgressBar inline aria-label="Loading activity" />
    </div>

    <div
      v-if="feedMode === 'full'"
      ref="activitySentinel"
      class="wikita-activity-tab-panel__sentinel"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.wikita-activity-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}

.wikita-activity-tab-panel__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.wikita-activity-tab-panel__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
}

.wikita-activity-tab-panel__error p {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.wikita-activity-tab-panel__sentinel {
  height: 1px;
  margin-top: auto;
  flex-shrink: 0;
}

.wikita-activity-tab-panel__loading {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50);
}
</style>
