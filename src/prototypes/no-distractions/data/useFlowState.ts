import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'

/**
 * URL-query state for the no-distractions onboarding flow.
 *
 * The route's query string is the single source of truth: every screen reads
 * from and writes to it, so each step is deep-linkable, shareable, and gets
 * browser back/forward for free. Screen transitions push a new history entry;
 * in-place field edits (survey choice, interests) replace the current entry so
 * they don't flood history. Ephemeral text buffers (typing a title, a username)
 * live locally in their screens and are committed to the URL on the action.
 */

export const SCREENS = [
  'picker',
  'read',
  'account',
  'welcome',
  'survey',
  'interests',
  'email',
  'home',
  'all',
] as const

export type Screen = (typeof SCREENS)[number]

export type SurveyChoice = 'read' | 'edit' | 'both'

const SURVEY_CHOICES: SurveyChoice[] = ['read', 'edit', 'both']

const DEFAULT_SCREEN: Screen = 'picker'

function firstString(value: LocationQuery[string]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return typeof value === 'string' ? value : ''
}

function isScreen(value: string): value is Screen {
  return (SCREENS as readonly string[]).includes(value)
}

export interface FlowPatch {
  title?: string
  username?: string
  survey?: SurveyChoice | ''
  interests?: string[]
  email?: string
  /** Screen to return to after configuring interests (cleared on exit). */
  returnTo?: Screen | ''
}

export interface FlowState {
  /** Active screen (defaults to `picker`). */
  screen: ComputedRef<Screen>
  /** Seed article the reader picked at the start. */
  title: ComputedRef<string>
  /** Username captured on the create-account screen. */
  username: ComputedRef<string>
  /** Survey answer; writable so the radio binds with `v-model` (replace nav). */
  survey: WritableComputedRef<SurveyChoice | ''>
  /** Interest titles; defaults to `[title]` when the param is absent. */
  interests: WritableComputedRef<string[]>
  /** Whether `interests` was set explicitly in the URL (vs seeded from `title`). */
  hasExplicitInterests: ComputedRef<boolean>
  /** When set, interests is in configure mode and should return here on Done. */
  returnTo: ComputedRef<Screen | ''>
  /** Email captured on the email screen. */
  email: ComputedRef<string>
  /** Merge `patch` into the query without changing the screen (history replace). */
  patch: (patch: FlowPatch) => void
  /** Navigate to `screen`, optionally merging `patch` (history push). */
  goTo: (screen: Screen, patch?: FlowPatch) => Promise<void>
}

function serializePatch(patch: FlowPatch): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  if ('title' in patch) out.title = patch.title?.trim() || undefined
  if ('username' in patch) out.username = patch.username?.trim() || undefined
  if ('survey' in patch) out.survey = patch.survey || undefined
  if ('email' in patch) out.email = patch.email?.trim() || undefined
  if ('interests' in patch) {
    const joined = (patch.interests ?? []).map((item) => item.trim()).filter(Boolean).join(',')
    out.interests = joined.length ? joined : undefined
  }
  if ('returnTo' in patch) {
    const target = patch.returnTo
    out.returnTo = target && isScreen(target) ? target : undefined
  }
  return out
}

function mergeQuery(current: LocationQuery, updates: Record<string, string | undefined>): LocationQueryRaw {
  const next: LocationQueryRaw = { ...current }
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete next[key]
    } else {
      next[key] = value
    }
  }
  return next
}

export function useFlowState(): FlowState {
  const route = useRoute()
  const router = useRouter()

  const screen = computed<Screen>(() => {
    const raw = firstString(route.query.screen)
    return isScreen(raw) ? raw : DEFAULT_SCREEN
  })

  const title = computed(() => firstString(route.query.title).trim())
  const username = computed(() => firstString(route.query.username).trim())
  const email = computed(() => firstString(route.query.email).trim())

  function patch(next: FlowPatch): void {
    void router.replace({ query: mergeQuery(route.query, serializePatch(next)) })
  }

  function goTo(target: Screen, next?: FlowPatch): Promise<void> {
    const updates = next ? serializePatch(next) : {}
    updates.screen = target === DEFAULT_SCREEN ? undefined : target
    return router.push({ query: mergeQuery(route.query, updates) }).then(() => undefined)
  }

  const survey = computed<SurveyChoice | ''>({
    get() {
      const raw = firstString(route.query.survey)
      return (SURVEY_CHOICES as string[]).includes(raw) ? (raw as SurveyChoice) : ''
    },
    set(value) {
      patch({ survey: value })
    },
  })

  const interests = computed<string[]>({
    get() {
      const raw = route.query.interests
      if (raw === undefined) {
        // No explicit param: seed from the article the reader picked.
        return title.value ? [title.value] : []
      }
      return firstString(raw)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    },
    set(value) {
      patch({ interests: value })
    },
  })

  const hasExplicitInterests = computed(() => route.query.interests !== undefined)

  const returnTo = computed<Screen | ''>(() => {
    const raw = firstString(route.query.returnTo)
    return isScreen(raw) ? raw : ''
  })

  return {
    screen,
    title,
    username,
    survey,
    interests,
    hasExplicitInterests,
    returnTo,
    email,
    patch,
    goTo,
  }
}
