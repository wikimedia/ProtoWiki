<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard } from '@wikimedia/codex'
import {
  cdxIconChart,
  cdxIconCheckAll,
  cdxIconEdit,
  cdxIconHeartOutline,
  cdxIconUserTalk,
} from '@wikimedia/codex-icons'

import type { ImpactData } from '../../template-homepage/impact/data/impactTypes'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { HELP_WANTED_PAGE } from '../routes'

const emit = defineEmits<{
  refresh: []
}>()

interface Props extends ImpactData {
  standalone?: boolean
  empty?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  loadPending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  empty: false,
  viewLabel: 'On articles you\'ve edited',
  sparklineData: () => [],
  recentActivityData: () => [],
  mostViewed: () => [],
  showRefresh: false,
  refreshing: false,
  refreshError: undefined,
  loadPending: false,
})

const showLoadPrompt = computed(() => props.loadPending && props.standalone)

const { cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

const viewsTitle = computed(() => `${props.viewCount} views`)

function formatStat(value: number | string | undefined): string {
  if (value === undefined || value === '') return '–'
  return String(value)
}

function onRefreshClick(): void {
  emit('refresh')
}
</script>

<template>
  <div
    class="impact-module"
    :class="{ 'impact-module--standalone': standalone }"
  >
    <p v-if="refreshError" class="impact-module__refresh-error" role="alert">
      {{ refreshError }}
    </p>

    <CdxCard v-if="showLoadPrompt" :class="['impact-module__card', cardClass]">
      <template #description>
        <div class="impact-module__load-prompt">
          <CdxButton
            action="progressive"
            weight="primary"
            :disabled="refreshing"
            @click="onRefreshClick"
          >
            {{ refreshing ? 'Loading…' : 'Load impact' }}
          </CdxButton>
        </div>
      </template>
    </CdxCard>

    <CdxCard
      v-else-if="empty"
      :icon="cdxIconHeartOutline"
      :url="HELP_WANTED_PAGE"
      :class="['impact-module__card', cardClass]"
    >
      <template #title>0 edits to articles so far</template>
      <template #description>
        Help extend free knowledge to the world by editing topics that matter most to you.
      </template>
      <template #supporting-text>
        Start with a few <strong>suggested edits</strong>, then see how many people are viewing
        your contributions here.
      </template>
    </CdxCard>

    <template v-else>
      <CdxCard :class="['impact-module__card', cardClass]">
        <template #title>{{ viewsTitle }}</template>
        <template #description>{{ viewLabel }}</template>
      </CdxCard>

      <div class="impact-module__row">
        <CdxCard :icon="cdxIconEdit" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(totalEdits) }}</template>
          <template #description>Total edits</template>
        </CdxCard>

        <CdxCard :icon="cdxIconUserTalk" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(thanksReceived) }}</template>
          <template #description>Thanks received</template>
        </CdxCard>
      </div>

      <div class="impact-module__row">
        <CdxCard :icon="cdxIconChart" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(longestStreak) }}</template>
          <template #description>Longest editing streak</template>
        </CdxCard>

        <CdxCard :icon="cdxIconCheckAll" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(editsReviewed) }}</template>
          <template #description>Edits reviewed</template>
        </CdxCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.impact-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.impact-module--standalone {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.impact-module__card {
  width: 100%;
}

.impact-module__row {
  display: flex;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.impact-module__card--half {
  flex: 1 1 0;
  min-width: 0;
}

.impact-module__refresh-error {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-error, #bf3c2c);
}

.impact-module__load-prompt {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50, 8px);
}

.impact-module--standalone .impact-module__load-prompt {
  min-height: 40vh;
  align-items: center;
}
</style>
