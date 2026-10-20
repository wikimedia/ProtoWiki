import { ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

function readQueryValue(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0]
  return undefined
}

export { readQueryValue }

export function useUrlQueryParam<T extends string>(
  key: string,
  defaultValue: T,
  isValid: (value: string) => value is T,
): Ref<T> {
  const route = useRoute()
  const router = useRouter()

  function parse(): T {
    const value = readQueryValue(route.query[key])
    if (value && isValid(value)) return value
    return defaultValue
  }

  const param = ref(parse()) as Ref<T>
  let syncingFromRoute = false

  watch(
    () => route.query[key],
    () => {
      const next = parse()
      if (next === param.value) return
      syncingFromRoute = true
      param.value = next
      syncingFromRoute = false
    },
  )

  watch(param, (value) => {
    if (syncingFromRoute) return

    const normalized = value === defaultValue ? undefined : value
    const current = readQueryValue(route.query[key])
    if (current === normalized) return

    const query = { ...route.query }
    if (normalized === undefined) {
      delete query[key]
    } else {
      query[key] = normalized
    }
    void router.replace({ query })
  })

  return param
}
