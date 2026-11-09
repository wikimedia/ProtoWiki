import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { WIKITAB_LANGUAGE } from './data/wikitabLanguage'

/**
 * Dismissed edits on this page load's wiki. Stored per language
 * (`config.dismissedActivityRevids[lang]`) because revision ids are per-wiki.
 */
export function useWikitabDismissedActivity(lang: string = WIKITAB_LANGUAGE) {
  const readDismissed = (): number[] => loadWikitabConfig().dismissedActivityRevids[lang] ?? []

  const dismissedRevids = ref<number[]>(readDismissed())

  const dismissedSet = computed(() => new Set(dismissedRevids.value))

  function syncFromStorage(): void {
    const next = readDismissed()
    // Skip no-op syncs so watchers (and their cache writes) only fire on real changes.
    if (
      next.length === dismissedRevids.value.length &&
      next.every((id) => dismissedSet.value.has(id))
    ) {
      return
    }
    dismissedRevids.value = next
  }

  function isDismissed(revid: number): boolean {
    return dismissedSet.value.has(revid)
  }

  function dismissActivity(revid: number): void {
    if (!Number.isInteger(revid) || revid <= 0 || dismissedSet.value.has(revid)) return

    dismissedRevids.value = [...dismissedRevids.value, revid]
    patchWikitabConfig({
      dismissedActivityRevids: {
        ...loadWikitabConfig().dismissedActivityRevids,
        [lang]: dismissedRevids.value,
      },
    })
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

  return { dismissedRevids, dismissedSet, isDismissed, dismissActivity }
}
