<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconCalendar, cdxIconEdit } from '@wikimedia/codex-icons'

/** "Article created N ago" + "N edits this week" (linking to the history), for the card and panel. */
const props = defineProps<{
  /** ISO timestamp of the page's first revision. */
  createdAt?: string
  editsThisWeek?: number
  historyUrl?: string
}>()

const createdLabel = computed(() => {
  if (!props.createdAt) return null
  const days = (Date.now() - Date.parse(props.createdAt)) / 86_400_000
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' })
  if (days >= 365) return `Article created ${rtf.format(-Math.floor(days / 365), 'year')}`
  if (days >= 30) return `Article created ${rtf.format(-Math.floor(days / 30), 'month')}`
  return `Article created ${rtf.format(-Math.max(1, Math.floor(days)), 'day')}`
})

const editsLabel = computed(() => {
  const n = props.editsThisWeek
  if (!n) return null
  return `${n} ${n === 1 ? 'edit' : 'edits'} this week`
})
</script>

<template>
  <div v-if="createdLabel || editsLabel" class="wikilink-signals">
    <span v-if="createdLabel" class="wikilink-signals__signal">
      <CdxIcon :icon="cdxIconCalendar" size="small" />
      {{ createdLabel }}
    </span>
    <a
      v-if="editsLabel"
      class="wikilink-signals__signal wikilink-signals__signal--link"
      :href="historyUrl"
      target="_blank"
      rel="noopener"
    >
      <CdxIcon :icon="cdxIconEdit" size="small" />
      {{ editsLabel }}
    </a>
  </div>
</template>

<style scoped>
.wikilink-signals {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50) var(--spacing-75);
}

.wikilink-signals__signal {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  font-family: var(--font-family-base);
  font-size: var(--font-size-x-small);
  line-height: var(--line-height-x-small);
  color: var(--color-base);
  white-space: nowrap;
}

/*
 * "N edits this week" links to the page history but keeps the signal look; underline on hover
 * (overriding ProtoWiki's global `a:hover`, which would turn it blue).
 */
.wikilink-signals__signal--link,
.wikilink-signals__signal--link:hover {
  color: inherit;
  text-decoration: none;
}

.wikilink-signals__signal--link:hover {
  text-decoration: underline;
}

/* Design draws signal icons at 14px, between Codex's x-small (12px) and small (16px). */
.wikilink-signals__signal .cdx-icon {
  min-width: 14px;
  min-height: 14px;
  width: 14px;
  height: 14px;
}
</style>
