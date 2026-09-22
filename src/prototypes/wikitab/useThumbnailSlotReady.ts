import { computed, onUnmounted, ref, watch, type Ref } from 'vue'

/** Same cap as preloadImages — one dead image must not leave a slot stuck. */
export const THUMBNAIL_DECODE_TIMEOUT_MS = 1500

/**
 * Tracks background thumbnail decode for thumbnail-slot loading.
 * Does not gate rendering — cards paint immediately with a pending placeholder.
 */
export function useThumbnailSlotReady(thumbnailUrl: Ref<string | undefined>) {
  const decoded = ref(!thumbnailUrl.value)

  let timer: ReturnType<typeof setTimeout> | undefined
  let image: HTMLImageElement | null = null

  watch(
    thumbnailUrl,
    (url) => {
      if (timer) clearTimeout(timer)
      if (image) {
        image.onload = null
        image.onerror = null
        image = null
      }

      if (!url) {
        decoded.value = true
        return
      }

      decoded.value = false
      image = new Image()

      const finish = () => {
        if (timer) clearTimeout(timer)
        decoded.value = true
      }

      timer = setTimeout(finish, THUMBNAIL_DECODE_TIMEOUT_MS)
      image.onload = finish
      image.onerror = finish
      image.src = url
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  /** True only while a URL exists and the image has not finished decoding. */
  const showThumbnailPending = computed(() => Boolean(thumbnailUrl.value) && !decoded.value)

  return { showThumbnailPending }
}
