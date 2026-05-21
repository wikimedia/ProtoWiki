import { computed, watch, type ComputedRef } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { useRealUserImpact } from '@/composables/useRealUserImpact'
import type { ImpactData } from '@/lib/impactTypes'
import { IMPACT, IMPACT_DESKTOP, IMPACT_PAGE } from './dashpage-fixtures'

type ImpactModuleBind = ImpactData & {
  to?: typeof IMPACT_PAGE
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  loadPending?: boolean
}

function realImpactHasPreview(data: ImpactData): boolean {
  return (
    !!data.viewCount ||
    (data.totalEdits ?? 0) > 0 ||
    (data.recentActivityData ?? []).some((v) => v > 0)
  )
}

export function useHomepageImpact(): {
  impactMobileProps: ComputedRef<ImpactModuleBind>
  impactDesktopProps: ComputedRef<ImpactModuleBind>
  onImpactRefresh: () => void
} {
  const { user, realUsername, setCurrentUserPageList } = useConfig()
  const realImpact = useRealUserImpact(realUsername)

  watch(
    [() => user.value, realImpact.editedPageTitles],
    ([activeUser, titles]) => {
      if (activeUser === 'real' && titles.length > 0) {
        setCurrentUserPageList('editedPages', [...titles])
      }
    },
    { immediate: true },
  )

  const impactMobileProps = computed((): ImpactModuleBind => {
    if (user.value === 'experienced') {
      return { to: IMPACT_PAGE, ...IMPACT }
    }
    if (user.value === 'real') {
      if (!realImpact.hasCache.value) {
        return {
          to: IMPACT_PAGE,
          loadPending: true,
          refreshing: realImpact.loading.value,
          refreshError: realImpact.error.value,
        }
      }
      const data = realImpact.impactProps.value
      if (realImpactHasPreview(data)) {
        return { to: IMPACT_PAGE, ...data }
      }
      return { to: IMPACT_PAGE }
    }
    return { to: IMPACT_PAGE }
  })

  const impactDesktopProps = computed((): ImpactModuleBind => {
    if (user.value === 'experienced') {
      return { ...IMPACT_DESKTOP }
    }
    if (user.value === 'real') {
      if (!realImpact.hasCache.value) {
        return {
          loadPending: true,
          refreshing: realImpact.loading.value,
          refreshError: realImpact.error.value,
        }
      }
      return {
        ...realImpact.impactProps.value,
        showRefresh: true,
        refreshing: realImpact.loading.value,
        refreshError: realImpact.error.value,
      }
    }
    return {}
  })

  function onImpactRefresh(): void {
    if (user.value === 'real') {
      void realImpact.refresh()
    }
  }

  return {
    impactMobileProps,
    impactDesktopProps,
    onImpactRefresh,
  }
}
