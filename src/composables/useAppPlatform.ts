import { computed, readonly, type ComputedRef, type DeepReadonly, type Ref } from 'vue'

import { globalAppPlatform } from '@/app-platform'
import type { AppPlatform } from '@/config'

/**
 * Read-only access to the effective app platform (resolved `ios` / `android`
 * on `<html>`).
 *
 * Resolution order: `?os=auto|ios|android` URL param (masks stored preference,
 * never writes to localStorage) → stored preference → device detection when
 * effective preference is `auto`.
 *
 * Use this when a prototype needs structural differences between iOS and
 * Android. For visual-only differences, prefer [data-app-platform] selectors
 * in CSS.
 */
export function useAppPlatform(): DeepReadonly<Ref<AppPlatform>> {
  return readonly(globalAppPlatform)
}

export function useIsIos(): ComputedRef<boolean> {
  return computed(() => globalAppPlatform.value === 'ios')
}

export function useIsAndroid(): ComputedRef<boolean> {
  return computed(() => globalAppPlatform.value === 'android')
}
