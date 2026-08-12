import { computed, watch, type ComputedRef } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { useRealUserImpact } from '../../template-homepage/impact/data/useRealUserImpact'
import type { ImpactData } from '../../template-homepage/impact/data/impactTypes'
import { WIKITA_LITE_IMPACT, WIKITA_LITE_IMPACT_FULL } from '../data/impactFixtures'

type ImpactModuleBind = ImpactData & {
  empty?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  loadPending?: boolean
}

function shouldShowLoadPrompt(hasStarted: boolean, hasRenderableData: boolean): boolean {
  return !hasStarted && !hasRenderableData
}

function isImpactEmpty(user: string, hasRenderableData: boolean): boolean {
  if (user === 'experienced') return false
  if (user === 'real') return !hasRenderableData
  return true
}

export function useWikitaLiteImpact(): {
  showImpact: ComputedRef<boolean>
  impactCardProps: ComputedRef<ImpactModuleBind>
  impactPageProps: ComputedRef<ImpactModuleBind>
  showRealRefresh: ComputedRef<boolean>
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

  const showImpact = computed(() => user.value !== 'logged-out')

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

  const impactCardProps = computed((): ImpactModuleBind => {
    if (user.value === 'experienced') {
      return {
        ...WIKITA_LITE_IMPACT,
        sparklineData: [...WIKITA_LITE_IMPACT.sparklineData],
        empty: false,
      }
    }
    if (user.value === 'real') {
      return {
        ...realUserBind(),
        empty: isImpactEmpty(user.value, realImpact.hasRenderableData.value),
      }
    }
    return { empty: true }
  })

  const impactPageProps = computed((): ImpactModuleBind => {
    if (user.value === 'experienced') {
      return { ...WIKITA_LITE_IMPACT_FULL, empty: false }
    }
    if (user.value === 'real') {
      return {
        ...realUserBind(),
        empty: isImpactEmpty(user.value, realImpact.hasRenderableData.value),
      }
    }
    return { empty: true }
  })

  const showRealRefresh = computed(
    () =>
      user.value === 'real' &&
      realImpact.hasRenderableData.value &&
      !shouldShowLoadPrompt(realImpact.hasStarted.value, realImpact.hasRenderableData.value),
  )

  function onImpactRefresh(): void {
    if (user.value === 'real') {
      void realImpact.refresh()
    }
  }

  return {
    showImpact,
    impactCardProps,
    impactPageProps,
    showRealRefresh,
    onImpactRefresh,
  }
}
