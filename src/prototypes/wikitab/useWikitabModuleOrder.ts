import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  loadWikitabConfig,
  normalizeModuleOrderIds,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { resolveModuleOrder, type WikitabModuleId } from './sections'

/**
 * Pinned modules first (in configured module order), then unpinned modules in
 * the same order. Membership comes from `pinnedIds`; relative order among
 * pinned items follows `baseOrder`, not pin recency.
 */
export function buildEffectiveHomeOrder(
  pinnedIds: readonly WikitabModuleId[],
  baseOrder: readonly WikitabModuleId[],
): WikitabModuleId[] {
  const pinnedSet = new Set<WikitabModuleId>(pinnedIds)
  const order: WikitabModuleId[] = []
  const seen = new Set<WikitabModuleId>()

  for (const id of baseOrder) {
    if (!pinnedSet.has(id)) continue
    order.push(id)
    seen.add(id)
  }

  for (const id of pinnedIds) {
    if (seen.has(id)) continue
    order.push(id)
    seen.add(id)
  }

  for (const id of baseOrder) {
    if (pinnedSet.has(id)) continue
    order.push(id)
  }

  return order
}

export function useWikitabModuleOrder() {
  const moduleOrderIds = ref<WikitabModuleId[]>(
    normalizeModuleOrderIds(loadWikitabConfig().moduleOrderIds),
  )

  const resolvedOrder = computed(() => resolveModuleOrder(moduleOrderIds.value))

  function syncFromStorage(): void {
    moduleOrderIds.value = normalizeModuleOrderIds(loadWikitabConfig().moduleOrderIds)
  }

  function setModuleOrder(order: WikitabModuleId[]): void {
    moduleOrderIds.value = normalizeModuleOrderIds(order)
    patchWikitabConfig({ moduleOrderIds: moduleOrderIds.value })
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY) return
    syncFromStorage()
  }

  onMounted(() => {
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage)
  })

  return { moduleOrderIds, resolvedOrder, setModuleOrder }
}
