<script setup lang="ts">
import { computed } from 'vue'

import { CdxCard, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconBookmark } from '@wikimedia/codex-icons'

import type { HomeSavedItem } from '../../musical-group/data/types'
import { savedItemHref } from '../composables/useWikitaLiteCardActions'

interface Props {
  standalone?: boolean
  items?: HomeSavedItem[]
  loading?: boolean
  previewLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 5,
})

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

function formatSavedLabel(savedAt: number): string {
  const diffMs = Date.now() - savedAt
  if (diffMs < 60_000) return 'Saved just now'

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) {
    return minutes === 1 ? 'Saved 1 min ago' : `Saved ${minutes} mins ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return hours === 1 ? 'Saved 1 hour ago' : `Saved ${hours} hours ago`
  }

  const days = Math.floor(hours / 24)
  return days === 1 ? 'Saved 1 day ago' : `Saved ${days} days ago`
}
</script>

<template>
  <div class="saved-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading saved pages" />

    <template v-else>
      <CdxCard
        v-for="item in displayItems"
        :key="item.id"
        :url="savedItemHref(item)"
        :thumbnail="cardThumbnail(item.thumbnailUrl)"
        :force-thumbnail="true"
      >
        <template #title>
          {{ item.title }}
        </template>
        <template v-if="item.description" #description>
          {{ item.description }}
        </template>
        <template #supporting-text>
          <CdxIcon :icon="cdxIconBookmark" size="small" />
          {{ formatSavedLabel(item.savedAt) }}
        </template>
      </CdxCard>

      <p v-if="standalone && !displayItems.length && !loading" class="saved-module__empty">
        You have not saved any pages yet.
      </p>
    </template>
  </div>
</template>

<style scoped>
.saved-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.saved-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
