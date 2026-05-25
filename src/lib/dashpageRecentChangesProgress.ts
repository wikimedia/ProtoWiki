import { ref } from 'vue'

const viewedRevisionIds = ref<Set<number>>(new Set())

function createDashpageRecentChangesProgress() {
  function isRevisionViewed(revId: number): boolean {
    return viewedRevisionIds.value.has(revId)
  }

  function markRevisionAsViewed(revId: number): void {
    if (viewedRevisionIds.value.has(revId)) return
    viewedRevisionIds.value = new Set([...viewedRevisionIds.value, revId])
  }

  return {
    viewedRevisionIds,
    isRevisionViewed,
    markRevisionAsViewed,
  }
}

let progressInstance: ReturnType<typeof createDashpageRecentChangesProgress> | null = null

export function useDashpageRecentChangesProgress() {
  if (!progressInstance) {
    progressInstance = createDashpageRecentChangesProgress()
  }
  return progressInstance
}
