<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard } from '@wikimedia/codex'

import TemplateImpactModule from '../../template-homepage/ImpactModule.vue'
import type { ImpactData } from '../../template-homepage/impact/data/impactTypes'

const emit = defineEmits<{
  refresh: []
}>()

interface Props extends ImpactData {
  standalone?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  loadPending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  viewLabel: 'Views on articles you\'ve edited',
  sparklineData: () => [],
  thanksReceived: 0,
  recentActivityData: () => [],
  mostViewed: () => [],
  showRefresh: false,
  refreshing: false,
  refreshError: undefined,
  loadPending: false,
})

const hasContent = computed(
  () =>
    !!props.viewCount ||
    (props.totalEdits ?? 0) > 0 ||
    props.recentActivityData.some((v) => v > 0) ||
    !!props.lastEdited ||
    !!props.longestStreak,
)

const showLoadPrompt = computed(() => props.loadPending && !hasContent.value)

const W = 300
const H = 48

function toPoints(data: number[], w = W, h = H): [number, number][] {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  return data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h * 0.8) - h * 0.1,
  ])
}

function makeLine(data: number[], w = W, h = H): string {
  if (data.length < 2) return ''
  return toPoints(data, w, h)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

function makeArea(data: number[], w = W, h = H): string {
  const line = makeLine(data, w, h)
  return line ? `${line} L${w},${h} L0,${h} Z` : ''
}

const linePath = computed(() => makeLine(props.sparklineData))
const areaPath = computed(() => makeArea(props.sparklineData))

function onRefreshClick(): void {
  emit('refresh')
}
</script>

<template>
  <TemplateImpactModule
    v-if="standalone"
    standalone
    v-bind="props"
    :refresh-error="refreshError ?? undefined"
    @refresh="onRefreshClick"
  />

  <div v-else class="impact-module">
    <p v-if="refreshError" class="impact-module__refresh-error" role="alert">
      {{ refreshError }}
    </p>

    <CdxCard v-if="hasContent" class="impact-module__card">
      <template #description>
        <div class="impact-module__preview">
          <div v-if="viewCount" class="impact-module__stat-row">
            <span class="impact-module__count">{{ viewCount }}</span>
            <span class="impact-module__count-label">{{ viewLabel }}</span>
          </div>
          <svg
            v-if="sparklineData.length >= 2"
            class="impact-module__sparkline"
            :viewBox="`0 0 ${W} ${H}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path :d="areaPath" class="impact-module__area" />
            <path :d="linePath" class="impact-module__line" />
          </svg>
          <div v-if="lastEdited || longestStreak" class="impact-module__metrics">
            <div v-if="lastEdited" class="impact-module__metric">
              <span class="impact-module__metric-label">Last edited</span>
              <span class="impact-module__metric-value">{{ lastEdited }}</span>
            </div>
            <div v-if="longestStreak" class="impact-module__metric">
              <span class="impact-module__metric-label">Longest streak</span>
              <span class="impact-module__metric-value">{{ longestStreak }}</span>
            </div>
          </div>
        </div>
      </template>
    </CdxCard>

    <CdxCard v-else-if="showLoadPrompt" class="impact-module__card">
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

    <CdxCard v-else class="impact-module__card">
      <template #description>
        <div class="impact-module__empty">
          <img
            src="https://en.wikipedia.org/w/extensions/GrowthExperiments/images/intro-heart-article.png?269e6"
            alt=""
            class="impact-module__empty-image"
          />
          <div class="impact-module__empty-text">
            <p class="impact-module__empty-heading">0 edits to articles so far</p>
            <p class="impact-module__empty-body">
              Help extend free knowledge to the world by editing topics that matter most to you.
            </p>
          </div>
        </div>
        <p class="impact-module__empty-footer">
          Start with a few <strong>suggested edits</strong>, then see how many people are viewing
          your contributions here.
        </p>
      </template>
    </CdxCard>
  </div>
</template>

<style scoped>
.impact-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.impact-module__card {
  width: 100%;
}

.impact-module__refresh-error {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-error, #bf3c2c);
}

.impact-module__preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
}

.impact-module__stat-row {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-50, 8px);
  flex-wrap: nowrap;
}

.impact-module__count {
  font-size: var(--font-size-xx-large, 2rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1;
}

.impact-module__count-label {
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.impact-module__sparkline {
  display: block;
  width: 100%;
  height: var(--size-100);
  overflow: visible;
}

.impact-module__area {
  fill: var(--background-color-progressive-subtle);
  stroke: none;
}

.impact-module__line {
  fill: none;
  stroke: var(--border-color-progressive);
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.impact-module__metrics {
  display: flex;
  gap: var(--spacing-100, 16px);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.impact-module__metric {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.impact-module__metric-value {
  font-weight: var(--font-weight-bold, 700);
}

.impact-module__load-prompt {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50, 8px);
}

.impact-module__empty {
  display: flex;
  gap: var(--spacing-100, 16px);
  align-items: flex-start;
}

.impact-module__empty-image {
  flex-shrink: 0;
  width: 64px;
  height: auto;
}

.impact-module__empty-text {
  flex: 1;
  min-width: 0;
}

.impact-module__empty-heading {
  margin: 0 0 var(--spacing-25, 4px);
  font-weight: var(--font-weight-bold, 700);
}

.impact-module__empty-body {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle, #54595d);
}

.impact-module__empty-footer {
  margin: var(--spacing-100, 16px) 0 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle, #54595d);
}
</style>
