<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconAlert,
  cdxIconClock,
  cdxIconReference,
  cdxIconEditUndo,
  cdxIconInfo,
  cdxIconUserAdd,
  cdxIconUserAvatar,
} from '@wikimedia/codex-icons'

import {
  type HomeRecentChange,
  type HomeRecentChangeFlag,
  type HomeSavedItem,
} from '../../musical-group/data/types'
import { useActivityFeed } from '../../musical-group/useActivityFeed'
import WikitaLiteCardWithChip, {
  type WikitaLiteChip,
  type WikitaLiteChipStatus,
} from '../components/WikitaLiteCardWithChip.vue'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import {
  isSentinelNearViewport,
  useViewportInfiniteScroll,
} from '../composables/useViewportInfiniteScroll'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  /** Home preview items from {@link useMusicalGroupHome}. */
  items?: HomeRecentChange[]
  savedItems?: HomeSavedItem[]
  savedItemsLoading?: boolean
  loading?: boolean
  loadingMore?: boolean
  previewLimit?: number
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  savedItems: () => [],
  savedItemsLoading: false,
  loading: false,
  loadingMore: false,
  previewLimit: 3,
  moreTo: undefined,
})

const useInternalFeed = computed(() => props.standalone && props.savedItems.length > 0)

const activeRef = computed(() => useInternalFeed.value)
const savedItemsRef = toRef(() => props.savedItems)
const feedMode = computed(() => (props.standalone ? 'full' : 'latest'))

const {
  changes: activityChanges,
  loading: activityLoading,
  loadingMore: activityLoadingMore,
  hasMore: activityHasMore,
  queueReady: activityQueueReady,
  revisionLookupFailed,
  loadMore: loadMoreActivity,
  retry: retryActivity,
} = useActivityFeed(savedItemsRef, activeRef, feedMode, {
  eagerClassify: true,
  reviewFeed: true,
})

const activitySentinel = ref<HTMLElement | null>(null)
const pageActive = computed(() => useInternalFeed.value)

const activityFeedLoading = computed(
  () => activityLoading.value || activityLoadingMore.value,
)

let fillingViewport = false

async function loadNextChange(): Promise<boolean> {
  if (!useInternalFeed.value || activityFeedLoading.value || !activityHasMore.value) return false
  return loadMoreActivity()
}

async function fillViewport(): Promise<void> {
  if (fillingViewport) return
  fillingViewport = true
  try {
    while (pageActive.value && activityHasMore.value && !activityFeedLoading.value) {
      const added = await loadNextChange()
      if (!added) break
      await nextTick()
      if (!isSentinelNearViewport(activitySentinel.value)) break
    }
  } finally {
    fillingViewport = false
  }
}

watch(
  () =>
    [useInternalFeed.value, props.savedItemsLoading, activityQueueReady.value] as const,
  ([internalFeed, savedLoading, ready]) => {
    if (!internalFeed || savedLoading || !ready) return
    void fillViewport()
  },
)

useViewportInfiniteScroll({
  sentinel: activitySentinel,
  active: pageActive,
  hasMore: activityHasMore,
  loading: activityFeedLoading,
  loadMore: loadNextChange,
})

const previewItems = computed(() => props.items.slice(0, props.previewLimit))

const displayItems = computed(() => {
  if (!props.standalone) return previewItems.value
  if (useInternalFeed.value) return activityChanges.value
  return props.items
})

const displayCards = computed(() =>
  displayItems.value.map((change) => ({
    change,
    chips: changeChips(change),
  })),
)

const showMoreLink = computed(
  () => !props.standalone && Boolean(props.moreTo) && displayItems.value.length > 0,
)

const showStandaloneLoading = computed(() => {
  if (!props.standalone) return false
  if (useInternalFeed.value) {
    return props.savedItemsLoading || activityFeedLoading.value
  }
  return props.loading || props.loadingMore
})

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
  'high-revert-risk': { label: 'High revert risk', icon: cdxIconAlert, status: 'warning' },
}

function flagPresentation(flag: HomeRecentChangeFlag): FlagPresentation | null {
  if (flag === 'none' || flag === 'good-faith') return null
  return FLAG_PRESENTATION[flag]
}

function changeChips(change: HomeRecentChange): WikitaLiteChip[] {
  const chips: WikitaLiteChip[] = []

  if (useInternalFeed.value && change.isLatest) {
    chips.push({ label: 'Latest', icon: cdxIconClock, status: 'notice' })
  }
  if (change.reverted) {
    chips.push({ label: 'Reverted', icon: cdxIconEditUndo, status: 'notice' })
  }

  const flag = flagPresentation(change.flag)
  const showHighRevertRisk =
    flag &&
    change.flag === 'high-revert-risk' &&
    !change.flagPending &&
    !change.reverted
  if (showHighRevertRisk) {
    chips.push({ label: flag.label, icon: flag.icon, status: flag.status })
  }

  if (change.majorChange && !change.flagPending) {
    chips.push({ label: 'Major change', icon: cdxIconInfo, status: 'notice' })
  }

  if (flag && !change.flagPending && change.flag !== 'high-revert-risk') {
    chips.push({ label: flag.label, icon: flag.icon, status: flag.status })
  }

  return chips
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })
</script>

<template>
  <div class="recent-activity-module">
    <div
      v-if="
        useInternalFeed &&
        activityQueueReady &&
        revisionLookupFailed &&
        !activityChanges.length &&
        !activityFeedLoading
      "
      class="recent-activity-module__error"
    >
      <p>Could not load recent activity.</p>
      <CdxButton weight="quiet" @click="retryActivity">Try again</CdxButton>
    </div>

    <div v-if="displayCards.length" :class="['recent-activity-module__cards', groupClass]">
      <template v-for="{ change, chips } in displayCards" :key="`${change.enwikiTitle}-${change.revid}`">
        <WikitaLiteCardWithChip
          v-if="standalone"
          :url="change.diffUrl"
          :chips="chips"
          :title="change.title"
          :description="change.editSummary"
          :supporting-text="change.editedLabel"
          :supporting-icon="cdxIconUserAvatar"
          :force-thumbnail="false"
        />

        <template v-else>
          <WikitaLiteCardWithChip
            v-if="chips.length"
            :url="change.diffUrl"
            :chips="chips"
            :title="change.title"
            :description="change.editSummary"
            :supporting-text="change.editedLabel"
            :supporting-icon="cdxIconUserAvatar"
            :force-thumbnail="false"
          />

          <CdxCard
            v-else
            :class="cardClass"
            :url="change.diffUrl"
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
      </template>
    </div>

    <slot name="after-cards" />

    <RouterLink
      v-if="showMoreLink && moreTo"
      :to="moreTo"
      class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled wikita-lite-button-link"
    >
      Review more changes
    </RouterLink>

    <CdxProgressBar v-if="showStandaloneLoading" inline aria-label="Loading recent activity" />

    <div
      v-if="useInternalFeed"
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

.recent-activity-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
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
