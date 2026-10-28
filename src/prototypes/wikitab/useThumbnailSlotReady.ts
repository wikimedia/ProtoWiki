import { computed, onUnmounted, ref, watch, type Ref } from 'vue'

/** One dead image must not leave a slot stuck. */
export const THUMBNAIL_DECODE_TIMEOUT_MS = 1500

/**
 * Tracks background thumbnail decode for thumbnail-slot loading.
 * Does not gate rendering — cards paint immediately with a pending placeholder.
 */
export function useThumbnailSlotReady(thumbnailUrl: Ref<string | undefined>) {
  const decoded = ref(!thumbnailUrl.value)
  const failed = ref(false)

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

      failed.value = false

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
      image.onerror = () => {
        failed.value = true
        finish()
      }
      image.src = url
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  /** True only while a URL exists and the image has not finished decoding. */
  const showThumbnailPending = computed(() => Boolean(thumbnailUrl.value) && !decoded.value)

  /** The URL could not be loaded — Codex's broken-image placeholder is the honest state. */
  const thumbnailFailed = computed(() => Boolean(thumbnailUrl.value) && failed.value)

  return { showThumbnailPending, thumbnailFailed }
}
