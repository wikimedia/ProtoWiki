<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconAlert,
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconCheck,
  cdxIconError,
  cdxIconReference,
  cdxIconUserAvatar,
  cdxIconUserTemporary,
} from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'

import type { RecentChangeFeedItem } from '@/lib/dashpageRecentChangesTypes'
import {
  primaryFlagChipFromKind,
  type RecentChangeFlagChipIcon,
} from '@/lib/dashpageRecentChangesSignals'
import { createDashpageRecentChangesWiki } from '@/lib/fetchDashpageRecentChanges'
import { formatDashpageEditSummaryPlain } from '@/lib/formatDashpageEditSummaryPlain'
import { useDashpageRecentChangesProgress } from '@/lib/dashpageRecentChangesProgress'

const props = defineProps<{
  item: RecentChangeFeedItem
}>()

const wiki = createDashpageRecentChangesWiki()
const { isRevisionViewed, markRevisionAsViewed } = useDashpageRecentChangesProgress()

const isViewed = computed(() => isRevisionViewed(props.item.revId))

const primaryFlagChip = computed(() => primaryFlagChipFromKind(props.item.primaryFlagKind))

const hasPrimaryFlag = computed(() => primaryFlagChip.value != null)

const linkBorderClass = computed(() => {
  if (isViewed.value) return null
  const tier = props.item.primaryFlagTier
  if (tier === 'toneReference' || tier === 'qualityDown') {
    return 'review-changes__item-link--primary-unviewed-tone'
  }
  if (tier === 'revertHigh') return 'review-changes__item-link--primary-unviewed-revert'
  if (tier === 'revertWarn') return 'review-changes__item-link--primary-unviewed-revert-warn'
  if (tier === 'qualityUp') return 'review-changes__item-link--primary-unviewed-quality-up'
  return null
})

function onCardClick(): void {
  markRevisionAsViewed(props.item.revId)
}

const CHIP_ICONS: Record<RecentChangeFlagChipIcon, Icon> = {
  error: cdxIconError,
  reference: cdxIconReference,
  check: cdxIconCheck,
  alert: cdxIconAlert,
  arrowUp: cdxIconArrowUp,
  arrowDown: cdxIconArrowDown,
}

const primaryFlagChipIcon = computed(() => {
  const chip = primaryFlagChip.value
  return chip ? CHIP_ICONS[chip.icon] : null
})

const primaryFlagAriaLabel = computed(() => {
  const chip = primaryFlagChip.value
  if (!chip) return undefined
  const description = props.item.primaryFlagDescription?.trim()
  return description ? `${chip.label}. ${description}` : chip.label
})

const structuredDeltaOpenParenClass = computed(() => {
  const segments = props.item.structuredDeltaSegments
  return segments?.[0]?.deltaClass ?? ''
})

const structuredDeltaCloseParenClass = computed(() => {
  const segments = props.item.structuredDeltaSegments
  if (!segments?.length) return ''
  return segments[segments.length - 1]?.deltaClass ?? ''
})

function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return ''
  return wiki.formatNiceRelativeTimestamp(timestamp)
}

function formatDelta(delta: number): string {
  return wiki.formatDelta(delta)
}

function deltaFallbackClass(delta: number): string {
  return wiki.getDeltaClass(delta, false)
}

function userIcon(userName: string) {
  return wiki.isTemporaryAccount(userName) ? cdxIconUserTemporary : cdxIconUserAvatar
}

function userUrl(userName: string): string {
  return wiki.getUserUrl(userName)
}

const displayComment = computed(() => {
  if (props.item.commentHtml) return null
  if (!props.item.comment?.trim()) return ''
  return formatDashpageEditSummaryPlain(props.item.comment, props.item.pageTitle, wiki)
})
</script>

<template>
  <li class="review-changes__item">
    <a
      class="review-changes__item-link"
      :class="[
        linkBorderClass,
        {
          'review-changes__item-link--revision-viewed': isViewed,
          'review-changes__item-link--unviewed': !isViewed,
        },
      ]"
      :href="item.diffUrl"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`Open diff for ${item.pageTitle}`"
      @click="onCardClick"
    >
      <div
        class="review-changes__item-header"
        :class="{ 'review-changes__item-header--has-primary-flag': hasPrimaryFlag }"
      >
        <span
          v-if="primaryFlagChip && primaryFlagChipIcon"
          class="review-changes__primary-flag-chip"
          :class="`review-changes__primary-flag-chip--${primaryFlagChip.variant}`"
          :aria-label="primaryFlagAriaLabel"
        >
          <CdxIcon
            :icon="primaryFlagChipIcon"
            size="small"
            class="review-changes__primary-flag-chip-icon"
            aria-hidden="true"
          />
          <span class="review-changes__primary-flag-chip-text">{{ primaryFlagChip.label }}</span>
        </span>
        <span class="review-changes__page-cell">
          <span
            class="review-changes__page-cell-heading review-changes__page-cell-heading--separate"
          >
            <span class="review-changes__page">{{ item.pageTitle }}</span>
            <span
              v-if="item.shortDescription"
              class="review-changes__short-desc review-changes__short-desc--no-separator"
            >
              {{ item.shortDescription }}
            </span>
          </span>
          <span class="review-changes__user-time-group">
            <span class="review-changes__user-row">
              <span
                class="review-changes__user-icon-btn"
                :aria-label="`User: ${item.userName}`"
              >
                <CdxIcon
                  class="review-changes__user-icon"
                  :icon="userIcon(item.userName)"
                  size="x-small"
                  aria-hidden="true"
                />
              </span>
              <a
                target="_blank"
                rel="noopener noreferrer"
                :href="userUrl(item.userName)"
                class="review-changes__user"
                @click.stop
              >
                {{ item.userName }}
              </a>
            </span>
            <span class="review-changes__time-sep" aria-hidden="true">·</span>
            <time :datetime="item.timestamp" class="review-changes__time">
              {{ formatRelativeTime(item.timestamp) }}
            </time>
          </span>
          <div
            class="review-changes__structured-delta-row"
            :class="{ 'review-changes__structured-delta-row--viewed': isViewed }"
          >
            <template v-if="item.structuredDeltaSegments?.length">
              <span :class="structuredDeltaOpenParenClass">(</span>
              <template
                v-for="(seg, index) in item.structuredDeltaSegments"
                :key="`${item.revId}-delta-${index}`"
              >
                <span :class="seg.deltaClass">{{ seg.text }}</span>
                <span
                  v-if="index < item.structuredDeltaSegments.length - 1"
                  :class="seg.deltaClass"
                >
                  ,
                </span>
              </template>
              <span :class="structuredDeltaCloseParenClass">)</span>
            </template>
            <template v-else>
              <span :class="deltaFallbackClass(item.delta)">{{ formatDelta(item.delta) }}</span>
            </template>
          </div>
          <div v-if="item.commentHtml || displayComment" class="review-changes__summary">
            <span
              v-if="item.commentHtml"
              class="review-changes__comment review-changes__comment--no-cutout"
              v-html="item.commentHtml"
            />
            <span
              v-else
              class="review-changes__comment review-changes__comment--no-cutout"
            >
              {{ displayComment }}
            </span>
          </div>
        </span>
      </div>
    </a>
  </li>
</template>

<style src="./recent-changes-feed.css"></style>
