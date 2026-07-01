import { onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'

import {
  carouselImageDedupeKey,
  createCommonsPhotosFeedCursor,
  fetchCommonsPhotosBatch,
  normalizeFileTitle,
  resolveCommonsCategory,
  type CommonsPhotosFeedCursor,
} from './data/commonsImages'
import type { CarouselImage, MusicalGroupData } from './data/types'

function seedSeenKeys(data: MusicalGroupData, carouselImages: CarouselImage[]): Set<string> {
  const seen = new Set<string>()

  if (data.imageFilename) {
    seen.add(normalizeFileTitle(data.imageFilename))
  }

  for (const image of carouselImages) {
    seen.add(carouselImageDedupeKey(image))
  }

  return seen
}

function feedSourceFromData(data: MusicalGroupData) {
  const category = resolveCommonsCategory(data) ?? null
  return {
    imageFilename: data.imageFilename ?? null,
    commonsCategory: category,
    label: data.label,
  }
}

function dedupeCarouselImages(images: CarouselImage[]): CarouselImage[] {
  const seen = new Set<string>()
  const unique: CarouselImage[] = []

  for (const image of images) {
    const key = carouselImageDedupeKey(image)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(image)
  }

  return unique
}

export function useCommonsPhotosFeed(data: Ref<MusicalGroupData>, active: Ref<boolean>) {
  const images = ref<CarouselImage[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)

  const seenKeys = shallowRef(new Set<string>())
  let cursor: CommonsPhotosFeedCursor | null = null
  let fetchAbort: AbortController | null = null
  let loadedForDataId: string | null = null

  function resetFeed(nextData: MusicalGroupData) {
    fetchAbort?.abort()
    fetchAbort = null

    images.value = dedupeCarouselImages([...nextData.images])
    seenKeys.value = seedSeenKeys(nextData, nextData.images)
    cursor = createCommonsPhotosFeedCursor(feedSourceFromData(nextData), { categoryOnly: true })
    hasMore.value = true
    loading.value = false
    error.value = null
    loadedForDataId = nextData.id
  }

  async function loadMore() {
    if (!active.value || loading.value || !hasMore.value || !cursor) return

    fetchAbort?.abort()
    fetchAbort = new AbortController()

    loading.value = true
    error.value = null

    try {
      const source = feedSourceFromData(data.value)
      const batch = await fetchCommonsPhotosBatch(source, cursor, {
        seenTitles: seenKeys.value,
        signal: fetchAbort.signal,
      })

      cursor = batch.cursor
      hasMore.value = batch.hasMore

      if (batch.images.length) {
        const nextSeen = new Set(seenKeys.value)
        const fresh: CarouselImage[] = []

        for (const image of batch.images) {
          const key = carouselImageDedupeKey(image)
          if (nextSeen.has(key)) continue
          nextSeen.add(key)
          fresh.push(image)
        }

        seenKeys.value = nextSeen
        if (fresh.length) {
          images.value = dedupeCarouselImages([...images.value, ...fresh])
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load more images.'
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [data.value.id, active.value] as const,
    ([dataId, isActive], oldValue) => {
      const prevDataId = oldValue?.[0]

      if (dataId !== prevDataId) {
        loadedForDataId = null
      }

      if (!isActive) {
        fetchAbort?.abort()
        fetchAbort = null
        loading.value = false
        return
      }

      if (loadedForDataId === dataId && images.value.length > 0) {
        return
      }

      resetFeed(data.value)
      void loadMore()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    fetchAbort?.abort()
  })

  return {
    images,
    loading,
    hasMore,
    error,
    loadMore,
  }
}

export function useCommonsPhotosInfiniteScroll(options: {
  sentinel: Ref<HTMLElement | null>
  active: Ref<boolean>
  hasMore: Ref<boolean>
  loading: Ref<boolean>
  loadMore: () => void | Promise<void>
}) {
  let observer: IntersectionObserver | null = null
  let scrollRoot: HTMLElement | null = null

  function disconnect() {
    observer?.disconnect()
    observer = null
    scrollRoot?.removeEventListener('scroll', onScroll)
    scrollRoot = null
  }

  function sentinelNearViewport(): boolean {
    const target = options.sentinel.value
    if (!scrollRoot || !target) return false

    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    return targetRect.top <= rootRect.bottom + 120
  }

  function nearScrollEnd(): boolean {
    if (!scrollRoot) return false
    return (
      scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 160
    )
  }

  function maybeLoadMore() {
    if (!options.active.value || options.loading.value || !options.hasMore.value) return
    if (!sentinelNearViewport() && !nearScrollEnd()) return
    void options.loadMore()
  }

  function onScroll() {
    maybeLoadMore()
  }

  function connect() {
    disconnect()

    scrollRoot = document.querySelector('.musical-group-page') as HTMLElement | null
    const target = options.sentinel.value
    if (!scrollRoot || !target || !options.active.value) return

    scrollRoot.addEventListener('scroll', onScroll, { passive: true })

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        maybeLoadMore()
      },
      { root: scrollRoot, rootMargin: '120px' },
    )

    observer.observe(target)

    requestAnimationFrame(() => {
      maybeLoadMore()
    })
  }

  watch(
    [options.sentinel, options.active],
    () => {
      if (options.active.value) {
        connect()
      } else {
        disconnect()
      }
    },
    { flush: 'post' },
  )

  watch(
    () => options.loading.value,
    (isLoading, wasLoading) => {
      if (!wasLoading || isLoading) return
      requestAnimationFrame(() => {
        maybeLoadMore()
      })
    },
  )

  onUnmounted(disconnect)
}
