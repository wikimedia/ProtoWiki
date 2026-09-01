<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  timestamp: string
  author?: string
}>()

const when = computed(() => formatRelativeEdit(props.timestamp))
const who = computed(() => props.author?.trim() ?? '')
const show = computed(() => Boolean(when.value || who.value))

function capitalizeFirstLetter(text: string): string {
  if (!text.length) return text
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

function formatRelativeEdit(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const abs = Math.abs(diffSec)

  let relative = ''
  if (abs < 60) relative = rtf.format(diffSec, 'second')
  else if (abs < 3600) relative = rtf.format(Math.round(diffSec / 60), 'minute')
  else if (abs < 86400) relative = rtf.format(Math.round(diffSec / 3600), 'hour')
  else if (abs < 2592000) relative = rtf.format(Math.round(diffSec / 86400), 'day')
  else if (abs < 31536000) relative = rtf.format(Math.round(diffSec / 2592000), 'month')
  else relative = rtf.format(Math.round(diffSec / 31536000), 'year')

  return capitalizeFirstLetter(relative)
}
</script>

<template>
  <span v-if="show" class="morelike-playground__edit-meta">
    <template v-if="when && who">
      {{ when }} by <span class="morelike-playground__editor">{{ who }}</span>
    </template>
    <template v-else-if="when">{{ when }}</template>
    <template v-else><span class="morelike-playground__editor">{{ who }}</span></template>
  </span>
</template>

