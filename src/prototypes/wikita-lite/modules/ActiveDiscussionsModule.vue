<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconSpeechBubbles } from '@wikimedia/codex-icons'

import type { HomeActiveDiscussion } from '../../musical-group/data/types'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteDailyReadsTabs from '../components/WikitaLiteDailyReadsTabs.vue'
import WikitaLiteShowMore from '../components/WikitaLiteShowMore.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import { useWikitaLiteActiveDiscussionsTabs } from '../composables/useWikitaLiteActiveDiscussionsTabs'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { useWikitaLiteOverflowShowMore } from '../composables/useWikitaLiteOverflowShowMore'
import { activeDiscussionCategoryLabel } from '../data/activeDiscussionLabels'
import type { WikitaLiteSupportingSignal } from '../data/supportingSignals'
import { MESSAGES, t } from '../i18n'

interface Props {
  standalone?: boolean
  items?: HomeActiveDiscussion[]
  loading?: boolean
  error?: string | null
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
  loading: false,
  error: null,
  previewLimit: 3,
  skeletons: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  retry: []
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

/** Comment count; the latest reply's relative time goes in the row's timestamp. */
function discussionSignals(discussion: HomeActiveDiscussion): WikitaLiteSupportingSignal[] {
  return [
    {
      icon: cdxIconSpeechBubbles,
      text: t('home.commentCount', discussion.commentCount),
    },
  ]
}

const { tabs, activeTabId, showTabs, filteredItems } = useWikitaLiteActiveDiscussionsTabs({
  items: () => props.items,
})

const displayItems = computed(() => {
  const filtered = filteredItems.value
  return props.standalone ? filtered : filtered.slice(0, props.previewLimit)
})

const { groupClass, cardClass } = useWikitaLiteCardListClasses({
  standalone: () => props.standalone,
})

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
  <div class="active-discussions-module">
    <CdxProgressBar v-if="standalone && loading" inline :aria-label="t('home.loadingActiveDiscussions')" />

    <template v-else-if="error">
      <div class="active-discussions-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">{{ t('common.tryAgain') }}</CdxButton>
      </div>
    </template>

    <template v-else>
      <WikitaLiteDailyReadsTabs
        v-if="showTabs"
        v-model:active-tab-id="activeTabId"
        :tabs="tabs"
        :aria-label="t('home.activeDiscussionFilters')"
      />

      <div
        :class="['active-discussions-module__cards', groupClass]"
        :aria-busy="skeletons > 0 || undefined"
      >
        <CdxCard
          v-for="discussion in displayItems"
          :key="discussion.id"
          :class="cardClass"
          :url="discussion.discussionUrl"
        >
          <template #title>
            {{ discussion.title }}
          </template>
          <template #description>
            {{ activeDiscussionCategoryLabel(discussion.noticeboardTitle) }}
          </template>
          <template #supporting-text>
            <WikitaLiteSupportingRow
              :signals="discussionSignals(discussion)"
              :timestamp="discussion.latestCommentLabel"
            />
          </template>
        </CdxCard>
        <WikitaLiteCardSkeletons :count="skeletons" />
      </div>

      <slot name="after-cards" />

      <WikitaLiteShowMore
        v-if="showMoreControl"
        :to="moreTo"
        :expandable="expandable"
        @expand="$emit('expand')"
      >
        {{ MESSAGES.showMoreActiveDiscussions }}
      </WikitaLiteShowMore>

      <p v-if="standalone && !displayItems.length" class="active-discussions-module__empty">
        {{ t('home.emptyActiveDiscussions') }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.active-discussions-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  width: 100%;
}

.active-discussions-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: calc(-1*var(--spacing-25, 4px));
}

.active-discussions-module__error,
.active-discussions-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.active-discussions-module__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}
</style>
