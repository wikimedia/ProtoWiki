import { computed, ref } from 'vue'

/* Its own key, so this template's state doesn't leak into other prototypes'. */
const STORAGE_KEY = 'protowiki-template-home-mentor-v1'

interface MentorState {
  /** Whether the reader has a mentor; `null` follows the default (assigned). */
  assigned: boolean | null
  /** The "We've assigned you…" notice was dismissed. */
  noticeDismissed: boolean
}

function loadState(): MentorState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const record = raw ? JSON.parse(raw) : {}
    return {
      assigned: typeof record?.assigned === 'boolean' ? record.assigned : null,
      noticeDismissed: record?.noticeDismissed === true,
    }
  } catch {
    // Unavailable storage or corrupt JSON — start from defaults.
    return { assigned: null, noticeDismissed: false }
  }
}

function patchState(partial: Partial<MentorState>): MentorState {
  const next = { ...loadState(), ...partial }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota or private mode — the in-memory state still works for this visit.
  }
  return next
}

// Module-level: the module's title and body read the same state.
const state = ref<MentorState | null>(null)

/**
 * The reader's mentor: assigned by default, with a one-time notice
 * saying so.
 */
export function useHomeMentor() {
  state.value ??= loadState()

  const isAssigned = computed(() => state.value?.assigned ?? true)
  const noticeDismissed = computed(() => state.value?.noticeDismissed ?? false)

  function assign(): void {
    state.value = patchState({ assigned: true, noticeDismissed: false })
  }

  function dismissNotice(): void {
    state.value = patchState({ noticeDismissed: true })
  }

  return { isAssigned, noticeDismissed, assign, dismissNotice }
}
