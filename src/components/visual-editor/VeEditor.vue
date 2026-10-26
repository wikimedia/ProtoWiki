<script setup lang="ts">
/**
 * VisualEditor edit mode with Suggestion Mode and Edit Check.
 *
 * - The article HTML is edited in place (`contenteditable`); suggestions are
 *   live DOM `Range`s, so they follow the text as people type.
 * - Highlights are drawn as an overlay of the ranges' client rects (as VE
 *   draws its selections) — the article markup is never wrapped.
 * - Desktop: cards in a sidebar aligned with their highlights. Mobile: gutter
 *   lightbulbs + a bottom sheet with "N of M" pagination.
 * - Publish runs the pre-save "Before publishing" step with checks only.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { CdxButton, CdxDialog, CdxIcon, CdxToast } from '@wikimedia/codex'
import {
  cdxIconAlert,
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconClose,
  cdxIconExpand,
  cdxIconLightbulb,
  cdxIconLightbulbDashed,
  cdxIconSuccess,
} from '@wikimedia/codex-icons'

import FindingBody from './FindingBody.vue'
import CitoidDialog, { type CitationInsert, type ExistingReference } from './CitoidDialog.vue'
import PublishDialog, { type DiffBlock } from './PublishDialog.vue'
import VeDialogs, { type VeDialogKind } from './VeDialogs.vue'
import { useConfig } from '@/composables/useConfig'
import { editorHasAtLeast25Edits, editorIsExperienced, editorShowsPublishPath } from '@/config'
import { useEffectiveEditorEditCount } from '@/composables/useEffectiveEditorEditCount'
import VeToolbar from './VeToolbar.vue'
import * as fix from './engine/actions'
import {
  detectSuggestions,
  leadParagraphs,
  leadWordCount,
  prepare,
  type ChoiceAction,
  type Finding,
} from './engine/checks'
import { resolveRedirect } from './engine/api'
import { normalizeHandAuthoredReferences } from './engine/dom'
import { addTemplateChips, stripTemplateChips } from './engine/templateChips'
import {
  addReferenceChecks,
  categorizePaste,
  pasteFinding,
  recheckTone,
  toneCheckForBlock,
} from './engine/editChecks'
import { STR } from './engine/strings'
import { applySuggestionSettings, suggestionSettings } from './settings'

const props = defineProps<{
  html: string
  skin: 'desktop' | 'mobile'
  page: { title: string; lang: string; host: string }
  /** Opened from a section's edit link (`data-mw-section-id`). */
  section?: string | null
  /** Opened for a task: once detected, go to the first suggestion of these types. */
  focusTypes?: readonly string[] | null
}>()

const { editCount, editCountReady } = useEffectiveEditorEditCount()

const emit = defineEmits<{
  /** Leave without publishing (edits are discarded). */
  exit: []
  /** Published: the edited article HTML. */
  published: [html: string]
  /** Suggestions on/off — the page layout widens for the sidebar on desktop. */
  sidebar: [open: boolean]
  /** Every suggestion found in the article (before the settings filter). */
  detected: [count: number]
}>()

const isMobile = computed(() => props.skin === 'mobile')

// ── Surface ──────────────────────────────────────────────────────────────────

const surfaceRef = ref<HTMLElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const hasChanges = ref(false)
const canRedo = ref(false)
const modifiedBlocks = new Set<Element>()
const addedParagraphs = new Set<Element>()
let originalBlocks = new WeakSet<Element>()

const BLOCK_SELECTOR = 'p, li, dd, dt, td, th, h1, h2, h3, h4, h5, h6, figcaption, pre'
/** Blocks compared for "Review your changes". */
const DIFF_BLOCKS = 'p, li, h2, h3, h4, h5, h6, figcaption'

function blockOf(node: Node | null): Element | null {
  const el = node ? (node.nodeType === 1 ? (node as Element) : node.parentElement) : null
  const block = el?.closest(BLOCK_SELECTOR) ?? null
  return block && surfaceRef.value?.contains(block) ? block : null
}

function cleanHtml(): string {
  const clone = surfaceRef.value!.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'))
  clone.querySelectorAll('.ve-review-focus').forEach((el) => el.classList.remove('ve-review-focus'))
  clone.querySelectorAll('.ve-section-hidden').forEach((el) => el.classList.remove('ve-section-hidden'))
  stripTemplateChips(clone)
  clone.querySelectorAll('.ve-caret-anchor').forEach((el) => el.remove())
  return clone.innerHTML
}

// ── Findings ─────────────────────────────────────────────────────────────────

type Status = 'pending' | 'done' | 'dismissed'

const suggestions = shallowRef<Finding[]>([])
const checks = shallowRef<Finding[]>([])
const status = reactive(new Map<string, Status>())
const detecting = ref(true)
const focusedId = ref<string | null>(null)
const hoverId = ref<string | null>(null)
const busyId = ref<string | null>(null)
/** Finding ids showing their success state (card or green highlight), until timeout. */
const successIds = reactive(new Set<string>())
const successTitles = reactive(new Map<string, string>())
/** The publish-path card (first completed suggestion, editors with ≤10 edits). */
const publishPathId = ref<string | null>(null)
let publishPathShown = false
const dismissingId = ref<string | null>(null)
/** Blocks whose tone check was declined — not re-flagged this session. */
const dismissedToneBlocks = new WeakSet<Element>()

const modeEnabled = computed(() => suggestionSettings.enabled)

function initialSuggestionsOn(): boolean {
  if (!suggestionSettings.enabled) return false
  if (isMobile.value) return true
  return suggestionSettings.firstTime ? false : suggestionSettings.rememberedToggle
}

/** Desktop: production remembers the toggle; first-timers start with it off. Mobile: always on. */
const suggestionsOn = ref(initialSuggestionsOn())

function isLive(f: Finding): boolean {
  if (f.element && !f.element.isConnected) return false
  return f.ranges.some((r) => r.startContainer.isConnected && (!r.collapsed || !!f.element))
}

// ── Loading + section editing ────────────────────────────────────────────────

/** "Loading editor…" (Minerva) / progress bar + faded article (Vector). */
const loadingEditor = ref(true)
/** Minerva section editing: only this section is shown until "Edit full page". */
const sectionOnly = ref<string | null>(isMobile.value && props.section ? props.section : null)
/** Bumped when sections are shown/hidden, so scope-dependent lists recompute. */
const scopeVersion = ref(0)

function isHidden(node: Node): boolean {
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement
  return !!el?.closest('.ve-section-hidden')
}

function inScope(f: Finding): boolean {
  void scopeVersion.value
  if (!sectionOnly.value) return true
  return !isHidden(f.element ?? f.ranges[0].startContainer)
}

function applySectionOnly(id: string) {
  const surface = surfaceRef.value!
  const target = surface.querySelector(`section[data-mw-section-id="${id}"]`)
  if (!target) {
    sectionOnly.value = null
    return
  }
  for (let el: Element = target; el !== surface && el.parentElement; el = el.parentElement) {
    for (const sibling of Array.from(el.parentElement.children)) {
      if (sibling !== el) sibling.classList.add('ve-section-hidden')
    }
  }
  scopeVersion.value++
}

/** "Edit full page": reveal the rest of the article, keeping the section where it is on screen. */
function editFullPage(direction: -1 | 1 = 1) {
  const surface = surfaceRef.value!
  const target = sectionOnly.value ? surface.querySelector(`section[data-mw-section-id="${sectionOnly.value}"]`) : null
  const before = target?.getBoundingClientRect().top ?? 0
  surface.querySelectorAll('.ve-section-hidden').forEach((el) => el.classList.remove('ve-section-hidden'))
  sectionOnly.value = null
  layoutMinHeight.value = undefined
  scopeVersion.value++
  nextTick(() => {
    if (target) window.scrollBy({ top: target.getBoundingClientRect().top - before })
    // Production nudges the page 130px towards the newly revealed content.
    window.scrollBy({ top: direction * 130, behavior: 'smooth' })
    scheduleLayout()
  })
}

function sectionElement(): Element | null {
  return sectionOnly.value
    ? (surfaceRef.value?.querySelector(`section[data-mw-section-id="${sectionOnly.value}"]`) ?? null)
    : null
}

/** "Edit full page" placement (`ArticleTarget`): top unless first, bottom unless last. */
const sectionEdges = computed(() => {
  void scopeVersion.value
  const target = sectionElement()
  const sections = Array.from(surfaceRef.value?.querySelectorAll('section[data-mw-section-id]') ?? []).filter(
    (s) => Number(s.getAttribute('data-mw-section-id')) >= 0,
  )
  if (!target) return { first: true, last: true }
  const index = sections.indexOf(target)
  const last = sections.slice(index + 1).every((s) => target.contains(s))
  return { first: index <= 0, last }
})

/** Suggestions above / below the edited section (lightbulb + dot on each button). */
const outOfScope = computed(() => {
  void scopeVersion.value
  const target = sectionElement()
  const result = { above: 0, below: 0 }
  if (!target) return result
  for (const f of filteredSuggestions.value) {
    if (status.get(f.id) !== 'pending' || !isLive(f) || inScope(f)) continue
    const node = f.element ?? f.ranges[0].startContainer
    if (target.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) result.above++
    else result.below++
  }
  return result
})

/**
 * Minerva section editing opens at the section heading, right under the
 * toolbar: the top "Edit full page" area is only revealed by scrolling up.
 * The layout gets enough height for that, however short the section is.
 */
const layoutRef = ref<HTMLElement | null>(null)
const layoutMinHeight = ref<string | undefined>(undefined)

function scrollPastTopButton() {
  const heading = sectionElement()?.querySelector(':scope > :is(h2, h3, h4, h5, h6)')
  const layout = layoutRef.value
  if (!heading || !layout) return
  const toolbar = 48
  const headingTop = heading.getBoundingClientRect().top + window.scrollY
  const layoutTop = layout.getBoundingClientRect().top + window.scrollY
  layoutMinHeight.value = `${headingTop - layoutTop + window.innerHeight}px`
  nextTick(() => window.scrollTo({ top: Math.max(0, headingTop - toolbar - 8) }))
}

/** Desktop: full page, scrolled so the section heading sits under the toolbar. */
function scrollToSection(id: string) {
  const heading = surfaceRef.value?.querySelector(`section[data-mw-section-id="${id}"] > :is(h2, h3, h4, h5, h6)`)
  if (!heading) return
  const toolbar = 42
  window.scrollTo({ top: Math.max(0, heading.getBoundingClientRect().top + window.scrollY - toolbar - 16) })
}

/** Suggestions after the settings filter (type + custom count). */
const filteredSuggestions = computed(() => applySuggestionSettings(suggestions.value))

const pendingSuggestions = computed(() =>
  filteredSuggestions.value.filter((f) => status.get(f.id) === 'pending' && isLive(f) && inScope(f)),
)
const pendingChecks = computed(() =>
  checks.value.filter((f) => status.get(f.id) === 'pending' && isLive(f) && inScope(f)),
)

/** A check on the same range wins over a suggestion (`updateForListener`). */
function overlapsCheck(f: Finding): boolean {
  return pendingChecks.value.some((c) =>
    c.ranges.some((cr) =>
      f.ranges.some(
        (fr) =>
          cr.compareBoundaryPoints(Range.START_TO_END, fr) > 0 && cr.compareBoundaryPoints(Range.END_TO_START, fr) < 0,
      ),
    ),
  )
}

function byPosition(a: Finding, b: Finding): number {
  const r = a.ranges[0].compareBoundaryPoints(Range.START_TO_START, b.ranges[0])
  return r
}

/** What the sidebar / sheet lists (pending items plus transient success cards). */
const displayed = computed<Finding[]>(() => {
  if (review.value) return review.value.items.filter((f) => status.get(f.id) !== 'done' || successIds.has(f.id))
  const transient = [...suggestions.value, ...checks.value].filter(
    (f) => (successIds.has(f.id) || publishPathId.value === f.id) && status.get(f.id) === 'done',
  )
  if (loadingEditor.value) return []
  const visibleSuggestions = suggestionsOn.value
    ? pendingSuggestions.value.filter((f) => !overlapsCheck(f))
    : []
  return [...pendingChecks.value, ...visibleSuggestions, ...(suggestionsOn.value ? transient : transient.filter((f) => f.mode === 'check'))].sort(byPosition)
})

const pendingDisplayed = computed(() => displayed.value.filter((f) => status.get(f.id) === 'pending'))

/** Toolbar badge: suggestions only (`editcheck-toolbar-suggestions-count`). */
const badgeCount = computed(() => pendingSuggestions.value.length)

async function runDetection() {
  if (!modeEnabled.value) {
    suggestions.value = []
    detecting.value = false
    emit('detected', 0)
    scheduleLayout()
    return
  }
  detecting.value = true
  const root = surfaceRef.value!
  const edits = editCount.value
  const findings = await detectSuggestions(root, props.page, {
    experiencedEditor: editorIsExperienced(edits),
    atLeast25Edits: editorHasAtLeast25Edits(edits),
  })
  for (const f of findings) status.set(f.id, 'pending')
  suggestions.value = findings
  detecting.value = false
  emit('detected', findings.length)
  scheduleLayout()
}

watch([editCount, editCountReady], () => {
  if (!editCountReady.value || loadingEditor.value || !surfaceRef.value) return
  void runDetection()
})

// ── Toasts ───────────────────────────────────────────────────────────────────

const toast = ref<{ id: number; text: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
let toastCounter = 0
function showToast(text: string) {
  if (toastTimer) clearTimeout(toastTimer)
  const show = () => {
    toast.value = { id: ++toastCounter, text }
    toastTimer = setTimeout(() => (toast.value = null), 2000)
  }
  // Minerva shows the toggle toast 500 ms after the change.
  if (isMobile.value) toastTimer = setTimeout(show, 500)
  else show()
}

watch(
  () => suggestionSettings.enabled,
  (enabled) => {
    if (!enabled) {
      suggestionsOn.value = false
      suggestions.value = []
      checks.value = []
      review.value = null
      sheetOpen.value = false
      focusedId.value = null
      emit('sidebar', false)
      emit('detected', 0)
      scheduleLayout()
      return
    }
    suggestionsOn.value = initialSuggestionsOn()
    if (!editCountReady.value || loadingEditor.value || !surfaceRef.value) return
    void runDetection()
  },
)

watch(suggestionsOn, (on) => {
  if (!modeEnabled.value) return
  if (!isMobile.value) {
    suggestionSettings.rememberedToggle = on
    suggestionSettings.firstTime = false
  }
  emit('sidebar', on && !isMobile.value)
  if (!on) {
    sheetOpen.value = false
    focusedId.value = null
  }
  showToast(on ? (badgeCount.value > 0 ? STR.suggestionsTurnedOn : STR.suggestionsNone) : STR.suggestionsTurnedOff)
  flashGlow()
  scheduleLayout()
})

const glow = ref(false)
function flashGlow() {
  glow.value = true
  setTimeout(() => (glow.value = false), 200)
}

// ── Highlight overlay ────────────────────────────────────────────────────────

interface Box {
  top: number
  left: number
  width: number
  height: number
}
const boxes = shallowRef(new Map<string, Box[]>())
const blockBars = shallowRef(new Map<string, Box>())

function rectsFor(f: Finding, origin: DOMRect): Box[] {
  const out: Box[] = []
  const add = (r: DOMRect) => {
    if (r.width < 1 || r.height < 1) return
    out.push({ top: r.top - origin.top, left: r.left - origin.left, width: r.width, height: r.height })
  }
  if (f.element && (f.element.tagName === 'FIGURE' || f.element.tagName === 'SUP')) {
    add(f.element.getBoundingClientRect())
    return out
  }
  for (const range of f.ranges.slice(0, 1)) for (const r of Array.from(range.getClientRects())) add(r)
  return out
}

function isBlockFinding(f: Finding): boolean {
  return (
    f.type === 'addReference' ||
    f.type === 'tone' ||
    f.type === 'headingLevel' ||
    f.type === 'textMatch-potential-LLM' ||
    f.type === 'imageCaption'
  )
}

function measure() {
  const wrap = wrapRef.value
  if (!wrap) return
  const origin = wrap.getBoundingClientRect()
  const next = new Map<string, Box[]>()
  const bars = new Map<string, Box>()
  for (const f of displayed.value) {
    const list = rectsFor(f, origin)
    next.set(f.id, list)
    // Rail on the left: block-level suggestions, and every edit check.
    if (list.length && (isBlockFinding(f) || f.mode === 'check')) {
      const top = Math.min(...list.map((b) => b.top))
      const bottom = Math.max(...list.map((b) => b.top + b.height))
      bars.set(f.id, { top, left: 0, width: 2, height: bottom - top })
    }
  }
  boxes.value = next
  blockBars.value = bars
  nextTick(layoutCards)
}

let layoutTimer: ReturnType<typeof setTimeout> | undefined
function scheduleLayout() {
  clearTimeout(layoutTimer)
  layoutTimer = setTimeout(() => nextTick(measure), 16)
}

function highlightState(f: Finding): string {
  if (successIds.has(f.id) || (publishPathId.value === f.id && status.get(f.id) === 'done')) return 'success'
  if (focusedId.value === f.id && (!isMobile.value || sheetOpen.value)) return 'selected'
  if (hoverId.value === f.id && !isMobile.value) return 'hover'
  return 'default'
}

// ── Desktop sidebar layout (aligned to highlights, stacked without overlap) ──

const cardEls = new Map<string, HTMLElement>()
const cardTops = reactive(new Map<string, number>())
/** Before publishing: where the single card sits (heading above, pager below). */
const reviewBox = ref<{ top: number; height: number } | null>(null)
const sidebarHeight = ref(0)
const sidebarRef = ref<HTMLElement | null>(null)

function setCardEl(id: string, el: unknown) {
  if (el instanceof HTMLElement) cardEls.set(id, el)
  else cardEls.delete(id)
}

function desiredTop(f: Finding): number {
  const list = boxes.value.get(f.id)
  return list?.length ? Math.min(...list.map((b) => b.top)) : 0
}

function layoutCards() {
  if (isMobile.value) return
  const items = review.value ? displayed.value.filter((f) => f.id === currentReview.value?.id) : displayed.value
  let cursor = -Infinity
  // Keep the focused card next to its highlight: lay out from it in both directions.
  const focusIndex = items.findIndex((f) => f.id === focusedId.value)
  const tops = new Map<string, number>()
  const height = (f: Finding) => cardEls.get(f.id)?.offsetHeight ?? 44
  if (focusIndex >= 0) {
    const anchor = items[focusIndex]
    tops.set(anchor.id, desiredTop(anchor))
    let below = desiredTop(anchor) + height(anchor) + 8
    for (let i = focusIndex + 1; i < items.length; i++) {
      const top = Math.max(desiredTop(items[i]), below)
      tops.set(items[i].id, top)
      below = top + height(items[i]) + 8
    }
    let above = desiredTop(anchor) - 8
    for (let i = focusIndex - 1; i >= 0; i--) {
      const top = Math.min(desiredTop(items[i]), above - height(items[i]))
      tops.set(items[i].id, top)
      above = top - 8
    }
    // If stacking upward ran past the top, push everything down.
    const minTop = Math.min(...tops.values())
    if (minTop < 0) for (const [id, t] of tops) tops.set(id, t - minTop)
  } else {
    for (const f of items) {
      const top = Math.max(desiredTop(f), cursor)
      tops.set(f.id, top)
      cursor = top + height(f) + 8
    }
  }
  cardTops.clear()
  for (const [id, t] of tops) cardTops.set(id, t)
  const reviewed = review.value ? items[0] : null
  if (reviewed) {
    // Card next to its highlight, with room for the heading above it.
    const top = Math.max(tops.get(reviewed.id) ?? 0, 52)
    cardTops.set(reviewed.id, top)
    reviewBox.value = { top, height: height(reviewed) }
  } else reviewBox.value = null
  sidebarHeight.value = Math.max(0, ...items.map((f) => (tops.get(f.id) ?? 0) + height(f)))
}

// ── "View suggestions" (desktop pill / mobile banner) ────────────────────────

const offscreenDirection = ref<'up' | 'down' | null>(null)
/** Desktop: the sidebar column in window coordinates, for the fixed "View suggestions". */
const pillColumn = ref<{ left: string; width: string }>({ left: '0px', width: '325px' })
const anyInView = ref(true)
const seenOnMobile = ref(false)
const bannerDismissed = ref(false)

function updateViewport() {
  const wrap = wrapRef.value
  if (!wrap) return
  const side = sidebarRef.value?.getBoundingClientRect()
  if (side) pillColumn.value = { left: `${side.left}px`, width: `${side.width}px` }
  const origin = wrap.getBoundingClientRect()
  const viewTop = isMobile.value ? 48 : 0
  const viewBottom = window.innerHeight - (isMobile.value && sheetOpen.value ? sheetHeight.value : 0)
  let nearestAbove = -Infinity
  let nearestBelow = Infinity
  let inView = false
  for (const f of pendingDisplayed.value) {
    if (!boxes.value.get(f.id)?.length) continue
    const top = desiredTop(f) + origin.top
    if (top >= viewTop && top <= viewBottom) inView = true
    else if (top < viewTop) nearestAbove = Math.max(nearestAbove, top)
    else nearestBelow = Math.min(nearestBelow, top)
  }
  anyInView.value = inView
  if (inView && isMobile.value) seenOnMobile.value = true
  if (inView) offscreenDirection.value = null
  else if (viewTop - nearestAbove < nearestBelow - viewBottom) offscreenDirection.value = 'up'
  else if (nearestBelow !== Infinity) offscreenDirection.value = 'down'
  else offscreenDirection.value = nearestAbove !== -Infinity ? 'up' : null
}

function scrollToFinding(f: Finding, block: ScrollLogicalPosition = 'center') {
  const el = f.element ?? f.ranges[0].startContainer.parentElement
  if (!el) return
  if (isMobile.value) {
    const rect = (f.element ?? f.ranges[0]).getBoundingClientRect()
    const usable = Math.max(160, window.innerHeight - (sheetHeight.value || 220))
    const desired = Math.max(72, Math.min(usable * 0.36, usable - 96))
    window.scrollTo({ top: Math.max(0, rect.top + window.scrollY - desired), behavior: 'smooth' })
    return
  }
  const rect = (f.element ?? f.ranges[0]).getBoundingClientRect()
  const offset = block === 'center' ? window.innerHeight / 2 - rect.height / 2 : 80
  window.scrollTo({ top: Math.max(0, rect.top + window.scrollY - offset), behavior: 'smooth' })
}

/** Section editing with nothing to suggest here, but suggestions in other sections. */
const onlyElsewhere = computed(
  () => !!sectionOnly.value && !pendingDisplayed.value.length && outOfScope.value.above + outOfScope.value.below > 0,
)

/** Arrow on the banner: towards the suggestions (for a section, where the others are). */
const bannerDirection = computed(() =>
  onlyElsewhere.value ? (outOfScope.value.below > 0 ? 'down' : 'up') : offscreenDirection.value,
)

/** From a section with no suggestions: open the full page and go to the nearest one. */
function viewSuggestionsElsewhere() {
  const target = sectionElement()
  const direction = outOfScope.value.below > 0 ? 1 : -1
  editFullPage(direction)
  setTimeout(() => {
    const items = pendingDisplayed.value
    if (!items.length) return
    const next =
      direction === 1
        ? items.find((f) => target && target.compareDocumentPosition(f.element ?? f.ranges[0].startContainer) & Node.DOCUMENT_POSITION_FOLLOWING)
        : [...items].reverse().find((f) => target && target.compareDocumentPosition(f.element ?? f.ranges[0].startContainer) & Node.DOCUMENT_POSITION_PRECEDING)
    const f = next ?? items[0]
    scrollToFinding(f)
    setTimeout(() => focus(f), 600)
  }, 300)
}

/** Production: scroll to the nearest action, preferring the one above. */
function viewSuggestions() {
  if (onlyElsewhere.value) {
    viewSuggestionsElsewhere()
    return
  }
  const wrap = wrapRef.value
  if (!wrap) return
  const origin = wrap.getBoundingClientRect()
  const items = pendingDisplayed.value.filter((f) => boxes.value.get(f.id)?.length)
  if (!items.length) return
  const viewTop = isMobile.value ? 48 : 0
  const viewBottom = window.innerHeight
  const top = (f: Finding) => desiredTop(f) + origin.top
  const visible = items.find((f) => top(f) >= viewTop && top(f) <= viewBottom)
  if (visible) {
    focus(visible)
    return
  }
  const above = items.filter((f) => top(f) < viewTop)
  const below = items.filter((f) => top(f) > viewBottom)
  const target =
    offscreenDirection.value === 'up' ? (above[above.length - 1] ?? below[0]) : (below[0] ?? above[above.length - 1])
  if (!target) return
  scrollToFinding(target)
  setTimeout(() => focus(target), isMobile.value ? 600 : 400)
}

/** Opened for a task: turn suggestions on and go to the first one of `focusTypes`. */
function viewFocusTypes() {
  const types = props.focusTypes
  if (!types?.length) return
  const target = pendingSuggestions.value
    .filter((f) => types.includes(f.type) && !overlapsCheck(f))
    .sort(byPosition)[0]
  if (!target) return
  suggestionsOn.value = true
  // The desktop sidebar opening reflows the article, so measure after it.
  nextTick(() =>
    requestAnimationFrame(() => {
      scrollToFinding(target)
      setTimeout(() => focus(target), isMobile.value ? 600 : 400)
    }),
  )
}

// ── Focus / selection sync ───────────────────────────────────────────────────

function focus(f: Finding | null) {
  if (publishPathId.value && f?.id !== publishPathId.value) publishPathId.value = null
  focusedId.value = f?.id ?? null
  if (f && isMobile.value) openSheet(f)
  nextTick(layoutCards)
}

function findingAtPoint(x: number, y: number, target: EventTarget | null): Finding | undefined {
  const el = target as Element | null
  const byElement = pendingDisplayed.value.find((f) => f.element && el && (f.element === el || f.element.contains(el)) && (f.element.tagName === 'FIGURE' || f.element.tagName === 'SUP'))
  if (byElement) return byElement
  const origin = wrapRef.value!.getBoundingClientRect()
  const px = x - origin.left
  const py = y - origin.top
  const hits = pendingDisplayed.value.filter((f) =>
    (boxes.value.get(f.id) ?? []).some((b) => px >= b.left && px <= b.left + b.width && py >= b.top && py <= b.top + b.height),
  )
  // Smallest highlight wins (a link inside a paragraph-wide citation suggestion).
  return hits.sort((a, b) => area(a) - area(b))[0]
}
function area(f: Finding): number {
  return (boxes.value.get(f.id) ?? []).reduce((sum, b) => sum + b.width * b.height, 0)
}

function onSurfaceClick(e: MouseEvent) {
  if (review.value) return
  const hit = findingAtPoint(e.clientX, e.clientY, e.target)
  if ((e.target as Element).closest('a')) e.preventDefault()
  if (hit) {
    if (isMobile.value && sheetOpen.value && focusedId.value === hit.id) closeSheet()
    else focus(hit)
  }
}

let hoverFrame = 0
function onSurfaceMove(e: MouseEvent) {
  if (isMobile.value) return
  cancelAnimationFrame(hoverFrame)
  hoverFrame = requestAnimationFrame(() => {
    hoverId.value = findingAtPoint(e.clientX, e.clientY, e.target)?.id ?? null
  })
}

// ── Editing: input, paste, tone on leaving a paragraph ──────────────────────

let lastBlock: Element | null = null
const pageInfo = computed(() => ({ lang: props.page.lang, title: props.page.title }))

function onInput() {
  hasChanges.value = true
  canRedo.value = false
  const block = blockOf(window.getSelection()?.anchorNode ?? null)
  if (block) {
    modifiedBlocks.add(block)
    if (block.tagName === 'P' && !originalBlocks.has(block)) addedParagraphs.add(block)
    // Edits inside a tone check's paragraph make it stale — "Recheck" instead of "Revise".
    for (const c of pendingChecks.value) {
      if (c.type === 'tone' && c.data?.block === block && !c.revising) {
        c.revising = true
        checks.value = [...checks.value]
      }
    }
  }
  scheduleLayout()
}

async function runToneCheck(block: Element) {
  if (!modeEnabled.value) return
  if (!block.isConnected || dismissedToneBlocks.has(block)) return
  if (checks.value.some((c) => c.type === 'tone' && c.data?.block === block && status.get(c.id) === 'pending')) return
  const finding = await toneCheckForBlock(block, pageInfo.value)
  if (!finding) return
  status.set(finding.id, 'pending')
  checks.value = [...checks.value, finding]
  scheduleLayout()
}

/** addReference mid-edit only shows while suggestions are visible (`onBranchNodeChange`). */
function runAddReferenceMidEdit() {
  if (!modeEnabled.value || !suggestionsOn.value) return
  const found = addReferenceChecks(surfaceRef.value!, addedParagraphs).filter(
    (f) => !checks.value.some((c) => c.type === 'addReference' && c.data?.paragraph === f.data?.paragraph),
  )
  for (const f of found) status.set(f.id, 'pending')
  if (found.length) {
    checks.value = [...checks.value, ...found]
    scheduleLayout()
  }
}

function onSelectionChange() {
  const sel = window.getSelection()
  if (!sel?.anchorNode || !surfaceRef.value?.contains(sel.anchorNode)) return
  const block = blockOf(sel.anchorNode)
  if (lastBlock && block !== lastBlock && modifiedBlocks.has(lastBlock)) {
    const left = lastBlock
    modifiedBlocks.delete(left)
    void runToneCheck(left)
    runAddReferenceMidEdit()
  }
  lastBlock = block
  // Moving the cursor into an action's range focuses it (desktop).
  if (!isMobile.value && sel.isCollapsed && !review.value) {
    const range = sel.getRangeAt(0)
    const hit = pendingDisplayed.value.find((f) =>
      f.ranges.some((r) => r.isPointInRange(range.startContainer, range.startOffset)) && !isBlockFinding(f),
    )
    if (hit && hit.id !== focusedId.value) focus(hit)
  }
}

function onKeydown(e: KeyboardEvent) {
  // The original prototype also checks tone when pressing Enter in an edited paragraph.
  if (e.key === 'Enter') {
    const block = blockOf(window.getSelection()?.anchorNode ?? null)
    if (block && modifiedBlocks.has(block)) {
      modifiedBlocks.delete(block)
      setTimeout(() => {
        void runToneCheck(block)
        runAddReferenceMidEdit()
      }, 0)
    }
  }
}

function onPaste(e: ClipboardEvent) {
  const data = e.clipboardData
  if (!data) return
  e.preventDefault()
  const categories = categorizePaste(data)
  const text = data.getData('text/plain').replace(/\r?\n+/g, ' ')
  if (!text) return
  const sel = window.getSelection()
  if (!sel?.rangeCount) return
  document.execCommand('insertText', false, text)
  const after = sel.getRangeAt(0)
  const node = after.startContainer
  const range = document.createRange()
  if (node.nodeType === 3 && after.startOffset >= text.length) {
    range.setStart(node, after.startOffset - text.length)
    range.setEnd(node, after.startOffset)
  } else {
    range.setStart(node, 0)
    range.setEnd(after.startContainer, after.startOffset)
  }
  if (!modeEnabled.value) return
  const finding = pasteFinding(range, categories)
  if (!finding) return
  status.set(finding.id, 'pending')
  checks.value = [...checks.value, finding]
  // takesFocus: the paste check opens itself.
  nextTick(() => {
    scheduleLayout()
    focus(finding)
  })
}

function onCopy(e: ClipboardEvent) {
  // Mark copies from the article as internal (VE → VE pastes aren't checked).
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return
  e.clipboardData?.setData('text/plain', sel.toString())
  e.clipboardData?.setData('application/x-protowiki-ve', '1')
  e.preventDefault()
}

function undo() {
  document.execCommand('undo')
  canRedo.value = true
  scheduleLayout()
}
function redo() {
  document.execCommand('redo')
  scheduleLayout()
}
function textStyle(command: string) {
  document.execCommand(command)
  hasChanges.value = true
}

// ── Acting on a card ─────────────────────────────────────────────────────────

const dialog = ref<{
  kind: VeDialogKind
  finding: Finding
  initial?: string
  fields?: { key: string; label: string }[]
} | null>(null)

function complete(f: Finding, message?: string) {
  status.set(f.id, 'done')
  hasChanges.value = true
  if (review.value) {
    scheduleLayout()
    return
  }
  if (focusedId.value === f.id) focusedId.value = null
  const isSuggestion = f.mode === 'suggestion'
  if (isSuggestion && !publishPathShown && editorShowsPublishPath(editCount.value)) {
    // `showPublishPath`: once, for the first completed suggestion.
    publishPathShown = true
    publishPathId.value = f.id
    if (isMobile.value) {
      closeSheet()
      setTimeout(() => openPublishPathSheet(f), 500)
    }
  } else {
    successTitles.set(f.id, message ?? (isSuggestion ? STR.successSuggestion : STR.successCheck))
    successIds.add(f.id)
    setTimeout(() => {
      successIds.delete(f.id)
      scheduleLayout()
    }, 2000)
    if (isMobile.value) closeSheet()
  }
  scheduleLayout()
}

function dismiss(f: Finding) {
  if (f.type === 'tone' && f.data?.block) dismissedToneBlocks.add(f.data.block)
  if (isMobile.value && !review.value) {
    dismissingId.value = f.id
    setTimeout(() => {
      dismissingId.value = null
      status.set(f.id, 'dismissed')
      closeSheet()
      scheduleLayout()
    }, 260)
    return
  }
  status.set(f.id, 'dismissed')
  if (focusedId.value === f.id) focusedId.value = null
  scheduleLayout()
}

async function act(f: Finding, action: ChoiceAction, reason?: string) {
  void reason
  const root = surfaceRef.value!
  if (review.value) return reviewAct(f, action)
  switch (action) {
    case 'dismiss':
    case 'reject':
      return dismiss(f)
    case 'keep':
      return complete(f, f.type === 'llm-paste' ? 'Thank you for sharing your reason to keep the pasted text!' : 'Thank you for sharing your reason to keep the pasted text!')
    case 'accept':
      if (f.type === 'suggestedLink') {
        fix.addInternalLink(f.ranges[0], f.data!.target)
        return complete(f)
      }
      openCitoid(f)
      return
    case 'add':
      openCitoid(f, { replace: true })
      return
    case 'convert':
      openCitoid(f, { replace: true, query: f.data?.href })
      return
    case 'edit':
      if (f.type === 'disambiguation') {
        dialog.value = { kind: 'link', finding: f, initial: f.data?.title }
        return
      }
      if (f.type === 'imageCaption') {
        dialog.value = { kind: 'caption', finding: f }
        return
      }
      if (f.type === 'requiredTemplateParam') {
        dialog.value = {
          kind: 'template',
          finding: f,
          fields: (f.data!.missing as { template: string; name: string; partIndex: number }[]).map((m) => ({
            key: `${m.partIndex}:${m.name}`,
            label: `${m.template.replace(/^Template:/, '')}: ${m.name}`,
          })),
        }
        return
      }
      if (f.type === 'tone' || f.type === 'leadLength') {
        // Revise: tag as revising and put the cursor at the end of the paragraph (or lead).
        f.revising = true
        if (f.mode === 'check') checks.value = [...checks.value]
        else suggestions.value = [...suggestions.value]
        const range = document.createRange()
        const end = f.type === 'leadLength' ? (f.data!.paragraphs as Element[]).at(-1)! : f.data!.block
        range.selectNodeContents(end)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        surfaceRef.value?.focus()
        if (isMobile.value) closeSheet()
      }
      return
    case 'recheck': {
      busyId.value = f.id
      const started = Date.now()
      if (f.type === 'leadLength') {
        // Recheck: still over 400 words?
        const d = prepare(surfaceRef.value!, props.page)
        const words = leadWordCount(d, leadParagraphs(d))
        await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - started))))
        busyId.value = null
        f.revising = false
        suggestions.value = [...suggestions.value]
        if (words <= 400) complete(f, 'Thank you for considering the length of the lead section!')
        return
      }
      const stillFlagged = await Promise.race([
        recheckTone(f.data!.block, pageInfo.value),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000)),
      ])
      await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - started))))
      busyId.value = null
      if (!stillFlagged) complete(f, 'Thank you for considering tone!')
      return
    }
    case 'remove':
      if (f.type === 'paste' || f.type === 'llm-paste') fix.removeRanges(f.ranges)
      else if (f.type === 'doubleBold') fix.removeBold(f.element!)
      else fix.removeLink(f.element!)
      return complete(f)
    case 'merge':
      fix.mergeLinks(f.data!.links)
      return complete(f)
    case 'fix':
      if (f.type === 'fakeHeading') {
        const paragraph = f.data!.paragraph as Element
        fix.paragraphToHeading(paragraph, Math.max(fix.precedingHeadingLevel(paragraph) ?? 3, 3))
        return complete(f)
      }
      if (f.type === 'redirect') {
        // "Update link": point at the redirect's target; the link text stays.
        busyId.value = f.id
        const to = await resolveRedirect(props.page.host, f.data!.title)
        busyId.value = null
        if (!to) return
        fix.relink(f.element!, to)
        return complete(f)
      }
      fix.setHeadingLevel(f.data!.heading, f.data!.targetLevel)
      return complete(f)
    case 'valid':
      return complete(f)
    case 'invalid':
      return dismiss(f)
    case 'delete':
      fix.deleteRange(f.ranges[0])
      return complete(f)
    case 'useTarget':
      fix.fixYearLink(f, 'target')
      return complete(f)
    case 'useLabel':
      fix.fixYearLink(f, 'label')
      return complete(f)
  }
  void root
}

function onDialogSubmit(value: string) {
  const d = dialog.value
  dialog.value = null
  if (!d) return
  const root = surfaceRef.value!
  const f = d.finding
  if (d.kind === 'citation') {
    if (f.type === 'citationNeeded') fix.replaceWithCitation(root, f.element!, value)
    else if (f.type === 'convertReference') {
      /* Citoid replaces the bare reference with a formatted one: the marker stays. */
    } else fix.addCitationToParagraph(root, f.data!.paragraph, value)
  } else if (d.kind === 'link') {
    fix.relink(f.element!, value)
  } else if (d.kind === 'caption') {
    fix.setImageCaption(f.element!, value)
  } else if (d.kind === 'template') {
    fix.setTemplateParams(f.element!, JSON.parse(value), f.data!.missing)
  }
  if (review.value) {
    reviewResolved(f)
    return
  }
  complete(f)
}

// ── Mobile sheet ─────────────────────────────────────────────────────────────

const sheetOpen = ref(false)
const sheetRef = ref<HTMLElement | null>(null)
const sheetHeight = ref(0)
const sheetMode = ref<'finding' | 'publishPath'>('finding')
const sheetEntering = ref(false)
const rollDirection = ref<'next' | 'prev' | null>(null)

const sheetFinding = computed(() =>
  [...suggestions.value, ...checks.value].find((f) => f.id === (sheetMode.value === 'publishPath' ? publishPathId.value : focusedId.value)) ?? null,
)

function openSheet(f: Finding) {
  sheetMode.value = 'finding'
  focusedId.value = f.id
  sheetOpen.value = true
  nextTick(() => {
    sheetHeight.value = sheetRef.value?.offsetHeight ?? 0
    const rect = (f.element ?? f.ranges[0]).getBoundingClientRect()
    const sheetTop = window.innerHeight - sheetHeight.value
    if (!(rect.top >= 56 && rect.bottom <= sheetTop - 16)) scrollToFinding(f)
  })
}

function openPublishPathSheet(f: Finding) {
  sheetMode.value = 'publishPath'
  publishPathId.value = f.id
  sheetEntering.value = true
  sheetOpen.value = true
  nextTick(() => requestAnimationFrame(() => (sheetEntering.value = false)))
}

function closeSheet() {
  sheetOpen.value = false
  if (sheetMode.value === 'publishPath') publishPathId.value = null
  sheetMode.value = 'finding'
  if (!review.value) focusedId.value = null
}

const pagerItems = computed(() => (review.value ? review.value.items.filter((f) => status.get(f.id) === 'pending') : pendingDisplayed.value))
const pagerIndex = computed(() => Math.max(0, pagerItems.value.findIndex((f) => f.id === focusedId.value)))

function goTo(delta: 1 | -1) {
  const next = pagerItems.value[pagerIndex.value + delta]
  if (!next) return
  rollDirection.value = delta === 1 ? 'next' : 'prev'
  setTimeout(() => (rollDirection.value = null), 300)
  if (review.value) {
    review.value.index = review.value.items.indexOf(next)
    focusedId.value = next.id
    scrollToFinding(next)
    nextTick(layoutCards)
    return
  }
  if (isMobile.value) openSheet(next)
  else focus(next)
  scrollToFinding(next)
}

/** Publish-path card "View more": go to the adjacent action. */
function viewMore() {
  const current = [...suggestions.value, ...checks.value].find((f) => f.id === publishPathId.value)
  publishPathId.value = null
  sheetMode.value = 'finding'
  const items = pendingDisplayed.value
  const next = current ? items.find((f) => byPosition(f, current) > 0) ?? items[0] : items[0]
  if (!next) {
    closeSheet()
    return
  }
  scrollToFinding(next)
  focus(next)
}

// Mobile gutter lightbulbs (one per highlight row; overlapping rows share one).
const gutterMarks = computed(() => {
  if (!isMobile.value) return []
  const marks: { top: number; ids: string[]; state: 'pending' | 'success' | 'check'; experimental: boolean }[] = []
  for (const f of displayed.value) {
    const list = boxes.value.get(f.id)
    if (!list?.length) continue
    const top = Math.min(...list.map((b) => b.top))
    const state = successIds.has(f.id) ? 'success' : f.mode === 'check' ? 'check' : 'pending'
    const existing = marks.find((m) => Math.abs(m.top - top) < 20)
    if (existing) {
      existing.ids.push(f.id)
      if (state === 'check') existing.state = 'check'
      existing.experimental = existing.experimental && !!f.experimental
    } else marks.push({ top, ids: [f.id], state, experimental: !!f.experimental })
  }
  return marks
})

function openMark(ids: string[]) {
  const f = displayed.value.find((d) => d.id === ids[0])
  if (!f) return
  if (sheetOpen.value && focusedId.value === f.id) closeSheet()
  else focus(f)
}

// ── Pre-save: Before publishing ──────────────────────────────────────────────

const review = ref<{ items: Finding[]; index: number } | null>(null)
const currentReview = computed(() => {
  if (!review.value) return null
  const pending = review.value.items.filter((f) => status.get(f.id) === 'pending')
  return pending.find((f) => f.id === focusedId.value) ?? pending[0] ?? null
})
const reviewBlocks = computed(() => {
  const set = new Set<Element>()
  for (const f of review.value?.items ?? []) {
    const block = f.data?.paragraph ?? f.data?.block
    if (block) set.add(block)
  }
  return set
})
const publishing = ref(false)

watch(reviewBlocks, (blocks, old) => {
  old?.forEach((b) => b.classList.remove('ve-review-focus'))
  blocks.forEach((b) => b.classList.add('ve-review-focus'))
})

async function publish() {
  if (publishing.value) return
  if (!modeEnabled.value) {
    finishPublish()
    return
  }
  publishing.value = true
  const root = surfaceRef.value!
  // onBeforeSave, without suggestions: addReference on new paragraphs, tone on edited ones.
  const items: Finding[] = addReferenceChecks(root, addedParagraphs).filter(
    (f) => !checks.value.some((c) => c.type === 'addReference' && c.data?.paragraph === f.data?.paragraph && status.get(c.id) === 'dismissed'),
  )
  const toneBlocks = new Set<Element>()
  for (const c of checks.value) if (c.type === 'tone' && status.get(c.id) === 'pending') toneBlocks.add(c.data!.block)
  for (const b of modifiedBlocks) toneBlocks.add(b)
  for (const block of toneBlocks) {
    if (!block.isConnected || dismissedToneBlocks.has(block)) continue
    const tone = await toneCheckForBlock(block, pageInfo.value)
    if (tone) items.push(tone)
  }
  publishing.value = false
  if (!items.length) {
    finishPublish()
    return
  }
  items.sort(byPosition)
  for (const f of items) status.set(f.id, 'pending')
  review.value = { items, index: 0 }
  sheetOpen.value = isMobile.value
  sheetMode.value = 'finding'
  focusedId.value = items[0].id
  scrollToFinding(items[0])
  scheduleLayout()
}

function reviewAct(f: Finding, action: ChoiceAction) {
  if (action === 'dismiss' || action === 'reject') {
    if (f.type === 'tone' && f.data?.block) dismissedToneBlocks.add(f.data.block)
    status.set(f.id, 'dismissed')
    return reviewAdvance(true)
  }
  if (action === 'accept') {
    openCitoid(f)
    return
  }
  if (action === 'edit' && f.type === 'tone') {
    // "Revise" leaves pre-save and goes back to editing that paragraph.
    review.value = null
    sheetOpen.value = false
    const existing = checks.value.find((c) => c.type === 'tone' && c.data?.block === f.data?.block)
    if (!existing) {
      checks.value = [...checks.value, f]
    }
    status.set((existing ?? f).id, 'pending')
    focusedId.value = null
    void act(existing ?? f, 'edit')
    scheduleLayout()
    return
  }
}

function reviewResolved(f: Finding) {
  status.set(f.id, 'done')
  hasChanges.value = true
  setTimeout(() => reviewAdvance(false), 500)
}

function reviewAdvance(rejected: boolean) {
  if (!review.value) return
  const pending = review.value.items.filter((f) => status.get(f.id) === 'pending')
  if (pending.length) {
    focusedId.value = pending[0].id
    scrollToFinding(pending[0])
    scheduleLayout()
    return
  }
  // Last one resolved: continue to save (2 s on desktop so the change can be seen).
  setTimeout(finishPublish, !isMobile.value && !rejected ? 2000 : 0)
}

function leaveReview() {
  review.value = null
  sheetOpen.value = false
  focusedId.value = null
  scheduleLayout()
}

// ── Save dialog ──────────────────────────────────────────────────────────────

const { user, prependCurrentUserPageInList } = useConfig()
const saveOpen = ref(false)
const saveDiff = ref<DiffBlock[]>([])
/** Text of every block when the editor opened, for "Review your changes". */
const originalTexts = new Map<Element, string>()

function blockText(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('[data-ve-ui], style').forEach((n) => n.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function computeDiff(): DiffBlock[] {
  const out: DiffBlock[] = []
  const surface = surfaceRef.value!
  for (const [el, before] of originalTexts) {
    if (!el.isConnected) {
      if (before) out.push({ before, after: '' })
      continue
    }
    const after = blockText(el)
    if (after !== before) out.push({ before, after })
  }
  surface.querySelectorAll(DIFF_BLOCKS).forEach((el) => {
    if (!originalTexts.has(el) && !el.closest('[contenteditable="false"]')) {
      const after = blockText(el)
      if (after) out.push({ before: '', after })
    }
  })
  return out
}

/** "Publish changes": after the pre-save checks, the save dialog. */
function finishPublish() {
  review.value = null
  saveDiff.value = computeDiff()
  saveOpen.value = true
}

function onSaved(_summary: string, options: { watchPage: boolean }) {
  saveOpen.value = false
  if (user.value !== 'logged-out') {
    prependCurrentUserPageInList('editedPages', props.page.title)
    if (options.watchPage) {
      prependCurrentUserPageInList('watchlist', props.page.title)
    }
  }
  emit('published', cleanHtml())
}

// ── Citoid ───────────────────────────────────────────────────────────────────

const citoid = ref<{ finding: Finding; anchor: HTMLElement | null; replace: boolean; query?: string } | null>(null)
let caretAnchor: HTMLElement | null = null

function openCitoid(f: Finding, options: { replace?: boolean; query?: string } = {}) {
  let anchor: HTMLElement | null = (f.element as HTMLElement | undefined) ?? null
  if (!anchor && f.data?.paragraph) {
    // Production collapses the cursor to the paragraph end and opens Citoid there.
    caretAnchor = document.createElement('span')
    caretAnchor.className = 've-caret-anchor'
    caretAnchor.setAttribute('data-ve-ui', '')
    caretAnchor.setAttribute('contenteditable', 'false')
    ;(f.data.paragraph as Element).appendChild(caretAnchor)
    anchor = caretAnchor
  }
  if (isMobile.value) closeSheet()
  citoid.value = { finding: f, anchor, replace: !!options.replace, query: options.query }
}

function closeCitoid() {
  caretAnchor?.remove()
  caretAnchor = null
  citoid.value = null
}

const existingReferences = computed<ExistingReference[]>(() => {
  void citoid.value
  const list: ExistingReference[] = []
  surfaceRef.value
    ?.querySelectorAll('ol.mw-references > li, ol.references > li')
    .forEach((li, i) => {
      const text = li.querySelector('.mw-reference-text, .reference-text')
      if (!text) return
      const labelMatch = li.id.match(/^cite_note-(\d+)$/)
      list.push({
        label: labelMatch ? `[${labelMatch[1]}]` : `[${i + 1}]`,
        html: text.innerHTML,
      })
    })
  return list
})

function onCitationInsert(value: CitationInsert) {
  const c = citoid.value
  if (!c) return
  const root = surfaceRef.value!
  const f = c.finding
  closeCitoid()
  if (f.type === 'citationNeeded') fix.replaceWithCitation(root, f.element!, value.html, value.reuseLabel)
  else if (f.type === 'convertReference') fix.setReferenceBody(f.element!, value.html)
  else fix.addCitationToParagraph(root, f.data!.paragraph, value.html, value.reuseLabel)
  if (review.value) {
    reviewResolved(f)
    return
  }
  complete(f)
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

let resizeObserver: ResizeObserver | null = null

function onScroll() {
  updateViewport()
}

onMounted(async () => {
  const surface = surfaceRef.value!
  const minimumLoad = new Promise((resolve) => setTimeout(resolve, isMobile.value ? 1200 : 1000))
  surface.innerHTML = props.html
  normalizeHandAuthoredReferences(surface)
  // Chips need layout (they mark templates that render nothing), so before hiding sections.
  addTemplateChips(surface)
  if (sectionOnly.value) applySectionOnly(sectionOnly.value)
  // Media, references and templates are edited through dialogs, not typed into.
  surface
    .querySelectorAll(
      'figure, sup.mw-ref, [typeof~="mw:Transclusion"], table.infobox, .navbox, .reflist, ol.mw-references, ol.references, style',
    )
    .forEach((el) => el.setAttribute('contenteditable', 'false'))
  originalBlocks = new WeakSet(Array.from(surface.querySelectorAll(BLOCK_SELECTOR)))
  surface.querySelectorAll(DIFF_BLOCKS).forEach((el) => {
    if (!el.closest('[contenteditable="false"]')) originalTexts.set(el, blockText(el))
  })
  try {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  } catch {
    /* unsupported */
  }
  document.addEventListener('selectionchange', onSelectionChange)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', scheduleLayout)
  resizeObserver = new ResizeObserver(() => scheduleLayout())
  resizeObserver.observe(surface)
  const detection = runDetection()
  await minimumLoad
  loadingEditor.value = false
  emit('sidebar', suggestionsOn.value && !isMobile.value)
  if (!isMobile.value && props.section) nextTick(() => scrollToSection(props.section!))
  if (sectionOnly.value) nextTick(scrollPastTopButton)
  scheduleLayout()
  await detection
  updateViewport()
  viewFocusTypes()
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', scheduleLayout)
  resizeObserver?.disconnect()
  clearTimeout(layoutTimer)
})

watch(displayed, () => scheduleLayout())
watch([focusedId, () => successIds.size, publishPathId], () => nextTick(layoutCards))
watch(boxes, () => updateViewport())

// ── Leaving the editor ───────────────────────────────────────────────────────

/** "Are you sure?" (`visualeditor-viewpage-savewarning`) when leaving with changes. */
const leaveOpen = ref(false)

function requestExit() {
  if (hasChanges.value) leaveOpen.value = true
  else emit('exit')
}

function discardEdits() {
  leaveOpen.value = false
  emit('exit')
}

// Exposed for the page (Read / Edit tabs).
defineExpose({ hasChanges, requestExit })

/** Card icon: alert for checks, dashed lightbulb for experimental suggestions. */
const iconFor = (f: Finding) =>
  f.mode === 'check' ? cdxIconAlert : f.experimental ? cdxIconLightbulbDashed : cdxIconLightbulb

const subheadingFor = (f: Finding) =>
  f.experimental ? (f.mode === 'check' ? 'Experimental edit check for testing' : 'Experimental suggestion for testing') : null

const titleFor = (f: Finding) =>
  successIds.has(f.id) ? successTitles.get(f.id) ?? STR.successSuggestion : f.title
</script>

<template>
  <div
    class="ve-editor"
    :data-skin="skin"
    :class="{
      've-editor--suggestions': suggestionsOn,
      've-editor--glow': glow,
      've-editor--review': !!review,
      've-editor--sheet-open': sheetOpen,
      've-editor--loading': loadingEditor,
    }"
  >
    <VeToolbar
      v-model:suggestions-on="suggestionsOn"
      :show-suggestions-toggle="modeEnabled"
      :skin="skin"
      :count="badgeCount"
      :can-undo="hasChanges"
      :can-redo="canRedo"
      :can-publish="hasChanges && !publishing"
      :review="!!review"
      :loading="loadingEditor"
      @undo="undo"
      @redo="redo"
      @close="requestExit"
      @publish="publish"
      @back="leaveReview"
      @text-style="textStyle"
    />

    <!-- Vector: the tagline sits under the editor toolbar. -->
    <p v-if="!isMobile" class="ve-editor__tagline">From Wikipedia, the free encyclopedia</p>

    <div ref="layoutRef" class="ve-editor__layout" :style="{ minHeight: sectionOnly ? layoutMinHeight : undefined }">
      <div v-if="sectionOnly && !loadingEditor && !sectionEdges.first" class="ve-full-page ve-full-page--top">
        <div class="ve-full-page__skeleton" aria-hidden="true"><div /><div /><div /><div /></div>
        <CdxButton class="ve-full-page__btn" @click="editFullPage(-1)">
          <span>Edit full page</span>
          <span
            v-if="suggestionsOn && outOfScope.above > 0"
            class="ve-full-page__indicator"
            :aria-label="`${outOfScope.above} suggestions above`"
          >
            <CdxIcon :icon="cdxIconLightbulb" />
          </span>
        </CdxButton>
      </div>
      <div ref="wrapRef" class="ve-editor__surface-wrap">
        <!-- Highlights (VE draws selections as overlays; the markup stays untouched) -->
        <div class="ve-editor__highlights" aria-hidden="true">
          <template v-for="f in displayed" :key="f.id">
            <div
              v-for="(b, i) in boxes.get(f.id) ?? []"
              :key="i"
              class="ve-hl"
              :class="[`ve-hl--${highlightState(f)}`, `ve-hl--${f.mode}`]"
              :style="{ top: `${b.top}px`, left: `${b.left}px`, width: `${b.width}px`, height: `${b.height}px` }"
            />
            <div
              v-if="!isMobile && blockBars.get(f.id)"
              class="ve-hl-bar"
              :class="[`ve-hl-bar--${highlightState(f)}`, `ve-hl-bar--${f.mode}`]"
              :style="{ top: `${blockBars.get(f.id)!.top}px`, height: `${blockBars.get(f.id)!.height}px` }"
            />
          </template>
        </div>

        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
        <div
          ref="surfaceRef"
          class="mw-parser-output ve-editor__surface"
          :class="{ 've-editor__surface--review': !!review }"
          contenteditable="true"
          spellcheck="true"
          role="textbox"
          aria-multiline="true"
          :aria-label="`Editing ${page.title}`"
          @input="onInput"
          @paste="onPaste"
          @copy="onCopy"
          @keydown="onKeydown"
          @click="onSurfaceClick"
          @mousemove="onSurfaceMove"
          @mouseleave="hoverId = null"
        />

        <!-- Mobile gutter -->
        <div v-if="isMobile && (suggestionsOn || pendingChecks.length)" class="ve-gutter" aria-hidden="false">
          <button
            v-for="mark in gutterMarks"
            :key="mark.ids.join()"
            type="button"
            class="ve-gutter__mark"
            :class="`ve-gutter__mark--${mark.state}`"
            :style="{ top: `${mark.top}px` }"
            :aria-label="mark.state === 'check' ? 'Show check' : 'Show suggestion'"
            @mousedown.prevent
            @click.stop="openMark(mark.ids)"
          >
            <svg v-if="mark.state === 'success'" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 1a9 9 0 110 18 9 9 0 010-18" fill="var(--color-success, #14866d)" />
              <path class="ve-success-check" d="M5.5 11.2 L8.5 13.5 L14.5 6.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <CdxIcon
              v-else
              :icon="mark.state === 'check' ? cdxIconAlert : mark.experimental ? cdxIconLightbulbDashed : cdxIconLightbulb"
            />
            <span v-if="mark.ids.length > 1" class="ve-gutter__count">{{ mark.ids.length }}</span>
          </button>
        </div>
      </div>

      <div v-if="sectionOnly && !loadingEditor && !sectionEdges.last" class="ve-full-page ve-full-page--bottom">
        <div class="ve-full-page__skeleton" aria-hidden="true"><div /><div /><div /><div /></div>
        <CdxButton class="ve-full-page__btn" @click="editFullPage(1)">
          <span>Edit full page</span>
          <span
            v-if="suggestionsOn && outOfScope.below > 0"
            class="ve-full-page__indicator"
            :aria-label="`${outOfScope.below} suggestions below`"
          >
            <CdxIcon :icon="cdxIconLightbulb" />
          </span>
        </CdxButton>
      </div>

      <!-- Desktop sidebar -->
      <aside
        v-if="!isMobile && !loadingEditor && (suggestionsOn || pendingChecks.length || review)"
        ref="sidebarRef"
        class="ve-sidebar"
        :style="{ minHeight: `${sidebarHeight}px` }"
        :aria-label="review ? STR.reviewChanges : 'Suggestions'"
      >
        <!-- Before publishing: "Review changes" heading above the card, "N of M" below it -->
        <template v-if="review && reviewBox">
          <div class="ve-review-heading" :style="{ top: `${reviewBox.top - 52}px` }">
            {{ STR.reviewChanges }}
          </div>
          <div class="ve-review-pager" :style="{ top: `${reviewBox.top + reviewBox.height + 8}px` }">
            <span>{{ STR.nOfM(pagerIndex + 1, pagerItems.length) }}</span>
            <CdxButton weight="quiet" aria-label="prev" :disabled="pagerIndex <= 0" @click="goTo(-1)">
              <CdxIcon class="ve-icon-flip" :icon="cdxIconExpand" />
            </CdxButton>
            <CdxButton weight="quiet" aria-label="next" :disabled="pagerIndex >= pagerItems.length - 1" @click="goTo(1)">
              <CdxIcon :icon="cdxIconExpand" />
            </CdxButton>
          </div>
        </template>
        <template v-for="f in review ? (currentReview ? [currentReview] : []) : displayed" :key="f.id">
          <div
            :ref="(el) => setCardEl(f.id, el)"
            class="ve-card"
            :class="{
              've-card--expanded': focusedId === f.id || publishPathId === f.id || successIds.has(f.id) || !!review,
              've-card--hover': hoverId === f.id,
              've-card--check': f.mode === 'check',
              've-card--success': successIds.has(f.id) || publishPathId === f.id,
            }"
            :style="{ top: `${cardTops.get(f.id) ?? 0}px` }"
            @mouseenter="hoverId = f.id"
            @mouseleave="hoverId = null"
          >
            <!-- Publish path -->
            <template v-if="publishPathId === f.id">
              <div class="ve-card__header ve-card__header--static">
                <span class="ve-card__icon ve-card__icon--success"><CdxIcon :icon="cdxIconSuccess" /></span>
                <span class="ve-card__title">{{ STR.successSuggestion }}</span>
              </div>
              <div class="ve-card__content">
                <p class="ve-card__text">
                  Your change is ready to go live on Wikipedia. You can publish this change now or look for more to improve.
                </p>
                <div class="ve-card__actions">
                  <CdxButton v-if="pendingSuggestions.length" @click="viewMore">View more</CdxButton>
                  <CdxButton action="progressive" @click="publishPathId = null; publish()">{{ STR.publish }}</CdxButton>
                </div>
              </div>
            </template>

            <!-- Success (system message, auto-dismissed) -->
            <div v-else-if="successIds.has(f.id)" class="ve-card__header ve-card__header--static">
              <span class="ve-card__icon ve-card__icon--success">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 1a9 9 0 110 18 9 9 0 010-18" fill="var(--color-success, #14866d)" />
                  <path class="ve-success-check" d="M5.5 11.2 L8.5 13.5 L14.5 6.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="ve-card__title">{{ titleFor(f) }}</span>
            </div>

            <template v-else>
              <button
                type="button"
                class="ve-card__header"
                :aria-expanded="focusedId === f.id || !!review"
                @click="review ? null : focusedId === f.id ? focus(null) : focus(f)"
              >
                <span class="ve-card__icon"><CdxIcon :icon="iconFor(f)" /></span>
                <span class="ve-card__heading">
                  <span class="ve-card__title">{{ f.title }}</span>
                  <span v-if="subheadingFor(f) && (focusedId === f.id || review)" class="ve-card__subheading">
                    {{ subheadingFor(f) }}
                  </span>
                </span>
              </button>
              <div v-if="focusedId === f.id || review" class="ve-card__content">
                <FindingBody :finding="f" skin="desktop" :busy="busyId === f.id" @act="(a, r) => act(f, a, r)" />
              </div>
            </template>
          </div>
        </template>

        <!-- View suggestions -->
        <div
          v-if="!review && suggestionsOn && !anyInView && offscreenDirection && pendingDisplayed.length && !bannerDismissed"
          class="ve-view-pill-wrap"
          :class="{ 've-view-pill-wrap--up': offscreenDirection === 'up' }"
          :style="pillColumn"
        >
          <div class="ve-view-pill" role="group" aria-label="View suggestions">
            <CdxButton action="progressive" size="large" class="ve-view-pill__main" @click="viewSuggestions">
              <CdxIcon :icon="bannerDirection === 'up' ? cdxIconArrowUp : cdxIconArrowDown" />
              View suggestions
            </CdxButton>
            <CdxButton
              action="progressive"
              size="large"
              class="ve-view-pill__close"
              aria-label="Dismiss suggestions"
              @click="bannerDismissed = true"
            >
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile: View suggestions banner -->
    <div
      v-if="isMobile && !review && suggestionsOn && !detecting && !seenOnMobile && !sheetOpen && (pendingDisplayed.length || onlyElsewhere) && !bannerDismissed"
      class="ve-mobile-banner"
    >
      <div class="ve-view-pill ve-view-pill--mobile" role="group" aria-label="View suggestions">
        <CdxButton action="progressive" size="large" class="ve-view-pill__main" @click="viewSuggestions">
          <CdxIcon :icon="bannerDirection === 'up' ? cdxIconArrowUp : cdxIconArrowDown" />
          View suggestions
        </CdxButton>
        <CdxButton
          action="progressive"
          size="large"
          class="ve-view-pill__close"
          aria-label="Dismiss suggestions"
          @click="bannerDismissed = true"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>
    </div>

    <!-- Mobile: bottom sheet -->
    <div
      v-if="isMobile && sheetOpen && (sheetFinding || review)"
      ref="sheetRef"
      class="ve-sheet"
      :class="{ 've-sheet--check': (review ? currentReview : sheetFinding)?.mode === 'check', 've-sheet--entering': sheetEntering }"
      role="dialog"
      :aria-label="review ? STR.reviewChanges : 'Suggestion'"
    >
      <template v-if="sheetMode === 'publishPath' && sheetFinding">
        <div class="ve-sheet__header ve-sheet__header--success">
          <CdxIcon :icon="cdxIconSuccess" />
          <div class="ve-sheet__title">{{ STR.successSuggestion }}</div>
          <button type="button" class="ve-sheet__icon-btn" aria-label="Close" @click="closeSheet"><CdxIcon :icon="cdxIconClose" /></button>
        </div>
        <p class="ve-sheet__text">Your change is ready to go live on Wikipedia. You can publish this change now or look for more to improve.</p>
        <div class="ve-sheet__actions">
          <CdxButton v-if="pendingSuggestions.length" @click="viewMore">View more</CdxButton>
          <CdxButton action="progressive" @click="closeSheet(); publish()">{{ STR.publish }}</CdxButton>
        </div>
      </template>
      <template v-else-if="(review ? currentReview : sheetFinding) as Finding">
        <div
          class="ve-sheet__body"
          :class="{
            've-sheet__body--dismiss': dismissingId === (review ? currentReview : sheetFinding)?.id,
            [`ve-sheet__body--roll-${rollDirection}`]: !!rollDirection,
          }"
        >
          <div class="ve-sheet__header">
            <CdxIcon :icon="iconFor((review ? currentReview : sheetFinding)!)" />
            <div class="ve-sheet__heading">
              <div class="ve-sheet__title">{{ (review ? currentReview : sheetFinding)!.title }}</div>
              <div v-if="subheadingFor((review ? currentReview : sheetFinding)!)" class="ve-sheet__subheading">
                {{ subheadingFor((review ? currentReview : sheetFinding)!) }}
              </div>
            </div>
            <button v-if="!review" type="button" class="ve-sheet__icon-btn" aria-label="Close" @click="closeSheet">
              <CdxIcon :icon="cdxIconClose" />
            </button>
          </div>
          <FindingBody
            class="ve-sheet__finding"
            :finding="(review ? currentReview : sheetFinding)!"
            skin="mobile"
            :busy="busyId === (review ? currentReview : sheetFinding)!.id"
            @act="(a, r) => act((review ? currentReview : sheetFinding)!, a, r)"
          />
        </div>
        <div v-if="pagerItems.length > 0" class="ve-sheet__pager">
          <span class="ve-sheet__count">{{ STR.nOfM(pagerIndex + 1, pagerItems.length) }}</span>
          <template v-if="pagerItems.length > 1">
            <CdxButton weight="quiet" :aria-label="review ? 'Previous check' : 'Previous suggestion'" :disabled="pagerIndex <= 0" @click="goTo(-1)">
              <CdxIcon class="ve-icon-flip" :icon="cdxIconExpand" />
            </CdxButton>
            <CdxButton weight="quiet" :aria-label="review ? 'Next check' : 'Next suggestion'" :disabled="pagerIndex >= pagerItems.length - 1" @click="goTo(1)">
              <CdxIcon :icon="cdxIconExpand" />
            </CdxButton>
          </template>
        </div>
      </template>
    </div>

    <!-- Toggle toasts: dark Minerva toast / Codex toast on desktop -->
    <div v-if="isMobile && toast" :key="toast.id" class="ve-mobile-toast" role="status" aria-live="polite">{{ toast.text }}</div>
    <CdxToast v-else-if="toast" :key="toast.id" type="notice" @user-dismissed="toast = null">{{ toast.text }}</CdxToast>

    <CdxDialog v-model:open="leaveOpen" class="ve-leave" title="Are you sure?" use-close-button>
      Are you sure you want to leave editing mode without publishing first?
      <template #footer>
        <div class="ve-leave__actions" :class="{ 've-leave__actions--stacked': isMobile }">
          <CdxButton action="destructive" @click="discardEdits">Discard edits</CdxButton>
          <CdxButton @click="leaveOpen = false">Continue editing</CdxButton>
        </div>
      </template>
    </CdxDialog>

    <CitoidDialog
      :open="!!citoid"
      :skin="skin"
      :host="page.host"
      :page-title="page.title"
      :anchor="citoid?.anchor ?? null"
      :replace="citoid?.replace"
      :initial-query="citoid?.query"
      :references="existingReferences"
      @insert="onCitationInsert"
      @cancel="closeCitoid"
    />

    <PublishDialog
      :open="saveOpen"
      :skin="skin"
      :logged-in="user !== 'logged-out'"
      :diff="saveDiff"
      @close="saveOpen = false"
      @publish="onSaved"
    />

    <VeDialogs
      :kind="dialog?.kind ?? null"
      :host="page.host"
      :initial="dialog?.initial"
      :fields="dialog?.fields"
      @submit="onDialogSubmit"
      @cancel="dialog = null"
    />
  </div>
</template>

<style scoped>
.ve-editor {
  position: relative;
}

.ve-editor__layout {
  position: relative;
  /* Keep child margins inside, so the mobile gutter spans the "Edit full page" areas too. */
  display: flow-root;
}

.ve-editor__tagline {
  margin: var(--spacing-50, 8px) 0 0;
  padding: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 14px);
  color: var(--color-base);
}

/* Minerva edit mode: second-level headings styled as on desktop (Vector). */
.ve-editor[data-skin='mobile'] .ve-editor__surface :deep(h2) {
  font-family: 'Linux Libertine', Georgia, Times, 'Source Serif 4', serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 34px;
  margin: 0 0 14.4px;
  padding: 12px 0 4.08px;
  border-bottom: 1px solid #a2a9b1;
  color: var(--color-emphasized, #101418);
}

/* While the editor loads, the article stays visible but faded. */
.ve-editor--loading .ve-editor__surface {
  opacity: 0.5;
  pointer-events: none;
}

.ve-leave__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ve-leave__actions--stacked {
  flex-direction: column;
}

.ve-leave__actions--stacked .cdx-button {
  width: 100%;
  max-width: none;
}

.ve-editor :deep(.ve-section-hidden) {
  display: none !important;
}

/* Invisible templates: puzzle chip with the template name (VE's invisible icon). */
.ve-editor__surface :deep(.ve-ce-focusableNode-invisible) {
  display: inline-block !important;
  vertical-align: middle;
  margin: -0.7em 0 -0.6em;
  width: auto;
}

.ve-editor__surface :deep(p.ve-show-empty) {
  display: block !important;
}

.ve-editor__surface :deep(.ve-template-chip) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 6px;
  border-radius: 2px;
  opacity: 0.5;
  font-family: var(--font-family-base, sans-serif);
  font-size: 0.875rem;
  font-style: normal;
  font-weight: var(--font-weight-bold, 700);
  line-height: 20px;
  color: var(--color-base, #202122);
  cursor: default;
  user-select: none;
  vertical-align: middle;
}

.ve-editor__surface :deep(.ve-template-chip__icon) {
  display: inline-flex;
  width: 20px;
  height: 20px;
}

.ve-editor__surface :deep(.ve-template-chip__label) {
  max-width: 15em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ve-editor__surface :deep(.ve-newline) {
  margin: 0 4px;
  color: var(--color-base, #202122);
  user-select: none;
}

/* "Edit full page" (ArticleTarget switchFull): centred button over faded skeleton lines. */
.ve-full-page {
  position: relative;
  isolation: isolate;
  display: flex;
  justify-content: center;
  margin: 2.5em 0;
}

/* Same width as the article content (which leaves room for the suggestions gutter). */
.ve-editor[data-skin='mobile'].ve-editor--suggestions .ve-full-page {
  margin-right: 60px;
}

.ve-full-page {
  align-items: flex-start;
}

/* Room for the skeleton lines under the button (so the gutter runs behind them too). */
.ve-full-page--bottom {
  margin-bottom: 1.5em;
  padding-bottom: 3.5em;
}

.ve-full-page__btn {
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.25);
}

.ve-full-page__skeleton {
  position: absolute;
  left: 0;
  width: 100%;
  z-index: -1;
}

.ve-full-page--top .ve-full-page__skeleton {
  top: -2.5em;
}

.ve-full-page--bottom .ve-full-page__skeleton {
  top: -1em;
}

.ve-full-page__skeleton > div {
  height: 20px;
  margin-bottom: 4px;
  border-radius: 2px;
  background: var(--background-color-interactive, #eaecf0);
}

.ve-full-page__skeleton > div:nth-child(1) {
  width: 80%;
}

.ve-full-page__skeleton > div:nth-child(4) {
  width: 70%;
}

.ve-full-page--top .ve-full-page__skeleton > div:nth-child(1) { opacity: 0.15; }
.ve-full-page--top .ve-full-page__skeleton > div:nth-child(2) { opacity: 0.3; }
.ve-full-page--top .ve-full-page__skeleton > div:nth-child(3) { opacity: 0.45; }
.ve-full-page--top .ve-full-page__skeleton > div:nth-child(4) { opacity: 0.6; }
.ve-full-page--bottom .ve-full-page__skeleton > div:nth-child(1) { opacity: 0.6; }
.ve-full-page--bottom .ve-full-page__skeleton > div:nth-child(2) { opacity: 0.45; }
.ve-full-page--bottom .ve-full-page__skeleton > div:nth-child(3) { opacity: 0.3; }
.ve-full-page--bottom .ve-full-page__skeleton > div:nth-child(4) { opacity: 0.15; }

/* Suggestions outside the section: lightbulb with a divider and a blue dot. */
.ve-full-page__indicator {
  position: relative;
  display: inline-flex;
  margin: 0 -4px 0 10px;
  border-left: 4px solid transparent;
  box-shadow: -1px 0 0 var(--border-color-base, #a2a9b1);
}

.ve-full-page__indicator::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--background-color-progressive, #36c);
  border: 1px solid var(--border-color-inverted, #fff);
}

/* Invisible templates: puzzle chip with the template name (VE's invisible icon). */
.ve-editor__surface :deep(.ve-ce-focusableNode-invisible) {
  display: inline-block !important;
  vertical-align: middle;
  margin: -0.7em 0 -0.6em;
  width: auto;
}

.ve-editor__surface :deep(p.ve-show-empty) {
  display: block !important;
}

.ve-editor__surface :deep(.ve-template-chip) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 6px;
  border-radius: 2px;
  opacity: 0.5;
  font-family: var(--font-family-base, sans-serif);
  font-size: 0.875rem;
  font-style: normal;
  font-weight: var(--font-weight-bold, 700);
  line-height: 20px;
  color: var(--color-base, #202122);
  cursor: default;
  user-select: none;
  vertical-align: middle;
}

.ve-editor__surface :deep(.ve-template-chip__icon) {
  display: inline-flex;
  width: 20px;
  height: 20px;
}

.ve-editor__surface :deep(.ve-template-chip__label) {
  max-width: 15em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ve-editor__surface :deep(.ve-newline) {
  margin: 0 4px;
  color: var(--color-base, #202122);
  user-select: none;
}

.ve-editor__surface-wrap {
  position: relative;
  min-width: 0;
}

.ve-editor__surface {
  outline: none;
  position: relative;
  z-index: 1;
  padding-block: var(--spacing-100, 16px) var(--spacing-150, 24px);
  caret-color: var(--color-base, #202122);
}

.ve-editor__surface :deep(a) {
  cursor: text;
}

.ve-editor__highlights {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* Highlight states (original prototype colours) */
.ve-hl {
  position: absolute;
  border-radius: 2px;
  background-color: rgba(234, 236, 240, 0.65);
  transition: background-color 100ms ease;
}

.ve-hl--hover,
.ve-hl--selected {
  background-color: var(--background-color-progressive-subtle, #e8eeff);
}

.ve-hl--check.ve-hl--default {
  background-color: rgba(253, 242, 213, 0.75);
}

.ve-hl--check.ve-hl--hover,
.ve-hl--check.ve-hl--selected {
  background-color: var(--background-color-warning-subtle, #fdf2d5);
}

.ve-hl--success {
  background-color: var(--background-color-success-subtle, #dff2eb);
}

.ve-hl-bar {
  position: absolute;
  left: -12px;
  width: 2px;
  border-radius: 1px;
  background-color: var(--color-progressive, #36c);
}

.ve-hl-bar--check {
  background-color: var(--border-color-warning, #987027);
}

.ve-hl-bar--success {
  background-color: var(--color-success, #14866d);
}

.ve-editor--glow .ve-card {
  filter: drop-shadow(0 0 10px rgba(51, 102, 204, 0.25));
}

/* Review: dim everything except the checked blocks */
.ve-editor__surface--review > :deep(*) {
  opacity: 0.4;
}

.ve-editor__surface--review :deep(section) {
  opacity: 1;
}

.ve-editor__surface--review :deep(section > *:not(section):not(:has(.ve-review-focus)):not(.ve-review-focus)) {
  opacity: 0.4;
}

/* ── Desktop sidebar ── */
/* The sidebar sits outside the article column (which keeps its reading width). */
.ve-sidebar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(100% + 24px);
  width: 325px;
}

.ve-card {
  position: absolute;
  left: 0;
  width: 100%;
  background-color: var(--background-color-base, #fff);
  border: 1px solid #dadde3;
  border-radius: var(--border-radius-base, 2px);
  overflow: hidden;
  transition:
    top 250ms ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  user-select: none;
  z-index: 1;
}

.ve-card--hover {
  border-color: #3056a9;
}

.ve-card--hover .ve-card__header {
  background-color: var(--background-color-progressive-subtle, #e8eeff);
}

.ve-card--expanded {
  border-color: #6485d1;
  box-shadow:
    0 4px 8px 0 rgba(0, 0, 0, 0.06),
    0 0 16px 0 rgba(0, 0, 0, 0.06);
  z-index: 2;
}

.ve-card--expanded .ve-card__header {
  background-color: var(--background-color-progressive-subtle, #e8eeff);
}

.ve-card--check {
  border-color: var(--border-color-base, #a2a9b1);
}

.ve-card--check .ve-card__icon .cdx-icon {
  color: var(--color-icon-warning, #ab7f2a);
}

.ve-card--check .ve-card__title {
  font-weight: var(--font-weight-bold, 700);
}

.ve-card--check.ve-card--hover {
  border-color: #735421;
}

.ve-card--check.ve-card--hover .ve-card__header,
.ve-card--check.ve-card--expanded .ve-card__header {
  background-color: var(--background-color-warning-subtle, #fdf2d5);
}

.ve-card--check.ve-card--expanded {
  border-color: var(--color-icon-warning, #ab7f2a);
}

.ve-card--success,
.ve-card--success.ve-card--hover,
.ve-card--check.ve-card--success,
.ve-card--check.ve-card--success.ve-card--expanded,
.ve-card--check.ve-card--success.ve-card--hover {
  border-color: var(--border-color-base, #a2a9b1);
}

.ve-card__header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ve-card__header--static,
.ve-card--success .ve-card__header {
  cursor: default;
  background-color: var(--background-color-base, #fff) !important;
}

.ve-card--success .ve-card__content {
  border-top: 1px solid var(--border-color-muted, #dadde3);
}

.ve-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 24px;
  flex-shrink: 0;
}

.ve-card__icon .cdx-icon {
  color: var(--color-progressive, #36c);
}

.ve-card__icon--success .cdx-icon {
  color: var(--color-success, #14866d);
}

.ve-card__heading {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ve-card__subheading,
.ve-sheet__subheading {
  font-size: var(--font-size-x-small, 12px);
  font-style: italic;
  color: var(--color-subtle, #54595d);
  line-height: 16px;
}

.ve-sheet__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-block: 8px;
}

.ve-card__title {
  flex: 1;
  font-size: var(--font-size-medium, 16px);
  line-height: 24px;
  color: var(--color-base, #202122);
}

.ve-card__content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  user-select: text;
}

.ve-card__text {
  margin: 0;
  font-size: var(--font-size-medium, 16px);
  line-height: 24px;
  color: var(--color-subtle, #54595d);
}

.ve-card__actions {
  display: flex;
  gap: 8px;
}


.ve-review-heading {
  position: absolute;
  left: 0;
  right: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 24px;
  color: var(--color-base, #202122);
}

.ve-review-pager {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: var(--font-size-medium, 16px);
  color: var(--color-subtle, #54595d);
}

.ve-card__pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color-muted, #dadde3);
  font-size: var(--font-size-medium, 16px);
  color: var(--color-subtle, #54595d);
}

.ve-icon-flip {
  transform: rotate(180deg);
}

.ve-success-check {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: ve-check-draw 380ms ease 100ms forwards;
}

@keyframes ve-check-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* View suggestions pill */
/*
 * Fixed to the window over the sidebar column (left/width set from the
 * sidebar's position): at the bottom, or under the toolbar when the nearest
 * suggestion is above.
 */
.ve-view-pill-wrap {
  position: fixed;
  bottom: 16px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 11;
}

.ve-view-pill-wrap--up {
  top: 58px;
  bottom: auto;
}

/* "View suggestions": a pill-shaped group of two normal progressive buttons. */
.ve-view-pill {
  pointer-events: auto;
  display: inline-flex;
  border-radius: 9999px;
  box-shadow:
    0 4px 4px 0 rgba(0, 0, 0, 0.06),
    0 0 8px 0 rgba(0, 0, 0, 0.06);
  animation: ve-pill-in 220ms ease;
}

.ve-view-pill .cdx-button {
  border-radius: 0;
}

.ve-view-pill__main.cdx-button {
  border-radius: 9999px 0 0 9999px;
  padding-inline: 16px 12px;
}

.ve-view-pill__close.cdx-button {
  margin-inline-start: -1px;
  border-radius: 0 9999px 9999px 0;
  padding-inline: 10px 14px;
}

@keyframes ve-pill-in {
  from {
    transform: scaleY(0.1);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* ── Mobile ── */
.ve-editor[data-skin='mobile'] {
  padding-bottom: 88px;
}

.ve-editor[data-skin='mobile'].ve-editor--suggestions .ve-editor__surface-wrap {
  padding-right: 60px;
}

.ve-editor[data-skin='mobile'].ve-editor--suggestions .ve-editor__layout::after {
  content: '';
  position: absolute;
  top: 0;
  right: -16px;
  width: 44px;
  height: 100%;
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
  border-left: 1px solid var(--border-color-muted, #dadde3);
  pointer-events: none;
}

.ve-editor[data-skin='mobile'] .ve-hl {
  border-radius: 0;
}

.ve-gutter {
  position: absolute;
  top: 0;
  right: -16px;
  width: 44px;
  height: 100%;
  z-index: 3;
}

.ve-gutter__mark {
  position: absolute;
  left: 12px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ve-gutter__mark::before {
  content: '';
  position: absolute;
  left: -13px;
  top: 0;
  width: 2px;
  height: 100%;
  border-radius: 2px;
  background-color: var(--color-progressive, #36c);
}

.ve-gutter__mark .cdx-icon {
  color: var(--color-progressive, #36c);
}

.ve-gutter__mark--check .cdx-icon {
  color: var(--color-icon-warning, #ab7f2a);
}

.ve-gutter__mark--check::before {
  background-color: var(--color-icon-warning, #ab7f2a);
}

.ve-gutter__mark--success::before {
  display: none;
}

.ve-gutter__count {
  position: absolute;
  bottom: -6px;
  right: -8px;
  min-width: 14px;
  height: 14px;
  padding: 0 2px;
  border-radius: 2px;
  background: var(--background-color-progressive, #36c);
  color: var(--color-inverted, #fff);
  font-size: 10px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 14px;
}

.ve-mobile-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 16px;
  display: flex;
  justify-content: center;
  z-index: 70;
  animation: ve-bar-up 500ms cubic-bezier(0, 0, 0.2, 1) both;
}


@keyframes ve-bar-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.ve-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  padding: 0 16px;
  background: var(--background-color-base, #fff);
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  box-shadow:
    0 4px 4px 0 rgba(0, 0, 0, 0.06),
    0 0 8px 0 rgba(0, 0, 0, 0.06);
  transform: translateY(0);
  transition: transform 220ms ease;
  max-height: 70vh;
  overflow-y: auto;
}

.ve-sheet--entering {
  transform: translateY(100%);
}

.ve-sheet__header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 0 -16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color-muted, #eaecf0);
}

.ve-sheet__header .cdx-icon {
  color: var(--color-progressive, #36c);
}

.ve-sheet--check .ve-sheet__header > .cdx-icon,
.ve-sheet--check .ve-sheet__header .cdx-icon:first-child {
  color: var(--color-warning, #886425) !important;
}

.ve-sheet--check .ve-sheet__header .cdx-icon {
  color: var(--color-icon-warning, #ab7f2a);
}

.ve-sheet__header--success > .cdx-icon {
  color: var(--color-success, #14866d);
}

.ve-sheet__icon-btn .cdx-icon {
  color: var(--color-base, #202122) !important;
}

.ve-sheet__title {
  font-size: var(--font-size-medium, 16px);
  font-weight: 600;
  color: var(--color-base, #202122);
}

.ve-sheet__icon-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
}

.ve-sheet__finding {
  padding: 8px 0 16px;
}

.ve-sheet__text {
  margin: 0;
  padding: 8px 0 16px;
  font-size: var(--font-size-medium, 16px);
  line-height: 24px;
  color: var(--color-subtle, #54595d);
}

.ve-sheet__actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.ve-sheet__pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  min-height: 38px;
  margin: 0 -16px;
  padding: 0 16px;
  border-top: 1px solid var(--border-color-muted, #dadde3);
}

.ve-sheet__count {
  font-size: var(--font-size-medium, 16px);
  color: var(--color-subtle, #54595d);
}

.ve-sheet__body--dismiss {
  animation: ve-dismiss-right 260ms ease forwards;
}

@keyframes ve-dismiss-right {
  to {
    opacity: 0;
    transform: translateX(40px);
  }
}

.ve-sheet__body--roll-next {
  animation: ve-roll-next 280ms cubic-bezier(0.23, 1, 0.32, 1);
}

.ve-sheet__body--roll-prev {
  animation: ve-roll-prev 280ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes ve-roll-next {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
}

@keyframes ve-roll-prev {
  from {
    transform: translateY(-24px);
    opacity: 0;
  }
}

.ve-mobile-toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 10px 16px;
  border-radius: 2px;
  background: #202122;
  color: #fff;
  font-size: var(--font-size-small, 14px);
  line-height: 20px;
  z-index: 220;
}
</style>
