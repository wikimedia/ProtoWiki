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

import { useSkin } from '@/composables/useSkin'

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

const EDITOR_ICONS: Record<EditorKind, Icon> = {
  bot: cdxIconRobot,
  temporary: cdxIconUserTemporary,
  user: cdxIconUserAvatar,
  anonymous: cdxIconUserTemporary,
}

const editorIcon = computed(() => EDITOR_ICONS[props.item.editorKind])

const skin = useSkin()
const showNestedLinks = computed(() => skin.value !== 'mobile')
</script>

<template>
  <div class="wikitab-search-activity-card">
    <a
      class="wikitab-search-activity-card__link"
      :href="item.diffUrl"
      :aria-label="`View diff for ${item.title}`"
      target="_blank"
      rel="noreferrer"
    />

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

    <div class="wikitab-search-activity-card__body">
      <CdxThumbnail class="wikitab-search-activity-card__thumbnail" :thumbnail="thumbnail" />

      <div class="wikitab-search-activity-card__content">
        <p class="wikitab-search-activity-card__title">
          <a
            v-if="showNestedLinks"
            class="wikitab-search-activity-card__title-link"
            :href="item.articleHref"
            target="_blank"
            rel="noreferrer"
          >
            {{ item.title }}
          </a>
          <span v-else>{{ item.title }}</span>
        </p>
        <p v-if="item.editSummary" class="wikitab-search-activity-card__description">
          {{ item.editSummary }}
        </p>
        <p class="wikitab-search-activity-card__supporting">
          <CdxIcon
            :icon="editorIcon"
            size="x-small"
            class="wikitab-search-activity-card__supporting-icon"
          />
          <span class="wikitab-search-activity-card__supporting-text">
            <a
              v-if="showNestedLinks"
              class="wikitab-search-activity-card__editor-link"
              :href="item.editorHref"
              target="_blank"
              rel="noreferrer"
            >
              {{ item.editorName }}
            </a>
            <span v-else class="wikitab-search-activity-card__editor-name">{{
              item.editorName
            }}</span
            ><span class="wikitab-search-activity-card__edited-meta"
              >, {{ item.editedRelative }}</span
            >
          </span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikitab-search-activity-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  box-sizing: border-box;
  min-width: 0;
  padding-block: var(--spacing-75);
  padding-inline: var(--spacing-75);
  border: var(--border-width-base) solid transparent;
  background-color: var(--background-color-base);
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.1s;
}

.wikitab-search-activity-card:hover {
  border-color: var(--border-color-subtle);
}

.wikitab-search-activity-card__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.wikitab-search-activity-card__link:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base)
    var(--outline-color-progressive--focus);
  outline-offset: calc(var(--border-width-thick) * -1);
}

.wikitab-search-activity-card__body {
  display: flex;
  gap: var(--spacing-75);
  min-width: 0;
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

.wikitab-search-activity-card__title-link,
.wikitab-search-activity-card__editor-link {
  position: relative;
  z-index: 2;
  text-decoration: none;
}

.wikitab-search-activity-card__title-link {
  color: var(--color-base);
}

.wikitab-search-activity-card__editor-link,
.wikitab-search-activity-card__editor-name {
  color: var(--color-subtle);
}

.wikitab-search-activity-card__title-link:hover,
.wikitab-search-activity-card__title-link:focus-visible,
.wikitab-search-activity-card__editor-link:hover,
.wikitab-search-activity-card__editor-link:focus-visible {
  text-decoration: underline;
}

.wikitab-search-activity-card__description {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-activity-card__supporting {
  display: flex;
  align-items: center;
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

.wikitab-search-activity-card__edited-meta {
  color: var(--color-subtle);
}

[data-skin='mobile'] .wikitab-search-activity-card {
  padding-inline: 0;
  border: 0;
}

[data-skin='mobile'] .wikitab-search-activity-card:hover {
  border-color: transparent;
}
</style>
