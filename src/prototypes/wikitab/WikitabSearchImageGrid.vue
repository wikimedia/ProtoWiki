<script setup lang="ts">
import { computed, ref, type ComponentPublicInstance } from 'vue'

import WikitabSearchImageCard from './WikitabSearchImageCard.vue'
import WikitabSearchLoadingCard from './WikitabSearchLoadingCard.vue'
import { useInfiniteScrollMany } from './useInfiniteScrollMany'
import { distributeImagesToColumns } from './useWikitabSearchImageColumns'
import { useWikitabSearchImageDecode } from './useWikitabSearchImageDecode'
import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'
import {
  fetchingTailSlotCountsPerColumn,
  imageAspectRatio,
  WIKITAB_IMAGE_FETCHING_ASPECT_RATIO,
  type WikitabSearchImageColumnSlot,
} from './wikitabSearchImageSkeletons'

const props = withDefaults(
  defineProps<{
    images: WikitabSearchImage[]
    columnCount: number
    loadingMore?: boolean
    scrollEnabled?: boolean
  }>(),
  {
    loadingMore: false,
    scrollEnabled: false,
  },
)

const emit = defineEmits<{
  reach: []
}>()

const columnSentinels = ref<(HTMLElement | null)[]>([])
const { decodedPageIds, isDecoded, markDecoded } = useWikitabSearchImageDecode()

const columnSlots = computed(() => {
  const count = Math.max(1, props.columnCount)
  const imageColumns = distributeImagesToColumns(props.images, count)
  const fetchingCounts = fetchingTailSlotCountsPerColumn(count, props.loadingMore)

  return imageColumns.map((images, columnIndex) => {
    const slots: WikitabSearchImageColumnSlot[] = images.map((image) => ({
      kind: 'image',
      image,
    }))

    for (let index = 0; index < fetchingCounts[columnIndex]; index++) {
      slots.push({
        kind: 'fetching',
        id: `fetch-${columnIndex}-${index}`,
        aspectRatio: WIKITAB_IMAGE_FETCHING_ASPECT_RATIO,
      })
    }

    return slots
  })
})

function isSlotRevealed(column: WikitabSearchImageColumnSlot[], slotIndex: number): boolean {
  void decodedPageIds.value

  for (let index = 0; index < slotIndex; index++) {
    const slot = column[index]
    if (slot.kind === 'image' && !isDecoded(slot.image.pageid)) return false
  }

  return true
}

function slotAspectRatio(slot: WikitabSearchImageColumnSlot): string {
  if (slot.kind === 'image') return imageAspectRatio(slot.image)
  return slot.aspectRatio
}

function slotKey(slot: WikitabSearchImageColumnSlot): string {
  if (slot.kind === 'image') return `img-${slot.image.pageid}`
  return slot.id
}

const scrollEnabledRef = computed(() => props.scrollEnabled)

useInfiniteScrollMany({
  sentinels: columnSentinels,
  enabled: scrollEnabledRef,
  onReach: () => {
    emit('reach')
  },
})

function resolveSentinelElement(
  el: Element | ComponentPublicInstance | null,
): HTMLElement | null {
  if (el instanceof HTMLElement) return el
  if (el && typeof el === 'object' && '$el' in el) {
    const node = (el as ComponentPublicInstance).$el
    return node instanceof HTMLElement ? node : null
  }
  return null
}

function setColumnSentinel(columnIndex: number, el: Element | ComponentPublicInstance | null) {
  const resolved = resolveSentinelElement(el)
  if (columnSentinels.value[columnIndex] === resolved) return

  const next = columnSentinels.value.slice()
  next[columnIndex] = resolved
  columnSentinels.value = next
}
</script>

<template>
  <div
    class="wikitab-search-image-grid"
    :style="{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }"
  >
    <div
      v-for="(column, columnIndex) in columnSlots"
      :key="columnIndex"
      class="wikitab-search-image-grid__column"
    >
      <template v-for="(slot, slotIndex) in column" :key="slotKey(slot)">
        <WikitabSearchImageCard
          v-if="slot.kind === 'image' && isSlotRevealed(column, slotIndex)"
          :image="slot.image"
          @decoded="markDecoded(slot.image.pageid)"
        />
        <WikitabSearchLoadingCard
          v-else
          variant="image"
          :aspect-ratio="slotAspectRatio(slot)"
        />
      </template>

      <div
        :ref="(el) => setColumnSentinel(columnIndex, el)"
        class="wikitab-search-image-grid__sentinel"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.wikitab-search-image-grid {
  display: grid;
  gap: 2px;
  width: 100%;
}

.wikitab-search-image-grid__column {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.wikitab-search-image-grid__sentinel {
  height: 1px;
}
</style>
