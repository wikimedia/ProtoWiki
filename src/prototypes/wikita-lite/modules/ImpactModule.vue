<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { CdxButton, CdxCard } from '@wikimedia/codex'
import {
  cdxIconChartBar,
  cdxIconChartLine,
  cdxIconCheckAll,
  cdxIconEdit,
  cdxIconUserTalk,
} from '@wikimedia/codex-icons'

import { messageParts, t } from '@/i18n'
import type { ImpactData } from '../../template-homepage/impact/data/impactTypes'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { useWikitaLiteRoute } from '../composables/useWikitaLiteRoute'
import { HELP_WANTED_PAGE } from '../routes'

const { wikitaLiteRoute } = useWikitaLiteRoute()

interface Props extends ImpactData {
  standalone?: boolean
  empty?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  empty: false,
  viewLabel: undefined,
  sparklineData: () => [],
  recentActivityData: () => [],
  mostViewed: () => [],
  showRefresh: false,
  refreshing: false,
  refreshError: undefined,
})

const { cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

const viewsTitle = computed(() => t('impact.viewsTitle', String(props.viewCount)))
const viewLabelText = computed(() => props.viewLabel ?? t('impact.viewLabel'))

function formatStat(value: number | string | undefined): string {
  if (value === undefined || value === '') return '–'
  return String(value)
}
</script>

<template>
  <div
    class="impact-module"
    :class="{
      'impact-module--standalone': standalone,
      'impact-module--empty': empty,
    }"
  >
    <p v-if="refreshError" class="impact-module__refresh-error" role="alert">
      {{ refreshError }}
    </p>

    <div v-if="empty" class="impact-module__empty">
      <div class="impact-module__empty-copy">
        <p class="impact-module__empty-headline">{{ t('impact.emptyHeadlineSentence') }}</p>
        <p class="impact-module__empty-body">
          {{ t('impact.emptyBody') }}
        </p>
        <p class="impact-module__empty-caption">
          <template v-for="(part, index) in messageParts('impact.startWith')" :key="index">
            <strong v-if="part === 1">{{ t('impact.suggestedEdits') }}</strong>
            <template v-else>{{ part }}</template>
          </template>
        </p>
      </div>
      <RouterLink v-slot="{ navigate }" :to="wikitaLiteRoute(HELP_WANTED_PAGE)" custom>
        <CdxButton class="impact-module__empty-cta" weight="normal" @click="navigate">
          {{ t('impact.seeAllSuggestions') }}
        </CdxButton>
      </RouterLink>
    </div>

    <template v-else>
      <CdxCard :icon="cdxIconChartLine" :class="['impact-module__card', cardClass]">
        <template #title>{{ viewsTitle }}</template>
        <template #description>{{ viewLabelText }}</template>
      </CdxCard>

      <div class="impact-module__row">
        <CdxCard :icon="cdxIconEdit" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(totalEdits) }}</template>
          <template #description>{{ t('impact.totalEdits') }}</template>
        </CdxCard>

        <CdxCard :icon="cdxIconUserTalk" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(thanksReceived) }}</template>
          <template #description>{{ t('impact.thanksReceived') }}</template>
        </CdxCard>
      </div>

      <div class="impact-module__row">
        <CdxCard :icon="cdxIconChartBar" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(longestStreak) }}</template>
          <template #description>{{ t('impact.longestEditingStreak') }}</template>
        </CdxCard>

        <CdxCard :icon="cdxIconCheckAll" :class="['impact-module__card', 'impact-module__card--half', cardClass]">
          <template #title>{{ formatStat(editsReviewed) }}</template>
          <template #description>{{ t('impact.editsReviewed') }}</template>
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

.impact-module__empty {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  width: 100%;
}

.impact-module__empty-copy {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  color: var(--color-subtle, #54595d);
}

.impact-module__empty-headline {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  font-weight: bold;
  line-height: var(--line-height-small, 1.25rem);
}

.impact-module__empty-body {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.25rem);
}

.impact-module__empty-caption {
  margin: 0;
  font-size: var(--font-size-small, 0.8125rem);
  line-height: var(--line-height-x-small, 1.25rem);
}

.impact-module__empty-cta {
  width: 100%;
  max-width: none;
}
</style>
