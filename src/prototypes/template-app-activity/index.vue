<script setup lang="ts">
definePage({
  meta: {
    title: 'Activity',
    description: 'Template for an in-app activity feed with reading/edit stats and history.',
    category: 'template',
    platform: 'app',
  },
})

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxCard, CdxIcon, CdxInfoChip, CdxThumbnail } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconArticles,
  cdxIconBookmark,
  cdxIconChartLine,
  cdxIconEdit,
  cdxIconFlag,
  cdxIconGlobe,
  cdxIconLink,
  cdxIconNext,
  cdxIconPuzzle,
  cdxIconRestore,
  cdxIconSearch,
  cdxIconStar,
  cdxIconTag,
  cdxIconUserContributions,
  cdxIconUserTalk,
} from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_MAIN_BOTTOM_NAV_ITEMS,
  IOS_MAIN_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import { useIsIos } from '@/composables/useAppPlatform'

import BarChart from './BarChart.vue'
import { fetchThumbnailUrl } from './fetchThumbnail'
import {
  generateActivityData,
  generateHistoryGroups,
  type ActivityData,
  type HistoryGroup,
} from './mockActivityData'
import Sparkline from './Sparkline.vue'

const router = useRouter()
const isIos = useIsIos()

const activity = ref<ActivityData | null>(null)
const historyGroups = ref<HistoryGroup[]>([])

/** Cards use the current route as their `url` — Codex's link styling with nowhere new to go. */
const SELF_URL = '/template-app-activity'

/** Patches in a title's real thumbnail wherever it appears once its fetch resolves. */
function applyThumbnail(title: string, url: string | null): void {
  if (!url) return

  if (activity.value) {
    activity.value = {
      ...activity.value,
      mostViewed: activity.value.mostViewed.map((entry) =>
        entry.title === title ? { ...entry, thumbnailUrl: url } : entry,
      ),
    }
  }

  historyGroups.value = historyGroups.value.map((group) => ({
    ...group,
    entries: group.entries.map((entry) =>
      entry.title === title ? { ...entry, thumbnailUrl: url } : entry,
    ),
  }))
}

async function load(): Promise<void> {
  const data = generateActivityData()
  const groups = generateHistoryGroups()
  activity.value = data
  historyGroups.value = groups

  const titles = new Set<string>([
    ...data.mostViewed.filter((entry) => entry.hasThumb).map((entry) => entry.title),
    ...groups.flatMap((group) => group.entries.map((entry) => entry.title)),
  ])

  await Promise.all(
    Array.from(titles).map(async (title) => {
      const url = await fetchThumbnailUrl(title)
      applyThumbnail(title, url)
    }),
  )
}

onMounted(() => {
  void load()
})

function onBottomNav(item: AppBottomNavItem): void {
  if (item === 'search') router.push('/template-app-search')
  else if (item === 'bookmarks') router.push('/template-app-saved')
}

const bottomNavItems = computed(() =>
  isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS,
)

const headerLeft: AppHeaderItem[] = [{ type: 'title', text: 'Activity' }]

/** Android keeps tabs/bell/menu; iOS swaps to ellipsis/tabs/account — same split as other templates. */
const headerRight = computed(
  (): AppHeaderItem[] =>
    isIos.value
      ? [
          { type: 'button', icon: 'vertical-ellipsis', label: 'More' },
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'user-avatar-outline', label: 'Account' },
        ]
      : [
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'bell-outline', label: 'Notifications' },
          { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
        ],
)

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

const chartRangeStart = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - 29)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
})

const chartRangeEnd = computed(() =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
)
</script>

<template>
  <AppChromeWrapper
    :left="headerLeft"
    :right="headerRight"
    :bottom-nav-items="bottomNavItems"
    active-nav-item="history"
    @navigate="onBottomNav"
  >
    <div v-if="activity" class="template-app-activity">
      <div class="template-app-activity__hero">
        <h2 class="template-app-activity__hero-title">{{ activity.username }}’s reading</h2>
        <span class="template-app-activity__platform-pill">
          ON WIKIPEDIA {{ isIos ? 'IOS' : 'ANDROID' }}
        </span>
        <p class="template-app-activity__hero-time">
          {{ formatMinutes(activity.readingMinutesThisWeek) }}
        </p>
        <p class="template-app-activity__hero-subtitle">time spent reading this week</p>
      </div>

      <CdxCard :url="SELF_URL" :icon="cdxIconArticles" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Articles read this month
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="template-app-activity__big-number">
            {{ activity.articlesReadThisMonth }}
          </span>
        </template>
      </CdxCard>

      <CdxCard :url="SELF_URL" :icon="cdxIconBookmark" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Articles saved this month
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="template-app-activity__big-number">
            {{ activity.articlesSavedThisMonth }}
          </span>
        </template>
      </CdxCard>

      <CdxCard :url="SELF_URL" :icon="cdxIconTag" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Top categories read this month
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <ul class="template-app-activity__plain-list">
            <li v-for="category in activity.topCategories" :key="category">{{ category }}</li>
          </ul>
        </template>
      </CdxCard>

      <div class="template-app-activity__chart-block">
        <span class="template-app-activity__chart-heading">{{ activity.editsThisMonth }} edits</span>
        <BarChart :values="activity.editsThisMonthChart" />
        <div class="template-app-activity__chart-range">
          <span>{{ chartRangeStart }}</span>
          <span>{{ chartRangeEnd }}</span>
        </div>
      </div>

      <div class="template-app-activity__chart-block">
        <p class="template-app-activity__views-line">
          <strong>{{ formatNumber(activity.viewsOnEditedArticles) }}</strong>
          views on articles you’ve edited
        </p>
        <Sparkline :values="activity.viewsChart" :width="300" :height="60" />
      </div>

      <CdxCard :url="SELF_URL" :icon="cdxIconGlobe" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Total edits across projects
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="template-app-activity__big-number">
            {{ activity.totalEditsAcrossProjects }}
          </span>
        </template>
      </CdxCard>

      <h3 class="template-app-activity__section-heading">Highlights</h3>

      <CdxCard :url="SELF_URL" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Game stats
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <div class="template-app-activity__stat-grid">
            <div class="template-app-activity__stat">
              <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconPuzzle" />
              <strong class="template-app-activity__stat-number">{{ activity.gamesPlayed }}</strong>
              <span class="template-app-activity__stat-label">games played</span>
            </div>
            <div class="template-app-activity__stat">
              <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconArrowNext" />
              <strong class="template-app-activity__stat-number">
                {{ activity.currentStreak ?? '-' }}
              </strong>
              <span class="template-app-activity__stat-label">current streak</span>
            </div>
            <div class="template-app-activity__stat">
              <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconStar" />
              <strong class="template-app-activity__stat-number">
                {{ activity.bestStreakGames ?? '-' }}
              </strong>
              <span class="template-app-activity__stat-label">best streak</span>
            </div>
            <div class="template-app-activity__stat">
              <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconFlag" />
              <strong class="template-app-activity__stat-number">
                {{ activity.averageScore ?? '-' }}
              </strong>
              <span class="template-app-activity__stat-label">average score</span>
            </div>
          </div>

          <CdxButton
            class="template-app-activity__wikigames-button"
            action="progressive"
            weight="primary"
          >
            Play WikiGames
          </CdxButton>
        </template>
      </CdxCard>

      <CdxCard :url="SELF_URL" :icon="cdxIconUserContributions" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Contributions this month
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <p class="template-app-activity__stat-row">
            <strong>{{ activity.contributionsThisMonth }}</strong>
            edits this month
          </p>
          <p class="template-app-activity__stat-row">
            <strong>{{ activity.contributionsLastMonth }}</strong>
            edits last month
          </p>

          <hr class="template-app-activity__divider" />

          <p class="template-app-activity__empty-heading">
            {{ activity.contributionsThisMonth }} edits to articles recently
          </p>
          <p class="template-app-activity__empty-text">
            <template v-if="activity.contributionsThisMonth === 0">
              Looks like you haven’t made an edit this month. Extend free knowledge by editing
              topics that interest you.
            </template>
            <template v-else>
              Nice work — keep up the momentum by editing topics that interest you.
            </template>
          </p>
          <CdxButton action="progressive" weight="primary">
            <CdxIcon :icon="cdxIconEdit" />
            Make an edit
          </CdxButton>
        </template>
      </CdxCard>

      <h3 class="template-app-activity__section-heading">All time impact</h3>

      <div class="template-app-activity__plain-card">
        <div class="template-app-activity__stat-grid">
          <div class="template-app-activity__stat">
            <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconEdit" />
            <strong class="template-app-activity__stat-number">
              {{ activity.allTimeTotalEdits }}
            </strong>
            <span class="template-app-activity__stat-label">total edits</span>
          </div>
          <div class="template-app-activity__stat">
            <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconStar" />
            <strong class="template-app-activity__stat-number">
              {{ activity.allTimeBestStreakDays }} days
            </strong>
            <span class="template-app-activity__stat-label">best streak</span>
          </div>
          <div class="template-app-activity__stat">
            <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconUserTalk" />
            <strong class="template-app-activity__stat-number">{{ activity.allTimeThanks }}</strong>
            <span class="template-app-activity__stat-label">thanks</span>
          </div>
          <div class="template-app-activity__stat">
            <CdxIcon class="template-app-activity__stat-icon" :icon="cdxIconRestore" />
            <strong class="template-app-activity__stat-number">
              {{ activity.lastEditedLabel }}
            </strong>
            <span class="template-app-activity__stat-label">last edited</span>
          </div>
        </div>
      </div>

      <h3 class="template-app-activity__section-heading">
        Your recent activity (last 30 days)
      </h3>

      <div class="template-app-activity__chart-block">
        <span class="template-app-activity__chart-heading">
          {{ activity.recentActivityEdits }} edits
        </span>
        <BarChart :values="activity.recentActivityChart" />
        <div class="template-app-activity__chart-range">
          <span>{{ chartRangeStart }}</span>
          <span>{{ chartRangeEnd }}</span>
        </div>
      </div>

      <div class="template-app-activity__section-header-row">
        <h3 class="template-app-activity__section-heading">Your impact</h3>
        <CdxInfoChip status="subtle">EN</CdxInfoChip>
      </div>

      <CdxCard :url="SELF_URL" :icon="cdxIconChartLine" class="template-app-activity__card">
        <template #title>
          <span class="template-app-activity__card-title">
            Most viewed since your edit
            <CdxIcon class="template-app-activity__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <ol class="template-app-activity__ranked-list">
            <li v-for="(entry, index) in activity.mostViewed" :key="entry.title">
              <span class="template-app-activity__rank-badge">{{ index + 1 }}</span>
              <strong class="template-app-activity__rank-title">{{ entry.title }}</strong>
              <span class="template-app-activity__rank-description">{{ entry.description }}</span>
              <div class="template-app-activity__rank-meta">
                <Sparkline :values="entry.sparkline" :width="60" :height="20" />
                <span>{{ formatNumber(entry.viewCount) }}</span>
              </div>
              <CdxThumbnail
                v-if="entry.hasThumb"
                class="template-app-activity__rank-thumb"
                :thumbnail="entry.thumbnailUrl ? { url: entry.thumbnailUrl } : null"
              />
            </li>
          </ol>
        </template>
      </CdxCard>

      <div class="template-app-activity__history">
        <div v-for="group in historyGroups" :key="group.dateLabel">
          <h3 class="template-app-activity__history-date">{{ group.dateLabel }}</h3>
          <div v-for="(entry, index) in group.entries" :key="index">
            <div class="template-app-activity__history-entry">
              <CdxIcon :icon="entry.viaLink ? cdxIconLink : cdxIconSearch" />
              <div class="template-app-activity__history-text">
                <strong>{{ entry.title }}</strong>
                <span>{{ entry.description }}</span>
              </div>
              <CdxThumbnail
                class="template-app-activity__history-thumb"
                :thumbnail="entry.thumbnailUrl ? { url: entry.thumbnailUrl } : null"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppChromeWrapper>
</template>

<style scoped>
.template-app-activity {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-block: var(--spacing-150, 24px);
}

.template-app-activity__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50, 8px);
  text-align: center;
}

.template-app-activity__hero-title {
  margin: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__platform-pill {
  padding: var(--spacing-25, 4px) var(--spacing-75, 12px);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral, #eaecf0);
  color: var(--color-subtle, #54595d);
  font-family: var(--font-family-monospace, monospace);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-activity__hero-time {
  margin: 0;
  font-size: var(--font-size-xxx-large, 1.75rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__hero-subtitle {
  margin: 0;
  color: var(--color-subtle, #54595d);
}

/* Codex's own `.cdx-card__text` doesn't stretch by default — force it so the
   chevron in `#title` lands at the card's edge instead of hugging the text. */
.template-app-activity__card :deep(.cdx-card__text) {
  flex: 1 1 auto;
  min-width: 0;
}

/* Card's supporting-text styles force any nested icon to `--color-subtle`
   (same specificity as CdxButton's own `.cdx-icon { color: inherit }`, and it
   wins on source order) — restore inherited color for icons inside our own
   nested buttons so they match the button's text color. */
.template-app-activity__card :deep(.cdx-button .cdx-icon) {
  color: inherit;
}

.template-app-activity__card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.template-app-activity__chevron {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.template-app-activity__big-number {
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__plain-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.template-app-activity__plain-list li {
  padding: var(--spacing-50, 8px) 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  color: var(--color-base, #202122);
}

.template-app-activity__plain-list li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.template-app-activity__chart-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.template-app-activity__chart-heading {
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__chart-range {
  display: flex;
  justify-content: space-between;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-activity__views-line {
  margin: 0;
  color: var(--color-base, #202122);
}

.template-app-activity__views-line strong {
  font-size: var(--font-size-x-large, 1.25rem);
}

.template-app-activity__section-heading {
  margin: 0;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

/* `>` so this only touches top-level section headings, not the one nested
   inside `.section-header-row` below (that gets its own rule instead). */
.template-app-activity > .template-app-activity__section-heading {
  margin-top: var(--spacing-100, 16px);
  margin-bottom: calc(-1 * var(--spacing-50, 8px));
}

.template-app-activity__section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-100, 16px);
  margin-bottom: calc(-1 * var(--spacing-50, 8px));
}

.template-app-activity__stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-150, 24px);
}

.template-app-activity__stat {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--spacing-75, 12px);
}

.template-app-activity__stat-icon {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  color: var(--color-progressive, #36c);
}

.template-app-activity__stat-number {
  grid-column: 2;
  grid-row: 1;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__stat-label {
  grid-column: 2;
  grid-row: 2;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-activity__wikigames-button {
  width: 100%;
  margin-top: var(--spacing-150, 24px);
}

.template-app-activity__plain-card {
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.template-app-activity__stat-row {
  margin: 0 0 var(--spacing-50, 8px);
  color: var(--color-base, #202122);
}

.template-app-activity__stat-row strong {
  margin-inline-end: var(--spacing-25, 4px);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
}

.template-app-activity__divider {
  margin: var(--spacing-100, 16px) 0;
  border: 0;
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.template-app-activity__empty-heading {
  margin: 0 0 var(--spacing-50, 8px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__empty-text {
  margin: 0 0 var(--spacing-100, 16px);
  color: var(--color-subtle, #54595d);
}

.template-app-activity__ranked-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.template-app-activity__ranked-list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  column-gap: var(--spacing-75, 12px);
  row-gap: var(--spacing-12, 2px);
}

.template-app-activity__rank-badge {
  display: flex;
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-activity__rank-title {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  color: var(--color-base, #202122);
}

.template-app-activity__rank-description {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-activity__rank-meta {
  display: flex;
  grid-column: 2;
  grid-row: 3;
  align-items: center;
  gap: var(--spacing-50, 8px);
  color: var(--color-progressive, #36c);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

.template-app-activity__rank-thumb {
  grid-column: 3;
  grid-row: 1 / span 3;
  align-self: center;
}

.template-app-activity__history-date {
  margin: var(--spacing-100, 16px) 0 var(--spacing-50, 8px);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-activity__history > div:first-child .template-app-activity__history-date {
  margin-top: 0;
}

.template-app-activity__history-entry {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-75, 12px) 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  color: var(--color-subtle, #54595d);
}

.template-app-activity__history-text {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-12, 2px);
  color: var(--color-base, #202122);
}

.template-app-activity__history-text span {
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-activity__history-thumb {
  flex-shrink: 0;
}
</style>
