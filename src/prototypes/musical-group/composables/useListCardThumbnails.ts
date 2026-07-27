import { computed, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { UserList } from '../data/lists'
import {
  fetchMissingListItemThumbnails,
  resolveListThumbnailUrls,
} from '../data/resolveListThumbnailUrls'

export interface ListCard {
  list: UserList
  thumbnailUrl?: string
}

export function useListCardThumbnails(
  lists: Ref<UserList[]> | ComputedRef<UserList[]>,
  options: { active?: Ref<boolean> } = {},
): { listCards: ComputedRef<ListCard[]> } {
  const thumbnailRevision = ref(0)
  let thumbnailAbort: AbortController | null = null

  async function loadMissingThumbnails(): Promise<void> {
    thumbnailAbort?.abort()
    thumbnailAbort = new AbortController()
    const { signal } = thumbnailAbort

    const firstItemIds = lists.value
      .map((list) => list.itemIds[0])
      .filter((id): id is string => Boolean(id))
    const known = lists.value.reduce<Record<string, string>>((acc, list) => {
      if (list.itemIds[0] && list.thumbnailUrl) {
        acc[list.itemIds[0]] = list.thumbnailUrl
      }
      return acc
    }, {})

    try {
      const resolved = await fetchMissingListItemThumbnails(firstItemIds, known, signal)
      if (signal.aborted) return
      if (Object.keys(resolved).length) thumbnailRevision.value += 1
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }

  function listThumbnailUrl(list: UserList): string | undefined {
    void thumbnailRevision.value
    return resolveListThumbnailUrls(list.itemIds, list.thumbnailUrl)[0]
  }

  const listCards = computed(() =>
    lists.value.map((list) => ({
      list,
      thumbnailUrl: listThumbnailUrl(list),
    })),
  )

  if (options.active) {
    watch(
      [options.active, lists],
      ([active]) => {
        if (!active) {
          thumbnailAbort?.abort()
          return
        }
        void loadMissingThumbnails()
      },
      { immediate: true },
    )
  } else {
    watch(lists, () => void loadMissingThumbnails(), { immediate: true })
  }

  onUnmounted(() => {
    thumbnailAbort?.abort()
  })

  return { listCards }
}
