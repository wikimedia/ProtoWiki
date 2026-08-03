<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconAlert,
  cdxIconError,
  cdxIconReference,
  cdxIconUserAdd,
  cdxIconUserAvatar,
} from '@wikimedia/codex-icons'

import {
  type HomeRecentChange,
  type HomeRecentChangeFlag,
  type HomeSavedItem,
} from '../../musical-group/data/types'
import { useActivityFeed } from '../../musical-group/useActivityFeed'
import { useCommonsPhotosInfiniteScroll } from '../../musical-group/useCommonsPhotosFeed'
import WikitaLiteCardWithChip, {
  type WikitaLiteChipStatus,
} from '../components/WikitaLiteCardWithChip.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  /** Home preview items from {@link useMusicalGroupHome}. */
  items?: HomeRecentChange[]
  savedItems?: HomeSavedItem[]
  savedItemsLoading?: boolean
  loading?: boolean
  previewLimit?: number
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  savedItems: () => [],
  savedItemsLoading: false,
  loading: false,
  previewLimit: 3,
  moreTo: undefined,
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

const previewItems = computed(() => props.items.slice(0, props.previewLimit))

const displayItems = computed(() => (props.standalone ? activityChanges.value : previewItems.value))

const showMoreLink = computed(
  () => !props.standalone && Boolean(props.moreTo) && displayItems.value.length > 0,
)

const showPreviewLoading = computed(() => props.standalone && props.loading)

const itemsWithEnwiki = computed(() =>
  props.savedItems.filter((item) => item.enwikiTitle),
)

interface FlagPresentation {
  label: string
  icon?: Icon
  status: WikitaLiteChipStatus
}

const FLAG_PRESENTATION: Record<
  Exclude<HomeRecentChangeFlag, 'none' | 'good-faith'>,
  FlagPresentation
> = {
  'first-edit': { label: "User's first edit", icon: cdxIconUserAdd, status: 'success' },
  'new-editor': { label: 'New editor', icon: cdxIconUserAdd, status: 'success' },
  'needs-reference': { label: 'Needs a reference check', icon: cdxIconReference, status: 'notice' },
  'tone-issue': { label: 'Tone issue', icon: cdxIconAlert, status: 'warning' },
  'high-revert-risk': { label: 'High revert risk', icon: cdxIconError, status: 'error' },
}

function flagPresentation(flag: HomeRecentChangeFlag): FlagPresentation | null {
  if (flag === 'none' || flag === 'good-faith') return null
  return FLAG_PRESENTATION[flag]
}

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
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

    <template v-for="change in displayItems" :key="`${change.enwikiTitle}-${change.revid}`">
      <WikitaLiteCardWithChip
        v-if="flagPresentation(change.flag)"
        :url="change.diffUrl"
        :chip-label="flagPresentation(change.flag)!.label"
        :chip-icon="flagPresentation(change.flag)!.icon"
        :chip-status="flagPresentation(change.flag)!.status"
        :title="change.title"
        :description="change.editSummary"
        :supporting-text="change.editedLabel"
        :supporting-icon="cdxIconUserAvatar"
        :thumbnail-url="change.thumbnailUrl"
        :force-thumbnail="true"
      />

      <CdxCard
        v-else
        :url="change.diffUrl"
        :thumbnail="cardThumbnail(change.thumbnailUrl)"
        :force-thumbnail="true"
      >
        <template #title>
          {{ change.title }}
        </template>
        <template v-if="change.editSummary" #description>
          {{ change.editSummary }}
        </template>
        <template #supporting-text>
          <WikitaLiteSupportingRow :icon="cdxIconUserAvatar">
            {{ change.editedLabel }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>
    </template>

    <RouterLink
      v-if="showMoreLink && moreTo"
      :to="moreTo"
      class="recent-activity-module__more-link"
    >
      <CdxButton
        weight="primary"
        class="recent-activity-module__more-button"
        tabindex="-1"
      >
        Review more changes
      </CdxButton>
    </RouterLink>

    <CdxProgressBar v-if="standalone && activityLoading" inline aria-label="Loading activity" />

    <div
      v-if="standalone"
      ref="activitySentinel"
      class="recent-activity-module__sentinel"
      aria-hidden="true"
    />
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

.recent-activity-module__more-link {
  display: block;
  width: 100%;
  margin-bottom: var(--spacing-50);
  text-decoration: none;
}

.recent-activity-module__more-button {
  width: 100%;
}
</style>
