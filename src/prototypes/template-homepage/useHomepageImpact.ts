import { computed, watch, type ComputedRef } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { useRealUserImpact } from '@/composables/useRealUserImpact'
import { shouldShowDashpageLoadPrompt } from '@/lib/dashpageLoadState'
import type { ImpactData } from '@/lib/impactTypes'
import { IMPACT, IMPACT_DESKTOP, IMPACT_PAGE } from './dashpage-fixtures'

type ImpactModuleBind = ImpactData & {
  to?: typeof IMPACT_PAGE
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  loadPending?: boolean
}

export function useHomepageImpact(): {
  impactMobileProps: ComputedRef<ImpactModuleBind>
  impactDesktopProps: ComputedRef<ImpactModuleBind>
  onImpactRefresh: () => void
} {
  const { user, realUsername, realLang, setCurrentUserPageList } = useConfig()
  const realImpact = useRealUserImpact(realUsername, realLang)

  watch(
    [() => user.value, realImpact.editedPageTitles],
    ([activeUser, titles]) => {
      if (activeUser === 'real' && titles.length > 0) {
        setCurrentUserPageList('editedPages', [...titles])
      }
    },
    { immediate: true },
  )

  function realUserBind(): ImpactModuleBind {
    if (
      shouldShowDashpageLoadPrompt(
        realImpact.hasStarted.value,
        realImpact.hasRenderableData.value,
      )
    ) {
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

  const impactMobileProps = computed((): ImpactModuleBind => {
    if (user.value === 'experienced') {
      return { to: IMPACT_PAGE, ...IMPACT }
    }
    if (user.value === 'real') {
      return { to: IMPACT_PAGE, ...realUserBind() }
    }
    return { to: IMPACT_PAGE }
  })

  const impactDesktopProps = computed((): ImpactModuleBind => {
    if (user.value === 'experienced') {
      return { ...IMPACT_DESKTOP }
    }
    if (user.value === 'real') {
      return realUserBind()
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
