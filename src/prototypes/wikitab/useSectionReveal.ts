import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import { resolveDykThumbnails } from './data/resolveDykThumbnails'
import { preloadImages } from './preloadImages'
import type { WikitabCardData, WikitabSectionSpec } from './sections'

/**
 * How much of a section is reserved on screen versus actually paintable.
 *
 * `reserved` slots always render — as a card when its index is below `ready`,
 * and as a fixed-height placeholder otherwise. Revealing a page raises
 * `reserved` immediately and `ready` only once that page has fully resolved, so
 * a scroll gesture always has somewhere to go and the layout never shifts.
 */
export function useSectionReveal(
  spec: Pick<WikitabSectionSpec, 'initialCount' | 'pageSize'>,
  items: Ref<WikitabCardData[]>,
  /** When true and `items` is still empty, reserve initial skeleton slots (feed + home modules). */
  loading?: Ref<boolean>,
) {
  const reserved = ref(spec.initialCount)
  const ready = ref(0)
  const revealing = ref(false)

  const controller = new AbortController()
  onUnmounted(() => controller.abort())

  const hasMore = computed(() => items.value.length > reserved.value)

  function applyEmptyListState(): void {
    if (loading?.value) {
      reserved.value = spec.initialCount
      ready.value = 0
    } else {
      reserved.value = 0
      ready.value = 0
    }
  }

  async function prepare(from: number, to: number): Promise<void> {
    revealing.value = true
    const page = items.value.slice(from, to)

    try {
      // A no-op unless the page carries thumbnail titles, as DYK hooks do.
      await resolveDykThumbnails(page, controller.signal)
      if (controller.signal.aborted) return
      await preloadImages(page.map((card) => card.thumbnailUrl))
      if (controller.signal.aborted) return
      ready.value = to
    } catch (cause) {
      if ((cause as Error)?.name === 'AbortError') return
      // Thumbnails are decoration — reveal the page's text regardless.
      ready.value = to
    } finally {
      if (!controller.signal.aborted) revealing.value = false
    }
  }

  /** Re-entry guard: a fast flick must not queue several pages at once. */
  function revealMore(): void {
    if (revealing.value || !hasMore.value) return
    const from = reserved.value
    const to = Math.min(items.value.length, from + spec.pageSize)
    reserved.value = to
    void prepare(from, to)
  }

  watch(
    items,
    (list, prevList) => {
      if (!list.length) {
        applyEmptyListState()
        return
      }

      const prevLength = prevList?.length ?? 0

      if (list.length < reserved.value) {
        // Items removed — drop reserved slots that no longer exist.
        reserved.value = list.length
      } else if (list.length > prevLength && reserved.value >= prevLength) {
        // Was showing the full list; reveal new items without requiring "Show more".
        reserved.value =
          prevLength < spec.initialCount
            ? Math.min(spec.initialCount, list.length)
            : list.length
      } else {
        // First paint, or the list grew but some slots were still unrevealed.
        reserved.value = Math.min(reserved.value, list.length)
      }

      ready.value = 0
      void prepare(0, reserved.value)
    },
    { immediate: true },
  )

  if (loading) {
    watch(loading, () => {
      if (!items.value.length) applyEmptyListState()
    })
  }

  return { reserved, ready, revealing, hasMore, revealMore }
}
