import { computed, ref } from 'vue'

import { useConfig } from '@/composables/useConfig'
import type { ConfigUser } from '@/config'

/* Its own key, so this template's state doesn't leak into other prototypes'. */
const STORAGE_KEY = 'protowiki-template-home-mentor-v1'

interface MentorState {
  /** Whether the reader has a mentor; `null` follows the Mock user's default. */
  assigned: boolean | null
  /** The "We've assigned you…" notice was dismissed. */
  noticeDismissed: boolean
}

/** Kept per Mock user, so switching presets shows each one's own state. */
type MentorStates = Partial<Record<ConfigUser, MentorState>>

const DEFAULT_STATE: MentorState = { assigned: null, noticeDismissed: false }

function normalizeState(value: unknown): MentorState {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    assigned: typeof record.assigned === 'boolean' ? record.assigned : null,
    noticeDismissed: record.noticeDismissed === true,
  }
}

function loadStates(): MentorStates {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const record = raw ? JSON.parse(raw) : {}
    if (typeof record !== 'object' || record === null) return {}
    return Object.fromEntries(
      Object.entries(record).map(([user, state]) => [user, normalizeState(state)]),
    )
  } catch {
    // Unavailable storage or corrupt JSON — start from defaults.
    return {}
  }
}

function saveStates(next: MentorStates): MentorStates {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota or private mode — the in-memory state still works for this visit.
  }
  return next
}

// Module-level: the module's title, menu and body read the same state.
const states = ref<MentorStates | null>(null)

/**
 * The reader's mentor. Newcomers are assigned one by default, with a one-time
 * notice saying so; Experienced editor and Real user have none, so they're
 * offered one instead.
 */
export function useHomeMentor() {
  states.value ??= loadStates()
  const { user } = useConfig()

  const state = computed(() => states.value?.[user.value] ?? DEFAULT_STATE)
  const isAssigned = computed(
    () => state.value.assigned ?? !(user.value === 'experienced' || user.value === 'real'),
  )
  const noticeDismissed = computed(() => state.value.noticeDismissed)

  function patch(partial: Partial<MentorState>): void {
    states.value = saveStates({ ...loadStates(), [user.value]: { ...state.value, ...partial } })
  }

  function assign(): void {
    patch({ assigned: true, noticeDismissed: false })
  }

  function optOut(): void {
    patch({ assigned: false })
  }

  function dismissNotice(): void {
    patch({ noticeDismissed: true })
  }

  return { isAssigned, noticeDismissed, assign, optOut, dismissNotice }
}
