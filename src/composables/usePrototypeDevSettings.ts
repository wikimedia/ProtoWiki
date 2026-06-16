import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

export type MorelikeStrategy = 'minimal' | 'opening_text' | 'serial'

export type MicrotaskSource = 'random' | 'quality-check'

export interface PrototypeDevSettings {
  morelikeStrategy: MorelikeStrategy
  microtaskSource: MicrotaskSource
}

export const DEFAULT_PROTOTYPE_DEV_SETTINGS: PrototypeDevSettings = {
  morelikeStrategy: 'serial',
  microtaskSource: 'quality-check',
}

export const MORELIKE_STRATEGY_MENU_ITEMS: { value: MorelikeStrategy; label: string }[] = [
  { value: 'minimal', label: 'Minimal (wiki default)' },
  { value: 'opening_text', label: 'Opening text only' },
  { value: 'serial', label: 'Serial multi-call' },
]

export const MICROTASK_SOURCE_MENU_ITEMS: { value: MicrotaskSource; label: string }[] = [
  { value: 'random', label: 'Random from catalog' },
  { value: 'quality-check', label: 'Microtask Generator API' },
]

const STORAGE_KEY = 'protowiki-prototype-dev-settings'

const VALID_STRATEGIES: MorelikeStrategy[] = ['minimal', 'opening_text', 'serial']
const VALID_MICROTASK_SOURCES: MicrotaskSource[] = ['random', 'quality-check']

function isMorelikeStrategy(value: unknown): value is MorelikeStrategy {
  return typeof value === 'string' && VALID_STRATEGIES.includes(value as MorelikeStrategy)
}

function isMicrotaskSource(value: unknown): value is MicrotaskSource {
  return typeof value === 'string' && VALID_MICROTASK_SOURCES.includes(value as MicrotaskSource)
}

export function normalizePrototypeDevSettings(input: unknown): PrototypeDevSettings {
  if (typeof input !== 'object' || input === null) {
    return { ...DEFAULT_PROTOTYPE_DEV_SETTINGS }
  }

  const record = input as Record<string, unknown>

  return {
    morelikeStrategy: isMorelikeStrategy(record.morelikeStrategy)
      ? record.morelikeStrategy
      : DEFAULT_PROTOTYPE_DEV_SETTINGS.morelikeStrategy,
    microtaskSource: isMicrotaskSource(record.microtaskSource)
      ? record.microtaskSource
      : DEFAULT_PROTOTYPE_DEV_SETTINGS.microtaskSource,
  }
}

export function loadPrototypeDevSettings(): PrototypeDevSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PROTOTYPE_DEV_SETTINGS }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_PROTOTYPE_DEV_SETTINGS }

    const parsed = JSON.parse(stored)
    return normalizePrototypeDevSettings(parsed)
  } catch {
    return { ...DEFAULT_PROTOTYPE_DEV_SETTINGS }
  }
}

export function savePrototypeDevSettings(settings: PrototypeDevSettings): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

/** Module-level singleton so homepage and drill-down share dev settings. */
const devSettings = ref<PrototypeDevSettings>(loadPrototypeDevSettings())

let persistenceInitialized = false

function ensurePersistenceWatch(): void {
  if (persistenceInitialized) return
  persistenceInitialized = true

  watch(
    devSettings,
    (value) => {
      savePrototypeDevSettings(value)
    },
    { deep: true },
  )
}

export function usePrototypeDevSettings(): {
  morelikeStrategy: ComputedRef<MorelikeStrategy>
  microtaskSource: ComputedRef<MicrotaskSource>
  settings: Ref<PrototypeDevSettings>
} {
  ensurePersistenceWatch()

  const morelikeStrategy = computed({
    get: () => devSettings.value.morelikeStrategy,
    set: (value: MorelikeStrategy | null | undefined) => {
      if (!isMorelikeStrategy(value)) return
      devSettings.value = { ...devSettings.value, morelikeStrategy: value }
    },
  })

  const microtaskSource = computed({
    get: () => devSettings.value.microtaskSource,
    set: (value: MicrotaskSource | null | undefined) => {
      if (!isMicrotaskSource(value)) return
      devSettings.value = { ...devSettings.value, microtaskSource: value }
    },
  })

  return {
    morelikeStrategy,
    microtaskSource,
    settings: devSettings,
  }
}
