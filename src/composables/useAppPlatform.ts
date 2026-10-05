import { computed, readonly, type ComputedRef, type DeepReadonly, type Ref } from 'vue'

import { globalAppPlatform } from '@/appearance'
import type { AppPlatform } from '@/config'

/**
 * Read-only access to the effective app platform (resolved `ios` / `android`
 * on `<html>`).
 *
 * Driven by **App OS** in Appearance settings, kept in sync with `?os=`
 * on the URL (`auto` runs device detection; `ios` / `android` pin explicitly).
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
