import { computed, ref, watch } from 'vue'

import { mockBucketToEditCount } from '@/config'

import { fetchUserEditCount } from './fetchUserEditCount'
import { useConfig } from './useConfig'

/**
 * Edit count that drives Visual Editor / Suggestion Mode gates: 0 for logged-out
 * mock users, live API count for "real user", mock bucket for other presets.
 */
export function useEffectiveEditorEditCount() {
  const { user, realUsername, lang, mockEditorEditCount } = useConfig()

  const realEdits = ref<number | null>(null)
  const realLoading = ref(false)

  let token = 0

  watch(
    [user, realUsername, lang],
    () => {
      if (user.value !== 'real') {
        token++
        realEdits.value = null
        realLoading.value = false
        return
      }
      const current = ++token
      realLoading.value = true
      realEdits.value = null
      void fetchUserEditCount(lang.value, realUsername.value)
        .then((count) => {
          if (current !== token) return
          realEdits.value = count
        })
        .catch(() => {
          if (current !== token) return
          realEdits.value = 0
        })
        .finally(() => {
          if (current === token) realLoading.value = false
        })
    },
    { immediate: true },
  )

  const editCount = computed(() => {
    if (user.value === 'logged-out') return 0
    if (user.value === 'real') return realEdits.value ?? 0
    return mockBucketToEditCount(mockEditorEditCount.value)
  })

  /** False while the real user's edit count is still being fetched. */
  const editCountReady = computed(() => user.value !== 'real' || !realLoading.value)

  return { editCount, editCountReady, realLoading }
}
