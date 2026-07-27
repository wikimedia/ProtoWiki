const STORAGE_KEY = 'musical-group-liftwing-cache'
const CACHE_VERSION = 1

interface LiftWingCachePayload {
  version: number
  goodFaith: Record<string, boolean | null>
  referenceNeed: Record<string, number | null>
  revertRisk: Record<string, { prediction: boolean; probability: number } | null>
}

const memoryStore: LiftWingCachePayload = {
  version: CACHE_VERSION,
  goodFaith: {},
  referenceNeed: {},
  revertRisk: {},
}

function readPayload(): LiftWingCachePayload {
  if (typeof window === 'undefined') return memoryStore

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return memoryStore

    const parsed = JSON.parse(raw) as LiftWingCachePayload
    if (parsed.version !== CACHE_VERSION) return memoryStore

    memoryStore.goodFaith = parsed.goodFaith ?? {}
    memoryStore.referenceNeed = parsed.referenceNeed ?? {}
    memoryStore.revertRisk = parsed.revertRisk ?? {}
    return memoryStore
  } catch {
    return memoryStore
  }
}

function persistPayload(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore))
  } catch {
    // Ignore quota failures.
  }
}

export function getCachedGoodFaith(revId: number): boolean | null | undefined {
  const store = readPayload()
  if (!Object.prototype.hasOwnProperty.call(store.goodFaith, String(revId))) {
    return undefined
  }
  return store.goodFaith[String(revId)]
}

export function setCachedGoodFaith(revId: number, value: boolean | null): void {
  readPayload()
  memoryStore.goodFaith[String(revId)] = value
  persistPayload()
}

export function getCachedReferenceNeed(revId: number): number | null | undefined {
  const store = readPayload()
  if (!Object.prototype.hasOwnProperty.call(store.referenceNeed, String(revId))) {
    return undefined
  }
  return store.referenceNeed[String(revId)]
}

export function setCachedReferenceNeed(revId: number, value: number | null): void {
  readPayload()
  memoryStore.referenceNeed[String(revId)] = value
  persistPayload()
}

export function getCachedRevertRisk(
  revId: number,
): { prediction: boolean; probability: number } | null | undefined {
  const store = readPayload()
  if (!Object.prototype.hasOwnProperty.call(store.revertRisk, String(revId))) {
    return undefined
  }
  return store.revertRisk[String(revId)]
}

export function setCachedRevertRisk(
  revId: number,
  value: { prediction: boolean; probability: number } | null,
): void {
  readPayload()
  memoryStore.revertRisk[String(revId)] = value
  persistPayload()
}

export function clearLiftWingCache(): void {
  memoryStore.goodFaith = {}
  memoryStore.referenceNeed = {}
  memoryStore.revertRisk = {}
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
