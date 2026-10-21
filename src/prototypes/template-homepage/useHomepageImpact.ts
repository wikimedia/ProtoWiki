import { computed, type ComputedRef } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { useRealUserImpact } from './impact/data/useRealUserImpact'
import type { ImpactData } from './impact/data/impactTypes'
import { IMPACT, IMPACT_DESKTOP, IMPACT_PAGE } from './dashpage-fixtures'

type ImpactModuleBind = ImpactData & {
  to?: typeof IMPACT_PAGE
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  loadPending?: boolean
}

function shouldShowLoadPrompt(hasStarted: boolean, hasRenderableData: boolean): boolean {
  return !hasStarted && !hasRenderableData
}

export function useHomepageImpact(): {
  impactMobileProps: ComputedRef<ImpactModuleBind>
  impactDesktopProps: ComputedRef<ImpactModuleBind>
  onImpactRefresh: () => void
} {
  const { user, realUsername, realLang } = useConfig()
  const realImpact = useRealUserImpact(realUsername, realLang)

  function realUserBind(): ImpactModuleBind {
    if (shouldShowLoadPrompt(realImpact.hasStarted.value, realImpact.hasRenderableData.value)) {
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
      return { to: IMPACT_PAGE, ...IMPACT, sparklineData: [...IMPACT.sparklineData] }
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
