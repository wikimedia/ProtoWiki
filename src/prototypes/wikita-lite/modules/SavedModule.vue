<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxCard, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconBookmark, cdxIconBookmarkOutline } from '@wikimedia/codex-icons'

import type { HomeSavedItem } from '../../musical-group/data/types'
import { savedItemHref } from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { useWikitaLiteOverflowShowMore } from '../composables/useWikitaLiteOverflowShowMore'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeSavedItem[]
  loading?: boolean
  previewLimit?: number
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 5,
  moreTo: undefined,
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

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

const showMoreLink = useWikitaLiteOverflowShowMore({
  standalone: () => props.standalone,
  moreTo: () => props.moreTo,
  hasItems: () => displayItems.value.length > 0,
})
</script>

<template>
  <div class="saved-module">
    <CdxProgressBar v-if="standalone && loading" inline aria-label="Loading saved pages" />

    <template v-else>
      <template v-if="displayItems.length">
        <div :class="['saved-module__cards', groupClass]">
          <CdxCard
            v-for="item in displayItems"
            :key="item.id"
            :class="[WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE, cardClass]"
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
            <WikitaLiteSupportingRow :icon="cdxIconBookmark">
              {{ formatSavedLabel(item.savedAt) }}
            </WikitaLiteSupportingRow>
          </template>
          </CdxCard>
        </div>

        <slot name="after-cards" />

        <RouterLink
          v-if="showMoreLink && moreTo"
          :to="moreTo"
          class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled wikita-lite-button-link"
        >
          Show more saved
        </RouterLink>
      </template>

      <p v-else class="saved-module__empty">
        Use the save icon
        <CdxIcon :icon="cdxIconBookmarkOutline" class="saved-module__empty-icon" />
        on any page to add items.
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

.saved-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.saved-module__empty {
  margin: 0;
  padding-bottom: var(--spacing-50, 8px);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.saved-module__empty-icon {
  display: inline-block;
  vertical-align: text-bottom;
  color: var(--color-subtle, #54595d);
}

.saved-module__empty-icon :deep(svg path) {
  fill: currentColor;
}
</style>
