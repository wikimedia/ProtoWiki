<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon, CdxInfoChip, CdxThumbnail } from '@wikimedia/codex'
import {
  cdxIconClock,
  cdxIconEditUndo,
  cdxIconRobot,
  cdxIconUserAvatar,
  cdxIconUserTemporary,
} from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'

import type { EditorKind, WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'

const props = defineProps<{
  item: WikitabSearchActivityItem
}>()

type ChipStatus = 'notice' | 'warning' | 'error' | 'success'

interface ActivityChip {
  label: string
  icon: Icon
  status: ChipStatus
}

const chips = computed((): ActivityChip[] => {
  const list: ActivityChip[] = []

  if (props.item.isLatest) {
    list.push({ label: 'Latest revision', icon: cdxIconClock, status: 'notice' })
  }
  if (props.item.reverted) {
    list.push({ label: 'Reverted', icon: cdxIconEditUndo, status: 'notice' })
  }

  return list
})

const thumbnail = computed(() =>
  props.item.thumbnailUrl ? { url: props.item.thumbnailUrl } : null,
)

const showDiffSize = computed(
  () => (props.item.charsAdded ?? 0) > 0 || (props.item.charsRemoved ?? 0) > 0,
)

const EDITOR_ICONS: Record<EditorKind, Icon> = {
  bot: cdxIconRobot,
  temporary: cdxIconUserTemporary,
  user: cdxIconUserAvatar,
  anonymous: cdxIconUserTemporary,
}

const editorIcon = computed(() => EDITOR_ICONS[props.item.editorKind])
</script>

<template>
  <a class="wikitab-search-activity-card" :href="item.diffUrl" target="_blank" rel="noreferrer">
    <CdxThumbnail class="wikitab-search-activity-card__thumbnail" :thumbnail="thumbnail" />

    <div class="wikitab-search-activity-card__content">
      <div v-if="chips.length" class="wikitab-search-activity-card__chips">
        <CdxInfoChip
          v-for="(chip, index) in chips"
          :key="`${chip.label}-${index}`"
          class="wikitab-search-activity-card__chip"
          :status="chip.status"
          :icon="chip.icon"
        >
          {{ chip.label }}
        </CdxInfoChip>
      </div>

      <p class="wikitab-search-activity-card__title">{{ item.title }}</p>
      <div
        v-if="showDiffSize || item.editSummary"
        class="wikitab-search-activity-card__description-block"
      >
        <p v-if="showDiffSize" class="wikitab-search-activity-card__diff-size">
          <span v-if="item.charsAdded" class="wikitab-search-activity-card__diff-size-added">
            +{{ item.charsAdded }}
          </span>
          <span v-if="item.charsRemoved" class="wikitab-search-activity-card__diff-size-removed">
            −{{ item.charsRemoved }}
          </span>
        </p>
        <p v-if="item.editSummary" class="wikitab-search-activity-card__description">
          {{ item.editSummary }}
        </p>
      </div>
      <p class="wikitab-search-activity-card__supporting">
        <CdxIcon
          :icon="editorIcon"
          size="x-small"
          class="wikitab-search-activity-card__supporting-icon"
        />
        <span class="wikitab-search-activity-card__supporting-text">
          {{ item.editedLabel }}
        </span>
      </p>
    </div>
  </a>
</template>

<style scoped>
.wikitab-search-activity-card {
  display: flex;
  gap: var(--spacing-75);
  min-width: 0;
  padding-block: var(--spacing-75);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  color: inherit;
  text-decoration: none;
}

.wikitab-search-activity-card__thumbnail {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
}

.wikitab-search-activity-card__thumbnail :deep(.cdx-thumbnail__image),
.wikitab-search-activity-card__thumbnail :deep(.cdx-thumbnail__placeholder) {
  width: 96px;
  height: 96px;
}

.wikitab-search-activity-card__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-search-activity-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50);
}

.wikitab-search-activity-card__chip {
  flex-shrink: 0;
}

.wikitab-search-activity-card__title {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikitab-search-activity-card__description-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.wikitab-search-activity-card__diff-size {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50);
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
}

.wikitab-search-activity-card__diff-size-added {
  color: var(--color-success);
}

.wikitab-search-activity-card__diff-size-removed {
  color: var(--color-error);
}

.wikitab-search-activity-card__description {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-activity-card__supporting {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-25);
  margin: 0;
  padding-top: var(--spacing-25);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-activity-card__supporting-icon {
  flex-shrink: 0;
}

.wikitab-search-activity-card__supporting-text {
  min-width: 0;
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}
</style>
