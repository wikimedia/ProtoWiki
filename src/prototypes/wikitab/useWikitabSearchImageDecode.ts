import { shallowRef } from 'vue'

const decodedPageIds = shallowRef<ReadonlySet<number>>(new Set())

export function markWikitabSearchImageDecoded(pageid: number): void {
  if (decodedPageIds.value.has(pageid)) return
  decodedPageIds.value = new Set([...decodedPageIds.value, pageid])
}

export function isWikitabSearchImageDecoded(pageid: number): boolean {
  return decodedPageIds.value.has(pageid)
}

export function resetWikitabSearchImageDecode(): void {
  decodedPageIds.value = new Set()
}

/** Shared decode state for Images-tab top-down reveal gating. */
export function useWikitabSearchImageDecode() {
  return {
    decodedPageIds,
    markDecoded: markWikitabSearchImageDecoded,
    isDecoded: isWikitabSearchImageDecoded,
    reset: resetWikitabSearchImageDecode,
  }
}
