import { onMounted, onUnmounted, ref } from 'vue'
import { readPinnedFromUrl, writePinnedToUrl } from './pinnedUrl'
import type { WikitabSectionId } from './sections'
import type { WikitabSectionState } from './useWikitabFeed'

export function useWikitabPinned() {
  const pinnedIds = ref<WikitabSectionId[]>(readPinnedFromUrl())

  function syncFromUrl(): void {
    pinnedIds.value = readPinnedFromUrl()
  }

  function isPinned(id: WikitabSectionId): boolean {
    return pinnedIds.value.includes(id)
  }

  function togglePin(id: WikitabSectionId): void {
    if (isPinned(id)) {
      pinnedIds.value = pinnedIds.value.filter((pinnedId) => pinnedId !== id)
    } else {
      pinnedIds.value = [id, ...pinnedIds.value.filter((pinnedId) => pinnedId !== id)]
    }

    writePinnedToUrl(pinnedIds.value)
  }

  function orderSections(sections: WikitabSectionState[]): WikitabSectionState[] {
    const pinnedSet = new Set(pinnedIds.value)
    const pinned = pinnedIds.value
      .map((id) => sections.find((section) => section.spec.id === id))
      .filter((section): section is WikitabSectionState => section !== undefined)
    const unpinned = sections.filter((section) => !pinnedSet.has(section.spec.id))

    return [...pinned, ...unpinned]
  }

  onMounted(() => {
    window.addEventListener('popstate', syncFromUrl)
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', syncFromUrl)
  })

  return { pinnedIds, isPinned, togglePin, orderSections }
}
