import { ref, watch } from 'vue'

import {
  loadHideTabBarPreference,
  saveHideTabBarPreference,
} from '../data/hideTabBar'

const hideTabBar = ref(loadHideTabBarPreference().hideTabBar)

watch(hideTabBar, (value) => {
  saveHideTabBarPreference({ hideTabBar: value })
})

export function useWikitaLiteHideTabBar() {
  function toggleHideTabBar(): void {
    hideTabBar.value = !hideTabBar.value
  }

  return {
    hideTabBar,
    toggleHideTabBar,
  }
}

/** Module-level singleton so shell and menu share the same reactive state. */
let singleton: ReturnType<typeof useWikitaLiteHideTabBar> | null = null

export function useWikitaLiteHideTabBarSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteHideTabBar()
  }
  return singleton
}
