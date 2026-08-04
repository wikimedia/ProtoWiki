import { ref, type Ref } from 'vue'

import type { AppPlatform, ConfigAppPlatform } from '@/config'

export const globalAppPlatform: Ref<AppPlatform> = ref<AppPlatform>('android')

function resolveAppPlatformFromDevice(): AppPlatform {
  if (typeof navigator === 'undefined') return 'android'

  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  // iPadOS 13+ may report MacIntel
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'

  return 'android'
}

function resolveEffectiveAppPlatform(preference: ConfigAppPlatform): AppPlatform {
  if (preference === 'ios' || preference === 'android') return preference
  return resolveAppPlatformFromDevice()
}

function setHtmlAppPlatform(platform: AppPlatform): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-app-platform', platform)
}

export function applyAppPlatform(preference: ConfigAppPlatform): void {
  const platform = resolveEffectiveAppPlatform(preference)
  globalAppPlatform.value = platform
  setHtmlAppPlatform(platform)
}

/** Apply the initial app platform on <html>. Call once before mounting the app. */
export function initAppPlatform(preference: ConfigAppPlatform): void {
  applyAppPlatform(preference)
}
