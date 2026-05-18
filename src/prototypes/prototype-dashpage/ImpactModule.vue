<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconChart,
  cdxIconClock,
  cdxIconEdit,
  cdxIconInfo,
  cdxIconUserTalk,
} from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'

export interface MostViewedArticle {
  title: string
  views: number
  thumbnailSrc?: string
  href?: string
  sparklineData?: number[]
}

interface Props {
  to?: RouteLocationRaw
  /** When set: filled state. Also used as the views count label. */
  viewCount?: string
  viewLabel?: string
  sparklineData?: number[]
  // Mobile filled
  lastEdited?: string
  longestStreak?: string
  // Desktop (empty + filled)
  thanksReceived?: number
  // Desktop filled only
  totalEdits?: number
  recentActivityData?: number[]
  activityStartDate?: string
  activityEndDate?: string
  mostViewed?: MostViewedArticle[]
  viewAllEditsHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  viewCount: undefined,
  viewLabel: 'Views on articles you\'ve edited',
  sparklineData: () => [],
  lastEdited: undefined,
  longestStreak: undefined,
  thanksReceived: 0,
  totalEdits: undefined,
  recentActivityData: () => [],
  activityStartDate: undefined,
  activityEndDate: undefined,
  mostViewed: () => [],
  viewAllEditsHref: undefined,
})

const hasContent = computed(() => !!props.viewCount)
const isMobile = computed(() => props.to != null)

// ── Sparkline helpers ────────────────────────────────
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

// ── Activity bar chart ───────────────────────────────
const BAR_W = 300
const BAR_H = 32

const activityBars = computed(() => {
  const data = props.recentActivityData
  if (!data.length) return []
  const max = Math.max(...data, 1)
  const barWidth = BAR_W / data.length
  const gap = 1
  return data.map((v, i) => ({
    x: i * barWidth + gap / 2,
    y: v === 0 ? BAR_H - 2 : BAR_H - (v / max) * BAR_H,
    width: Math.max(barWidth - gap, 1),
    height: v === 0 ? 2 : (v / max) * BAR_H,
  }))
})

const recentEditCount = computed(() =>
  props.recentActivityData.reduce((s, v) => s + v, 0)
)
</script>

<template>
  <DashboardModule title="Your impact" :to="to" :cta="null">

    <!-- ① Mobile filled ─────────────────────────────── -->
    <template v-if="hasContent && isMobile">
      <div class="impact-module__stat-row">
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
    </template>

    <!-- ② Desktop filled ────────────────────────────── -->
    <template v-else-if="hasContent">
      <!-- 2×2 stats grid -->
      <div class="impact-module__desktop-stats impact-module__desktop-stats--grid">
        <div class="impact-module__desktop-stat">
          <div class="impact-module__desktop-stat-value-row">
            <CdxIcon :icon="cdxIconEdit" size="small" class="impact-module__desktop-stat-icon" />
            <span class="impact-module__desktop-stat-value impact-module__desktop-stat-value--progressive">{{ totalEdits ?? 0 }}</span>
          </div>
          <span class="impact-module__desktop-stat-label">Total edits</span>
        </div>
        <div class="impact-module__desktop-stat impact-module__desktop-stat--border-left">
          <div class="impact-module__desktop-stat-value-row">
            <CdxIcon :icon="cdxIconUserTalk" size="small" class="impact-module__desktop-stat-icon" />
            <span class="impact-module__desktop-stat-value">{{ thanksReceived }}</span>
          </div>
          <div class="impact-module__desktop-stat-label-row">
            <span class="impact-module__desktop-stat-label">Thanks received</span>
            <CdxIcon :icon="cdxIconInfo" size="small" class="impact-module__desktop-info-icon" />
          </div>
        </div>
        <div class="impact-module__desktop-stat impact-module__desktop-stat--border-top">
          <div class="impact-module__desktop-stat-value-row">
            <CdxIcon :icon="cdxIconClock" size="small" class="impact-module__desktop-stat-icon" />
            <span class="impact-module__desktop-stat-value">{{ lastEdited }}</span>
          </div>
          <span class="impact-module__desktop-stat-label">Last edited</span>
        </div>
        <div class="impact-module__desktop-stat impact-module__desktop-stat--border-top impact-module__desktop-stat--border-left">
          <div class="impact-module__desktop-stat-value-row">
            <CdxIcon :icon="cdxIconChart" size="small" class="impact-module__desktop-stat-icon" />
            <span class="impact-module__desktop-stat-value">{{ longestStreak }}</span>
          </div>
          <div class="impact-module__desktop-stat-label-row">
            <span class="impact-module__desktop-stat-label">Longest streak</span>
            <CdxIcon :icon="cdxIconInfo" size="small" class="impact-module__desktop-info-icon" />
          </div>
        </div>
      </div>

      <!-- Recent activity bar chart -->
      <div class="impact-module__activity">
        <p class="impact-module__activity-title">Your recent activity (last 60 days)</p>
        <div class="impact-module__activity-body">
          <div class="impact-module__activity-left">
            <span class="impact-module__activity-count-value">{{ recentEditCount }}</span>
            <span class="impact-module__activity-count-label">Edits</span>
          </div>
          <div class="impact-module__activity-right">
            <svg
              class="impact-module__activity-chart"
              :viewBox="`0 0 ${BAR_W} ${BAR_H}`"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                v-for="(bar, i) in activityBars"
                :key="i"
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                class="impact-module__activity-bar"
              />
            </svg>
            <div v-if="activityStartDate || activityEndDate" class="impact-module__activity-dates">
              <span>{{ activityStartDate }}</span>
              <span>{{ activityEndDate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Views sparkline -->
      <div class="impact-module__stat-row">
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

      <!-- Most viewed articles -->
      <template v-if="mostViewed.length > 0">
        <p class="impact-module__most-viewed-title">Most viewed (since your edit)</p>
        <div class="impact-module__most-viewed-list">
          <div
            v-for="article in mostViewed"
            :key="article.title"
            class="impact-module__most-viewed-item"
          >
            <div class="impact-module__most-viewed-thumb">
              <img v-if="article.thumbnailSrc" :src="article.thumbnailSrc" :alt="article.title" />
            </div>
            <a :href="article.href ?? '#'" class="impact-module__most-viewed-title-link">{{ article.title }}</a>
            <div class="impact-module__most-viewed-views-col">
              <span class="impact-module__most-viewed-count">{{ article.views.toLocaleString() }}</span>
              <svg
                v-if="article.sparklineData && article.sparklineData.length >= 2"
                class="impact-module__mini-sparkline"
                viewBox="0 0 60 24"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path :d="makeLine(article.sparklineData, 60, 24)" class="impact-module__line" />
              </svg>
            </div>
          </div>
        </div>
        <a v-if="viewAllEditsHref" :href="viewAllEditsHref" class="impact-module__view-all">View all edits</a>
      </template>
    </template>

    <!-- ③ Mobile empty ──────────────────────────────── -->
    <template v-else-if="isMobile">
      <div class="impact-module__empty-hero">
        <img
          src="https://en.wikipedia.org/w/extensions/GrowthExperiments/images/intro-heart-article.png?269e6"
          alt=""
          class="impact-module__empty-image"
        />
        <div class="impact-module__empty-text">
          <p class="impact-module__empty-heading">0 edits to articles so far</p>
          <p class="impact-module__empty-body">Help extend free knowledge to the world by editing topics that matter most to you.</p>
        </div>
      </div>
      <p class="impact-module__empty-footer">
        Start with a few <strong>suggested edits</strong>, then see how many people are viewing your contributions here.
      </p>
    </template>

    <!-- ④ Desktop empty ─────────────────────────────── -->
    <template v-else>
      <div class="impact-module__desktop-stats">
        <div class="impact-module__desktop-stat">
          <div class="impact-module__desktop-stat-value-row">
            <CdxIcon :icon="cdxIconUserTalk" size="small" class="impact-module__desktop-stat-icon" />
            <span class="impact-module__desktop-stat-value">{{ thanksReceived }}</span>
          </div>
          <div class="impact-module__desktop-stat-label-row">
            <span class="impact-module__desktop-stat-label">Thanks received</span>
            <CdxIcon :icon="cdxIconInfo" size="small" class="impact-module__desktop-info-icon" />
          </div>
        </div>
        <div class="impact-module__desktop-stat-divider" />
        <div class="impact-module__desktop-stat">
          <div class="impact-module__desktop-stat-value-row">
            <CdxIcon :icon="cdxIconChart" size="small" class="impact-module__desktop-stat-icon" />
            <span class="impact-module__desktop-stat-value">–</span>
          </div>
          <div class="impact-module__desktop-stat-label-row">
            <span class="impact-module__desktop-stat-label">Longest streak</span>
            <CdxIcon :icon="cdxIconInfo" size="small" class="impact-module__desktop-info-icon" />
          </div>
        </div>
      </div>
      <div class="impact-module__desktop-empty-body">
        <img
          src="https://en.wikipedia.org/w/extensions/GrowthExperiments/images/intro-heart-article.png?269e6"
          alt=""
          class="impact-module__desktop-empty-image"
        />
        <p class="impact-module__desktop-empty-heading">0 edits to articles so far</p>
        <p class="impact-module__desktop-empty-subheading">Help extend free knowledge to the world by editing topics that matter most to you.</p>
      </div>
      <p class="impact-module__empty-footer">
        Start with a few <strong>suggested edits</strong>, then see how many people are viewing your contributions here.
      </p>
    </template>

  </DashboardModule>
</template>

<style scoped>
/* ── Shared: sparkline ────────────────────────────── */
.impact-module__sparkline {
  display: block;
  width: 100%;
  height: var(--size-100);
  overflow: visible;
  margin-bottom: var(--spacing-50, 8px);
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

/* ── Shared: desktop stats grid cell ──────────────── */
.impact-module__desktop-stats {
  display: flex;
  align-items: stretch;
  background-color: var(--background-color-interactive-subtle, #eaf3ff);
  margin-bottom: var(--spacing-100, 16px);
  overflow: hidden;
}

.impact-module__desktop-stats--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background-color: var(--background-color-progressive-subtle);
}

.impact-module__desktop-stat {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  padding: var(--spacing-75, 12px);
  flex-grow: 1;
}

.impact-module__desktop-stat--border-left {
  border-left: 1px solid var(--border-color-subtle, #a2a9b1);
}

.impact-module__desktop-stat--border-top {
  border-top: 1px solid var(--border-color-subtle, #a2a9b1);
}

.impact-module__desktop-stat-divider {
  width: 1px;
  background-color: var(--border-color-subtle, #a2a9b1);
  flex-shrink: 0;
}

.impact-module__desktop-stat-value-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.impact-module__desktop-stat-icon {
  color: var(--color-subtle);
  flex-shrink: 0;
}

.impact-module__desktop-stat-value {
  font-weight: var(--font-weight-bold, 700);
  line-height: 1;
  color: var(--color-base, #202122);
}

.impact-module__desktop-stat-value--progressive {
  color: var(--color-progressive, #36c);
}

.impact-module__desktop-stat-label-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.impact-module__desktop-stat-label {
  font-size: var(--font-size-small);
  color: var(--color-subtle);
  flex-grow: 1;
}

.impact-module__desktop-info-icon {
  color: var(--color-base--subtle, #54595d);
  flex-shrink: 0;
}

/* ── Mobile filled ────────────────────────────────── */
.impact-module__stat-row {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-50, 8px);
  flex-wrap: nowrap;
  margin-bottom: var(--spacing-25, 4px);
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

/* ── Desktop filled: activity chart ──────────────── */
.impact-module__activity {
  margin-bottom: var(--spacing-75, 12px);
}

.impact-module__activity-title {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.impact-module__activity-body {
  display: flex;
  align-items: end;
  gap: var(--spacing-100, 16px);
}

.impact-module__activity-left {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.impact-module__activity-count-value {
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
  line-height: 1;
}

.impact-module__activity-count-label {
  font-size: var(--font-size-small);
  color: var(--color-base--subtle, #54595d);
}

.impact-module__activity-right {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.impact-module__activity-chart {
  display: block;
  width: 100%;
  height: 32px;
  flex: 1;
}

.impact-module__activity-bar {
  fill: var(--background-color-interactive, #eaecf0);
}

.impact-module__activity-dates {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-small);
  color: var(--color-subtle, #54595d);
}

/* ── Desktop filled: most viewed ─────────────────── */
.impact-module__most-viewed-title {
  margin: var(--spacing-100, 16px) 0;
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.impact-module__most-viewed-list {
  display: flex;
  flex-direction: column;
}

.impact-module__most-viewed-item:nth-child(even) {
  background-color: var(--background-color-interactive-subtle, #eaf3ff);
}

.impact-module__most-viewed-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-25, 4px);
}

.impact-module__most-viewed-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  overflow: hidden;
  background-color: var(--background-color-neutral);
  border: 1px solid var(--border-color-subtle);
  border-radius: 2px;
}

.impact-module__most-viewed-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.impact-module__most-viewed-title-link {
  flex: 1;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
  text-decoration: none;
  min-width: 0;
}

.impact-module__most-viewed-title-link:hover {
  text-decoration: underline;
}

.impact-module__most-viewed-views-col {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-25, 4px);
}

.impact-module__most-viewed-count {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
}

.impact-module__mini-sparkline {
  display: block;
  width: 20px;
  height: 10px;
}

.impact-module__mini-sparkline > path {
  stroke-width: 3px;
}

.impact-module__view-all {
  display: block;
  margin-top: var(--spacing-75, 12px);
  font-weight: var(--font-weight-bold);
}

.impact-module__view-all:hover {
  text-decoration: underline;
}

/* ── Mobile empty ─────────────────────────────────── */
.impact-module__empty-hero {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
  margin-bottom: var(--spacing-100, 16px);
}

.impact-module__empty-image {
  flex-shrink: 0;
  width: 72px;
  height: auto;
}

.impact-module__empty-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  min-width: 0;
}

.impact-module__empty-heading {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
}

.impact-module__empty-body {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.impact-module__empty-footer {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

/* ── Desktop empty ────────────────────────────────── */
.impact-module__desktop-empty-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--spacing-50, 8px);
  margin-bottom: var(--spacing-75, 12px);
}

.impact-module__desktop-empty-image {
  width: 140px;
  height: auto;
}

.impact-module__desktop-empty-heading {
  margin: 0;
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
}

.impact-module__desktop-empty-subheading {
  margin: 0;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
}
</style>
