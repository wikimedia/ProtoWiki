<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

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
import { splitEditMetaLabel } from '../../musical-group/data/fetchRecentChanges'
import { useActivityFeed } from '../../musical-group/useActivityFeed'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteCardWithChip, {
  type WikitaLiteChip,
  type WikitaLiteChipStatus,
} from '../components/WikitaLiteCardWithChip.vue'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import {
  isSentinelNearViewport,
  useViewportInfiniteScroll,
} from '../composables/useViewportInfiniteScroll'
import WikitaLiteShowMore from '../components/WikitaLiteShowMore.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import type { WikitaLiteSupportingSignal } from '../data/supportingSignals'
import { t } from '../i18n'

interface Props {
  standalone?: boolean
  /** Home preview items from {@link useMusicalGroupHome}. */
  items?: HomeRecentChange[]
  savedItems?: HomeSavedItem[]
  savedItemsLoading?: boolean
  loading?: boolean
  loadingMore?: boolean
  previewLimit?: number
  /** Empty card slots held at the end of the grid while the feed loads. */
  skeletons?: number
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
  savedItems: () => [],
  savedItemsLoading: false,
  loading: false,
  loadingMore: false,
  previewLimit: 3,
  skeletons: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

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

/*
 * Navigating always has somewhere to go; revealing in place only makes sense
 * while the feed holds more than the preview is showing.
 */
const showMoreControl = computed(
  () => showMoreLink.value && (!props.expandable || props.items.length > props.previewLimit),
)

const showStandaloneLoading = computed(() => {
  if (!props.standalone) return false
  if (useInternalFeed.value) {
    return props.savedItemsLoading || activityFeedLoading.value
  }
  return props.loading || props.loadingMore
})

interface FlagPresentation {
  /** `home.*` message key. */
  labelKey: string
  icon?: Icon
  status: WikitaLiteChipStatus
}

const FLAG_PRESENTATION: Record<
  Exclude<HomeRecentChangeFlag, 'none' | 'good-faith'>,
  FlagPresentation
> = {
  'first-edit': { labelKey: 'home.flagFirstEdit', icon: cdxIconUserAdd, status: 'success' },
  'new-editor': { labelKey: 'home.flagNewEditor', icon: cdxIconUserAdd, status: 'success' },
  'needs-reference': {
    labelKey: 'home.flagNeedsReference',
    icon: cdxIconReference,
    status: 'notice',
  },
  'tone-issue': { labelKey: 'home.flagToneIssue', icon: cdxIconAlert, status: 'warning' },
  'high-revert-risk': {
    labelKey: 'home.flagHighRevertRisk',
    icon: cdxIconAlert,
    status: 'warning',
  },
}

function flagPresentation(flag: HomeRecentChangeFlag): FlagPresentation | null {
  if (flag === 'none' || flag === 'good-faith') return null
  return FLAG_PRESENTATION[flag]
}

function changeChips(change: HomeRecentChange): WikitaLiteChip[] {
  const chips: WikitaLiteChip[] = []

  if (useInternalFeed.value && change.isLatest) {
    chips.push({ label: t('home.chipLatest'), icon: cdxIconClock, status: 'notice' })
  }
  if (change.reverted) {
    chips.push({ label: t('home.chipReverted'), icon: cdxIconEditUndo, status: 'notice' })
  }

  const flag = flagPresentation(change.flag)
  const showHighRevertRisk =
    flag &&
    change.flag === 'high-revert-risk' &&
    !change.flagPending &&
    !change.reverted
  if (showHighRevertRisk) {
    chips.push({ label: t(flag.labelKey), icon: flag.icon, status: flag.status })
  }

  if (change.majorChange && !change.flagPending) {
    chips.push({ label: t('home.chipMajorChange'), icon: cdxIconInfo, status: 'notice' })
  }

  if (flag && !change.flagPending && change.flag !== 'high-revert-risk') {
    chips.push({ label: t(flag.labelKey), icon: flag.icon, status: flag.status })
  }

  return chips
}

/** Who edited; when goes in the row's timestamp, see {@link editTimestamp}. */
function editSignals(change: HomeRecentChange): WikitaLiteSupportingSignal[] {
  const { editor } = splitEditMetaLabel(change.editedLabel)
  return [{ icon: cdxIconUserAvatar, text: editor }]
}

function editTimestamp(change: HomeRecentChange): string {
  return splitEditMetaLabel(change.editedLabel).relative
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
      <p>{{ t('home.recentActivityError') }}</p>
      <CdxButton weight="quiet" @click="retryActivity">{{ t('common.tryAgain') }}</CdxButton>
    </div>

    <div
      v-if="displayCards.length || skeletons"
      :class="['recent-activity-module__cards', groupClass]"
      :aria-busy="skeletons > 0 || undefined"
    >
      <template v-for="{ change, chips } in displayCards" :key="`${change.enwikiTitle}-${change.revid}`">
        <WikitaLiteCardWithChip
          v-if="standalone"
          :url="change.diffUrl"
          :chips="chips"
          :title="change.title"
          :description="change.editSummary"
          :supporting-signals="editSignals(change)"
            :supporting-timestamp="editTimestamp(change)"
          :force-thumbnail="false"
        />

        <template v-else>
          <WikitaLiteCardWithChip
            v-if="chips.length"
            :url="change.diffUrl"
            :chips="chips"
            :title="change.title"
            :description="change.editSummary"
            :supporting-signals="editSignals(change)"
            :supporting-timestamp="editTimestamp(change)"
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
              <WikitaLiteSupportingRow
                :signals="editSignals(change)"
                :timestamp="editTimestamp(change)"
              />
            </template>
          </CdxCard>
        </template>
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
      {{ t('home.reviewMoreChanges') }}
    </WikitaLiteShowMore>

    <CdxProgressBar v-if="showStandaloneLoading" inline :aria-label="t('home.loadingRecentActivity')" />

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
  gap: var(--spacing-75, 12px);
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
