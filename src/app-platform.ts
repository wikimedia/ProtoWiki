import { ref, type Ref } from 'vue'

import type { AppPlatform } from '@/config'

export const globalAppPlatform: Ref<AppPlatform> = ref<AppPlatform>('android')

function setHtmlAppPlatform(platform: AppPlatform): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-app-platform', platform)
}

export function applyAppPlatform(platform: AppPlatform): void {
  globalAppPlatform.value = platform
  setHtmlAppPlatform(platform)
}

/** Apply the initial app platform on <html>. Call once before mounting the app. */
export function initAppPlatform(platform: AppPlatform): void {
  applyAppPlatform(platform)
}
