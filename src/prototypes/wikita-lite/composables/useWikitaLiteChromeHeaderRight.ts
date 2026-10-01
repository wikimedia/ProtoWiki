import { computed, type Component, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'

import type { HeaderButtonItem, HeaderItem } from '@/components/header/headerItems'
import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'

import WikitaLiteAccountMenuButton from '../components/WikitaLiteAccountMenuButton.vue'

const DEFAULT_SEARCH: HeaderButtonItem = {
  type: 'button',
  icon: 'search',
  get label() {
    return t('chrome.search')
  },
}

const DEFAULT_BELL: HeaderButtonItem = {
  type: 'button',
  icon: 'bell-outline',
  get label() {
    return t('chrome.notifications')
  },
}

const DEFAULT_USER: HeaderButtonItem = {
  type: 'button',
  icon: 'user-avatar-outline',
  get label() {
    return t('chrome.userMenu')
  },
}

export function useWikitaLiteChromeHeaderRight(options?: {
  search?: MaybeRefOrGetter<HeaderButtonItem | undefined>
  hideUserMenu?: MaybeRefOrGetter<boolean>
  /** Logged in: mounted in place of the inert avatar (e.g. `MinervaUserMenu`). */
  userMenu?: MaybeRefOrGetter<Component | undefined>
}): { headerRight: ComputedRef<HeaderItem[]> } {
  const { user } = useConfig()

  const headerRight = computed((): HeaderItem[] => {
    const items: HeaderItem[] = [toValue(options?.search) ?? DEFAULT_SEARCH]

    if (user.value !== 'logged-out') {
      items.push(DEFAULT_BELL)
    }

    if (!toValue(options?.hideUserMenu)) {
      if (user.value === 'logged-out') {
        items.push({ type: 'component', component: WikitaLiteAccountMenuButton })
      } else {
        const userMenu = toValue(options?.userMenu)
        items.push(userMenu ? { type: 'component', component: userMenu } : DEFAULT_USER)
      }
    }

    return items
  })

  return { headerRight }
}
