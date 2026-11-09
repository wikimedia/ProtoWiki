import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'

/**
 * A module's data: loads now, and again (aborting the last load) whenever
 * `source` changes — e.g. the pages it grows from. `reload` retries after an error.
 */
export function useModuleLoad<T>(
  source: () => string,
  load: (signal: AbortSignal) => Promise<T[]>,
): { items: Ref<T[]>; loading: Ref<boolean>; error: Ref<boolean>; reload: () => Promise<void> } {
  const items = shallowRef<T[]>([])
  const loading = ref(false)
  const error = ref(false)

  let controller: AbortController | null = null

  async function reload(): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = false
    try {
      items.value = await load(current.signal)
    } catch (err) {
      if (current.signal.aborted) return
      console.error(err)
      items.value = []
      error.value = true
    } finally {
      if (controller === current) loading.value = false
    }
  }

  watch(source, reload, { immediate: true })
  onBeforeUnmount(() => controller?.abort())

  return { items, loading, error, reload }
}
