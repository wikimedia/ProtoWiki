import { computed, onUnmounted, reactive, ref, watch, type Ref } from 'vue'
import { cardNeedsThumbnailLookup, resolveDykThumbnails } from './data/resolveDykThumbnails'
import type { WikitabCardData, WikitabCardLoading, WikitabSectionSpec } from './sections'

function itemsUnchanged(
  list: WikitabCardData[],
  prevList: WikitabCardData[] | undefined,
): boolean {
  if (list === prevList) return true
  if (!prevList || list.length !== prevList.length) return false

  for (let i = 0; i < list.length; i++) {
    if (list[i].key !== prevList[i].key) return false
    if (list[i].thumbnailUrl !== prevList[i].thumbnailUrl) return false
  }

  return true
}

/**
 * How much of a section is reserved on screen, and what each reserved slot is
 * still waiting for.
 *
 * `reserved` slots always render. Revealing a page raises `reserved`
 * immediately; each slot then paints as soon as its own data is known —
 * `slotLoading(i)` is `true` while there is no item, `{ thumbnail: true }` while
 * its DYK-style thumbnail lookup is in flight, and `false` once it is complete.
 * Thumbnail decode is handled per card by `WikitabCard`.
 */
export function useSectionReveal(
  spec: Pick<WikitabSectionSpec, 'initialCount' | 'pageSize'>,
  items: Ref<WikitabCardData[]>,
  /** When true and `items` is still empty, reserve initial skeleton slots (feed + home modules). */
  loading?: Ref<boolean>,
) {
  const reserved = ref(spec.initialCount)
  const revealing = ref(false)
  const pendingThumbnailKeys = reactive(new Set<string>())
  /** Lookup results by card key — cards are passed down by reference, so a fresh object carries them. */
  const resolvedThumbnails = reactive(new Map<string, string>())

  const controller = new AbortController()
  onUnmounted(() => controller.abort())

  const hasMore = computed(() => items.value.length > reserved.value)

  function applyEmptyListState(): void {
    reserved.value = loading?.value ? spec.initialCount : 0
  }

  async function prepare(from: number, to: number): Promise<void> {
    const page = items.value.slice(from, to).filter(cardNeedsThumbnailLookup)
    if (!page.length) return

    revealing.value = true
    for (const card of page) pendingThumbnailKeys.add(card.key)

    try {
      await resolveDykThumbnails(page, controller.signal, (card, thumbnailUrl) => {
        if (thumbnailUrl) resolvedThumbnails.set(card.key, thumbnailUrl)
        pendingThumbnailKeys.delete(card.key)
      })
    } catch (cause) {
      if ((cause as Error)?.name === 'AbortError') return
    } finally {
      if (!controller.signal.aborted) {
        // Thumbnails are decoration — a failed lookup must not hold the card back.
        for (const card of page) pendingThumbnailKeys.delete(card.key)
        revealing.value = false
      }
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

  function slotCard(index: number): WikitabCardData | undefined {
    const card = items.value[index]
    if (!card) return undefined
    const thumbnailUrl = resolvedThumbnails.get(card.key)
    return thumbnailUrl && card.thumbnailUrl !== thumbnailUrl ? { ...card, thumbnailUrl } : card
  }

  function slotLoading(index: number): WikitabCardLoading {
    const card = items.value[index]
    if (!card) return true
    return pendingThumbnailKeys.has(card.key) ? { thumbnail: true } : false
  }

  /** Changes whenever any slot's loading state does — for layout watchers. */
  const pendingCount = computed(() => pendingThumbnailKeys.size)

  watch(
    items,
    (list, prevList) => {
      if (itemsUnchanged(list, prevList)) return

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

      void prepare(0, reserved.value)
    },
    { immediate: true },
  )

  if (loading) {
    watch(loading, () => {
      if (!items.value.length) applyEmptyListState()
    })
  }

  return { reserved, revealing, hasMore, revealMore, slotCard, slotLoading, pendingCount }
}
