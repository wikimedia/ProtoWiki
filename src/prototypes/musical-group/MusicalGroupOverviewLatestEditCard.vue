<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  cdxIconHeart,
  cdxIconHeartOutline,
  cdxIconHistory,
} from '@wikimedia/codex-icons'

import WikitaCardItem, {
  type WikitaCardItemTypeColor,
} from './components/WikitaCardItem.vue'
import { isEditThanked, toggleEditThank } from './data/editThanks'
import { formatEditStatusLabel } from './data/fetchRecentChanges'
import {
  isThankableEditFlag,
  type HomeRecentChange,
  type HomeRecentChangeFlag,
} from './data/types'

interface Props {
  change: HomeRecentChange
  thumbnailUrl?: string
}

const props = defineProps<Props>()

const FLAG_COLORS: Record<Exclude<HomeRecentChangeFlag, 'none'>, WikitaCardItemTypeColor> = {
  'first-edit': 'success',
  'new-editor': 'success',
  'good-faith': 'success',
  'needs-reference': 'progressive',
  'tone-issue': 'warning',
  'high-revert-risk': 'error',
}

const FLAG_LABELS: Record<Exclude<HomeRecentChangeFlag, 'none'>, string> = {
  'first-edit': "User's first edit",
  'new-editor': 'New editor',
  'good-faith': 'Good faith',
  'needs-reference': 'Needs a reference check',
  'tone-issue': 'Tone issue',
  'high-revert-risk': 'High revert risk',
}

const flag = computed(() => {
  if (props.change.flag === 'none') return undefined
  return {
    label: FLAG_LABELS[props.change.flag],
    color: FLAG_COLORS[props.change.flag],
  }
})

function editCardStatusLabel(change: HomeRecentChange): string {
  return formatEditStatusLabel(change.reverted, change.isLatest)
}

const editThankState = ref<Record<number, boolean>>({})

function editThanked(revid: number): boolean {
  if (Object.prototype.hasOwnProperty.call(editThankState.value, revid)) {
    return editThankState.value[revid]
  }
  return isEditThanked(revid)
}

function onToggleEditThank(revid: number) {
  const thanked = toggleEditThank(revid)
  editThankState.value = {
    ...editThankState.value,
    [revid]: thanked,
  }
}
</script>

<template>
  <WikitaCardItem
    type="Recent change"
    :type-icon="cdxIconHistory"
    :sub-type="flag?.label"
    :sub-type-color="flag?.color"
    :show-title="false"
    :body="change.editSummary"
    :show-snippet="false"
    :show-info="Boolean(change.editedLabel || editCardStatusLabel(change))"
    :info-left="change.editedLabel"
    :info-right="editCardStatusLabel(change)"
    :info-right-subtle="Boolean(editCardStatusLabel(change))"
    :show-action="isThankableEditFlag(change.flag)"
    :action-active="editThanked(change.revid)"
    :action-label="editThanked(change.revid) ? 'Thanked' : 'Thank'"
    :action-icon="editThanked(change.revid) ? cdxIconHeart : cdxIconHeartOutline"
    :thumbnail-url="thumbnailUrl ?? change.thumbnailUrl"
    :thumbnail-alt="change.title"
    :external-href="change.diffUrl"
    @action-click="onToggleEditThank(change.revid)"
  />
</template>
