import { computed, inject, provide, type MaybeRefOrGetter, toValue } from 'vue'

import {
  WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER,
  WIKITA_LITE_CARD_CLASS_SEPARATION_NONE,
  WIKITA_LITE_CARD_GROUP_DIVIDER,
  WIKITA_LITE_CARD_GROUP_OUTLINE,
  WIKITA_LITE_CARD_SEPARATION,
  type WikitaLiteCardSeparation,
} from '../wikita-lite-card'

interface UseWikitaLiteCardListClassesOptions {
  /** Fullscreen module pages pass `standalone`; tab previews omit it. */
  standalone?: MaybeRefOrGetter<boolean | undefined>
  override?: MaybeRefOrGetter<WikitaLiteCardSeparation | undefined>
}

const dividerSeparation = computed((): WikitaLiteCardSeparation => 'divider')

export function useWikitaLiteCardListClasses(options?: UseWikitaLiteCardListClassesOptions) {
  const parentSeparation = inject(WIKITA_LITE_CARD_SEPARATION, null)

  const separation = computed((): WikitaLiteCardSeparation => {
    if (toValue(options?.standalone)) return 'divider'
    const local = toValue(options?.override)
    if (local) return local
    return parentSeparation?.value ?? 'outline'
  })

  if (toValue(options?.standalone)) {
    provide(WIKITA_LITE_CARD_SEPARATION, dividerSeparation)
  }

  return {
    separation,
    groupClass: computed(() => {
      if (separation.value === 'divider') return WIKITA_LITE_CARD_GROUP_DIVIDER
      if (separation.value === 'outline') return WIKITA_LITE_CARD_GROUP_OUTLINE
      return ''
    }),
    cardClass: computed(() => {
      if (separation.value === 'divider') return WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER
      if (separation.value === 'none') return WIKITA_LITE_CARD_CLASS_SEPARATION_NONE
      return ''
    }),
  }
}
