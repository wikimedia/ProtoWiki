<script setup lang="ts">
import { ref, toRef } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import { commonsFilePageUrl } from './data/commonsImages'
import type { MusicalGroupData } from './data/types'
import { pairCellStyle, photoCellStyle, photoGridRowKey } from './photosGridLayout'
import { useCommonsPhotosFeed, useCommonsPhotosInfiniteScroll } from './useCommonsPhotosFeed'
import { usePhotosGridLayout } from './usePhotosGridLayout'

interface Props {
  data: MusicalGroupData
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
})

const dataRef = toRef(props, 'data')
const activeRef = toRef(props, 'active')
const sentinelRef = ref<HTMLElement | null>(null)

const { images, loading, hasMore, error, loadMore } = useCommonsPhotosFeed(dataRef, activeRef)
const { rows } = usePhotosGridLayout(images, hasMore)

useCommonsPhotosInfiniteScroll({
  sentinel: sentinelRef,
  active: activeRef,
  hasMore,
  loading,
  loadMore,
})

function cellHref(title?: string) {
  return title ? commonsFilePageUrl(title) : undefined
}
</script>

<template>
  <div class="musical-group-photos">
    <p v-if="error" class="musical-group-photos__message">{{ error }}</p>

    <p v-else-if="!rows.length && !loading && !hasMore" class="musical-group-photos__message">
      No images available
    </p>

    <div v-else class="musical-group-photos__rows">
      <div
        v-for="row in rows"
        :key="photoGridRowKey(row)"
        class="musical-group-photos__row"
        :class="`musical-group-photos__row--${row.kind}`"
      >
        <template v-if="row.kind === 'full'">
          <a
            class="musical-group-photos__cell musical-group-photos__cell--full"
            :style="photoCellStyle(row.image)"
            :href="cellHref(row.image.title)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              :src="row.image.url"
              :width="row.image.width > 0 ? row.image.width : undefined"
              :height="row.image.height > 0 ? row.image.height : undefined"
              :alt="''"
              loading="lazy"
              draggable="false"
            />
          </a>
        </template>

        <template v-else-if="row.kind === 'pair'">
          <a
            class="musical-group-photos__cell musical-group-photos__cell--pair"
            :style="pairCellStyle(row.left, row.right)"
            :href="cellHref(row.left.title)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              :src="row.left.url"
              :width="row.left.width > 0 ? row.left.width : undefined"
              :height="row.left.height > 0 ? row.left.height : undefined"
              :alt="''"
              loading="lazy"
              draggable="false"
            />
          </a>
          <a
            class="musical-group-photos__cell musical-group-photos__cell--pair"
            :style="pairCellStyle(row.left, row.right)"
            :href="cellHref(row.right.title)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              :src="row.right.url"
              :width="row.right.width > 0 ? row.right.width : undefined"
              :height="row.right.height > 0 ? row.right.height : undefined"
              :alt="''"
              loading="lazy"
              draggable="false"
            />
          </a>
        </template>

        <template v-else>
          <a
            class="musical-group-photos__cell musical-group-photos__cell--single"
            :style="photoCellStyle(row.image)"
            :href="cellHref(row.image.title)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              :src="row.image.url"
              :width="row.image.width > 0 ? row.image.width : undefined"
              :height="row.image.height > 0 ? row.image.height : undefined"
              :alt="''"
              loading="lazy"
              draggable="false"
            />
          </a>
        </template>
      </div>
    </div>

    <div ref="sentinelRef" class="musical-group-photos__sentinel" aria-hidden="true" />

    <div v-if="loading" class="musical-group-photos__loading">
      <CdxProgressBar inline aria-label="Loading images" />
    </div>
  </div>
</template>

<style scoped>
.musical-group-photos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  padding-block-end: var(--spacing-50);
}

.musical-group-photos__rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.musical-group-photos__row--pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-50);
}

.musical-group-photos__cell--pair img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.musical-group-photos__cell {
  display: block;
  min-width: 0;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--background-color-interactive-subtle);
}

.musical-group-photos__cell--single {
  width: calc(50% - var(--spacing-50) / 2);
}

.musical-group-photos__cell img {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
}

.musical-group-photos__sentinel {
  height: 1px;
}

.musical-group-photos__loading {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50);
}

.musical-group-photos__message {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}
</style>
