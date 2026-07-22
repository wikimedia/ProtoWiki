import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRef,
  type Ref,
} from 'vue'

import type { WikitaUiSkin } from '../data/wikitaUiSkinPreference'

export type { WikitaUiSkin }

const WIKITA_UI_SKIN_KEY: InjectionKey<Ref<WikitaUiSkin>> = Symbol('wikitaUiSkin')

export function provideWikitaUiSkin(skin: Ref<WikitaUiSkin>): void {
  provide(WIKITA_UI_SKIN_KEY, skin)
}

export function useWikitaUiSkin(
  override?: MaybeRef<WikitaUiSkin | undefined>,
): ComputedRef<WikitaUiSkin> {
  const injected = inject(WIKITA_UI_SKIN_KEY, null)

  return computed(() => {
    const explicit = override !== undefined ? toValue(override) : undefined
    if (explicit) return explicit
    return injected?.value ?? 'wikita'
  })
}
