import { ref, watch, type Ref } from 'vue'

import { PhotoGridLayoutState, type PhotoGridRow } from './photosGridLayout'
import type { CarouselImage } from './data/types'

function imageListIdentity(images: CarouselImage[]): string {
  const first = images[0]
  return `${images.length}:${first?.title ?? first?.url ?? ''}`
}

export function usePhotosGridLayout(images: Ref<CarouselImage[]>, hasMore: Ref<boolean>) {
  const rows = ref<PhotoGridRow[]>([])
  const state = new PhotoGridLayoutState()
  let committedLength = 0
  let lastIdentity = ''

  function syncFromImages() {
    const identity = imageListIdentity(images.value)

    if (identity !== lastIdentity && images.value.length <= committedLength) {
      state.reset()
      committedLength = 0
    }

    lastIdentity = identity

    const pending = images.value.slice(committedLength)
    if (pending.length) {
      state.appendImages(pending)
      committedLength = images.value.length
    }

    if (!hasMore.value) {
      state.flush()
    }

    rows.value = [...state.rows]
  }

  watch([images, hasMore], syncFromImages, { immediate: true })

  return { rows }
}
