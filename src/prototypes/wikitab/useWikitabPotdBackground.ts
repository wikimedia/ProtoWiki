import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  fetchPictureOfTheDay,
  type WikitabPotd,
} from './data/fetchPictureOfTheDay'
import { isCacheBypassed, utcDayKey } from './data/feedCache'

const EMPTY_POTD: WikitabPotd = {
  thumbnailUrl: null,
  href: '',
  descriptionHtml: '',
  artistHtml: '',
  licenseType: '',
  licenseUrl: '',
}

export function useWikitabPotdBackground() {
  const potd = ref<WikitabPotd>({ ...EMPTY_POTD })
  const potdLoading = ref(true)

  const potdImageUrl = computed(() => potd.value.thumbnailUrl)

  let abortController: AbortController | null = null
  let loadedDay = ''

  async function loadPotd(day = utcDayKey()): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    potdLoading.value = true
    try {
      potd.value = await fetchPictureOfTheDay(day, signal)
      loadedDay = day
    } catch {
      if (!signal.aborted) {
        potd.value = { ...EMPTY_POTD }
        loadedDay = day
      }
    } finally {
      if (!signal.aborted) {
        potdLoading.value = false
      }
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState !== 'visible') return
    const day = utcDayKey()
    if (day !== loadedDay || isCacheBypassed()) {
      void loadPotd(day)
    }
  }

  onMounted(() => {
    void loadPotd()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    abortController?.abort()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { potd, potdImageUrl, potdLoading, reloadPotd: loadPotd }
}
