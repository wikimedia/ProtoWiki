<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxIcon, CdxInfoChip, CdxMenuButton, CdxThumbnail } from '@wikimedia/codex'
import {
  cdxIconAlert,
  cdxIconArticle,
  cdxIconCheck,
  cdxIconEditUndo,
  cdxIconEllipsis,
  cdxIconHeartOutline,
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

const emit = defineEmits<{
  dismiss: [revid: number]
}>()

const selection = ref<string | number | null>(null)

const menuItems = [
  { value: 'thank', label: 'Thank', icon: cdxIconHeartOutline },
  { value: 'dismiss', label: 'Dismiss', icon: cdxIconCheck },
]

watch(selection, (value) => {
  if (value === 'thank') {
    window.open(props.item.thankUrl, '_blank', 'noopener,noreferrer')
  }
  if (value === 'dismiss') emit('dismiss', props.item.revid)
  if (value !== null) selection.value = null
})

type ChipStatus = 'notice' | 'warning' | 'error' | 'success'

interface ActivityChip {
  label: string
  icon: Icon
  status: ChipStatus
}

const chips = computed((): ActivityChip[] => {
  const list: ActivityChip[] = []

  if (props.item.highRevertRisk) {
    list.push({ label: 'High revert risk', icon: cdxIconAlert, status: 'warning' })
  }
  if (props.item.isLatest) {
    list.push({ label: 'Latest revision', icon: cdxIconArticle, status: 'notice' })
  }
  if (props.item.reverted) {
    list.push({ label: 'Reverted', icon: cdxIconEditUndo, status: 'notice' })
  }

  return list
})

const thumbnail = computed(() =>
  props.item.thumbnailUrl ? { url: props.item.thumbnailUrl } : null,
)

const hasDiffSize = computed(
  () =>
    props.item.charsAdded !== undefined || props.item.charsRemoved !== undefined,
)

const isZeroDiffSize = computed(
  () =>
    hasDiffSize.value &&
    (props.item.charsAdded ?? 0) === 0 &&
    (props.item.charsRemoved ?? 0) === 0,
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
    <div class="wikitab-search-activity-card__menu">
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-search-activity-card__menu-button"
        weight="quiet"
        :menu-items="menuItems"
        :menu-config="{ renderInPlace: true }"
        :aria-label="`${item.title} edit options`"
        @click.stop
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

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
        <div
          v-if="hasDiffSize || item.editSummary"
          class="wikitab-search-activity-card__description-block"
        >
          <p v-if="hasDiffSize" class="wikitab-search-activity-card__diff-size">
            <span v-if="isZeroDiffSize" class="wikitab-search-activity-card__diff-size-neutral">
              ±0
            </span>
            <template v-else>
              <span v-if="item.charsAdded" class="wikitab-search-activity-card__diff-size-added">
                +{{ item.charsAdded }}
              </span>
              <span
                v-if="item.charsRemoved"
                class="wikitab-search-activity-card__diff-size-removed"
              >
                −{{ item.charsRemoved }}
              </span>
            </template>
          </p>
          <p v-if="item.editSummary" class="wikitab-search-activity-card__description">
            {{ item.editSummary }}
          </p>
        </div>
        <p class="wikitab-search-activity-card__supporting">
          <span class="wikitab-search-activity-card__supporting-start">
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
              }}</span>
            </span>
          </span>
          <span class="wikitab-search-activity-card__supporting-end">{{
            item.editedRelative
          }}</span>
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
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.1s;
}

.wikitab-search-activity-card:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikitab-search-activity-card:active {
  border-color: var(--border-color-interactive--active, #202122);
}

.wikitab-search-activity-card:has([aria-expanded='true']) {
  z-index: 2;
}

.wikitab-search-activity-card__menu {
  position: absolute;
  top: var(--spacing-35);
  inset-inline-end: var(--spacing-35);
  z-index: 2;
}

.wikitab-search-activity-card__menu-button :deep(.cdx-icon) {
  color: var(--color-subtle);
}

.wikitab-search-activity-card__menu-button :deep(.cdx-menu) {
  width: max-content !important;
  min-width: 0 !important;
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
  flex: 1 1 auto;
  align-items: stretch;
  gap: var(--spacing-75);
  min-width: 0;
  min-height: 96px;
}

.wikitab-search-activity-card__thumbnail {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
}

.wikitab-search-activity-card__thumbnail :deep(.cdx-thumbnail__image),
.wikitab-search-activity-card__thumbnail :deep(.cdx-thumbnail__placeholder) {
  width: 96px;
  min-width: 96px;
  height: 96px;
  min-height: 96px;
}

/* Placeholder thumbnails stay Codex neutral grey, not the page color theme. */
.wikitab-search-activity-card__thumbnail :deep(.cdx-thumbnail__placeholder) {
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-activity-card__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-self: stretch;
  min-width: 0;
  min-height: 96px;
}

/*
 * ::after is last in the box tree — use order so the spacer sits above the
 * supporting row (same pattern as WikitabCard).
 */
.wikitab-search-activity-card__content::after {
  content: '';
  display: block;
  flex: 1 1 auto;
  min-height: 0;
  order: 10;
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

.wikitab-search-activity-card__description-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  margin: var(--spacing-25) 0 0;
  min-width: 0;
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

.wikitab-search-activity-card__diff-size-neutral {
  color: var(--color-subtle);
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
  align-items: first baseline;
  justify-content: space-between;
  gap: var(--spacing-25);
  box-sizing: border-box;
  width: 100%;
  order: 11;
  margin: var(--spacing-50) 0 0;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-activity-card__supporting-start {
  display: inline-flex;
  align-items: first baseline;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-search-activity-card__supporting-icon {
  flex-shrink: 0;
}

.wikitab-search-activity-card__supporting :deep(.cdx-icon) {
  color: inherit;
}

.wikitab-search-activity-card__supporting-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.wikitab-search-activity-card__supporting-end {
  flex-shrink: 0;
}
</style>
