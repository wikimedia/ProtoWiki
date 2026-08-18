<script setup lang="ts">
import { computed, inject, nextTick, onUpdated, ref, watch } from 'vue'

import { globalSkin, globalTheme, PROTOWIKI_CHROME_SKIN, PROTOWIKI_CHROME_THEME } from '@/theme'
import type { Skin, Theme } from '@/theme'
import { collapseArticleTables } from './shared/collapseArticleTables'
import { mobileH2ChevronSvg, mobileH2EditIconSvg } from './shared/mobileH2CodexIcons'

/**
 * App articles read top to bottom: body sections stay open and static, headings
 * lose their rule, and only the end matter folds away — starting folded, with a
 * single line dividing it from the body.
 */
const APP_END_MATTER = ['References', 'External links']

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  skin?: Skin
  theme?: Theme
  /** In-app reading affordances on mobile — see {@link APP_END_MATTER}. */
  app?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  skin: undefined,
  theme: undefined,
  app: false,
})

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN)
const inheritedTheme = inject(PROTOWIKI_CHROME_THEME)

const effectiveSkin = computed<Skin>(() => props.skin ?? inheritedSkin?.value ?? globalSkin.value)
const effectiveTheme = computed<Theme>(
  () => props.theme ?? inheritedTheme?.value ?? globalTheme.value,
)

const mwParserOutputRef = ref<HTMLElement | null>(null)

/** Matches a heading by its visible text or its anchor id (`External_links`). */
function sectionHeadingMatches(h2: HTMLHeadingElement, names: string[]): boolean {
  const candidates = [h2.textContent ?? '', h2.id.replace(/_/g, ' ')].map((value) =>
    value.trim().toLowerCase(),
  )
  return names.some((name) => candidates.includes(name.trim().toLowerCase()))
}

/**
 * Marks where the end matter begins — whichever named section comes first. It
 * carries the top border, so `References` + `External links` are divided from the
 * body once rather than each getting a line. Nothing is marked when neither
 * section exists.
 */
function markEndMatterStart(root: HTMLElement, names: string[]) {
  if (root.querySelector('.protowiki-mobile-end-matter-start')) return

  for (const h2 of root.querySelectorAll<HTMLHeadingElement>('section > h2')) {
    if (h2.closest('.toc')) continue
    if (!sectionHeadingMatches(h2, names)) continue

    h2.parentElement?.classList.add('protowiki-mobile-end-matter-start')
    return
  }
}

function enhanceMobileSectionHeadings(root: HTMLElement, app: boolean) {
  root.querySelectorAll<HTMLHeadingElement>('section > h2').forEach((h2) => {
    if (h2.closest('.toc')) return
    if (h2.classList.contains('protowiki-mobile-h2--ready')) return

    const parent = h2.parentElement
    if (!parent || parent.tagName !== 'SECTION') return

    const canCollapse = !app || sectionHeadingMatches(h2, APP_END_MATTER)
    // In an app article only the end matter collapses, and closed is its
    // resting state.
    const startCollapsed = canCollapse && app

    const titleText = h2.textContent?.trim() ?? ''
    h2.textContent = ''
    h2.classList.add('protowiki-mobile-h2', 'protowiki-mobile-h2--ready')

    const label = document.createElement('span')
    label.className = 'protowiki-mobile-h2__label'
    label.textContent = titleText

    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.className = 'protowiki-mobile-h2__edit'
    editBtn.setAttribute('aria-label', 'Edit section')
    editBtn.innerHTML = mobileH2EditIconSvg()

    // Static headings keep the same look as toggling ones — they sit in the same
    // article, so a bare `h2` fallback would read as a rendering bug. No chevron,
    // no body wrapper, no listeners.
    if (!canCollapse) {
      h2.classList.add('protowiki-mobile-h2--static')
      h2.appendChild(label)
      h2.appendChild(editBtn)
      return
    }

    const bodyBits: Element[] = []
    let n = h2.nextElementSibling
    while (n) {
      bodyBits.push(n)
      n = n.nextElementSibling
    }

    const body = document.createElement('div')
    body.className = 'protowiki-mobile-section-body'
    bodyBits.forEach((el) => body.appendChild(el))
    h2.insertAdjacentElement('afterend', body)

    h2.setAttribute('aria-expanded', startCollapsed ? 'false' : 'true')
    h2.setAttribute('tabindex', '0')

    const chevron = document.createElement('span')
    chevron.className = 'protowiki-mobile-h2__chevron'
    chevron.setAttribute('aria-hidden', 'true')
    chevron.innerHTML = mobileH2ChevronSvg(startCollapsed)

    h2.appendChild(chevron)
    h2.appendChild(label)
    h2.appendChild(editBtn)

    if (startCollapsed) {
      body.classList.add('protowiki-mobile-section-body--collapsed')
      h2.classList.add('protowiki-mobile-h2--collapsed')
    }

    function toggle() {
      const collapsed = body.classList.toggle('protowiki-mobile-section-body--collapsed')
      h2.classList.toggle('protowiki-mobile-h2--collapsed', collapsed)
      h2.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
      chevron.innerHTML = mobileH2ChevronSvg(collapsed)
    }

    h2.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.protowiki-mobile-h2__edit')) return
      toggle()
    })

    h2.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if ((e.target as HTMLElement).closest('.protowiki-mobile-h2__edit')) return
        e.preventDefault()
        toggle()
      }
    })

    editBtn.addEventListener('keydown', (e) => {
      e.stopPropagation()
    })

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
    })
  })
}

function enhanceMobileLeadInfoboxOrder(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("section[data-mw-section-id='0']").forEach((section) => {
    const infobox = section.querySelector<HTMLElement>(':scope > table.infobox')
    if (!infobox) return

    let firstLeadBlock: HTMLElement | null = null
    let candidate = infobox.nextElementSibling as HTMLElement | null
    while (candidate) {
      const tag = candidate.tagName
      const isLeadBlock = tag === 'P' || tag === 'UL' || tag === 'OL'
      const hasReadableText = (candidate.textContent ?? '').trim().length > 0
      const isEmptyElt = candidate.classList.contains('mw-empty-elt')

      if (isLeadBlock && hasReadableText && !isEmptyElt) {
        firstLeadBlock = candidate
        break
      }

      candidate = candidate.nextElementSibling as HTMLElement | null
    }

    if (!firstLeadBlock) return

    if (firstLeadBlock.nextElementSibling !== infobox) {
      firstLeadBlock.insertAdjacentElement('afterend', infobox)
    }
  })
}

async function applyMobileEnhancements() {
  await nextTick()
  if (effectiveSkin.value !== 'mobile') return
  const root = mwParserOutputRef.value
  if (!root) return
  if (props.app) markEndMatterStart(root, APP_END_MATTER)
  enhanceMobileSectionHeadings(root, props.app)
  enhanceMobileLeadInfoboxOrder(root)
  // After the reorder — it matches `:scope > table.infobox`, which the wrapper
  // would put out of reach.
  if (props.app) collapseArticleTables(root)
}

watch(
  [effectiveSkin, () => props.app],
  () => {
    void applyMobileEnhancements()
  },
  { flush: 'post', immediate: true },
)

onUpdated(() => {
  void applyMobileEnhancements()
})
</script>

<template>
  <div
    class="article-content"
    :class="{ 'article-content--app': props.app }"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
    :lang="props.lang"
    :dir="props.dir"
  >
    <!--
      Caller supplies default slot — Parsoid / snapshot markup via Vue v-html
      wrappers is fine (see ArticleLive). Inner :key resets DOM on skin toggle
      so desktop gets a fresh tree without mobile accordion mutations.
      Parser RL (.mw-parser-output) ships from src/styles/wiki-skins/.
    -->
    <div ref="mwParserOutputRef" class="mw-parser-output">
      <div :key="effectiveSkin" class="protowiki-parser-slot-root">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-content {
  min-width: 0;
  width: 100%;
  padding: var(--spacing-100, 16px) 0 var(--spacing-150, 24px);
  text-align: start;
  background-color: var(--background-color-base);
}

.article-content[data-skin='mobile'] {
  /* Flush first body block under the mobile icon toolbar — hatnote strip abuts divider. */
  padding: 0 0 var(--spacing-100, 16px);
}
</style>

<!--
  Parser output is unscoped — mobile section rows for Parsoid HTML live here
  instead of `minerva.css`.
-->
<style>
/*
 * Desktop: wide wikitables (discography, chart columns, etc.) must stay inside the
 * reading column — cap width to the article box and scroll horizontally.
 */
.article[data-skin='desktop'] .mw-parser-output {
  max-width: 100%;
  overflow-x: auto;
}

.article[data-skin='desktop'] .mw-parser-output table {
  max-width: 100%;
}

/*
 * Mobile / app: wide wikitables & navboxes scroll inside the table, not the screen.
 * Omit `width: fit-content` — with global border-box, it can shrink the reading column.
 */
.article[data-skin='mobile'] .mw-parser-output table:not(.infobox) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2 {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  margin: 0;
  padding: var(--spacing-75, 12px) 0;
  border-bottom: 1px solid var(--border-color-muted, var(--border-color-subtle));
  font-family: var(--font-family-serif);
  font-size: 1.5rem;
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-xx-small, 1.3);
  color: var(--color-emphasized, var(--color-base));
  clear: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2--static {
  cursor: default;
}

/*
 * App-style reading: no rule under each heading. The body/end-matter boundary is
 * the single top border below.
 */
.article[data-skin='mobile'] .article-content--app .mw-parser-output .protowiki-mobile-h2 {
  border-bottom: 0;
}

/*
 * Navboxes (including authority control, which is one) never reach the apps —
 * their article HTML has them stripped. Hatnotes and sister-site boxes stay.
 */
.article[data-skin='mobile'] .article-content--app .mw-parser-output .navbox,
.article[data-skin='mobile'] .article-content--app .mw-parser-output .vertical-navbox {
  display: none;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-end-matter-start {
  margin-block-start: var(--spacing-100, 16px);
  border-block-start: 1px solid var(--border-color-muted, var(--border-color-subtle));
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__label {
  flex: 1;
  min-width: 0;
  text-align: start;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0;
  margin-inline-start: var(--spacing-35, 6px);
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base, 2px);
  background: transparent;
  color: var(--color-base);
  opacity: 0.7;
  cursor: pointer;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__edit:hover {
  background-color: var(--background-color-button-quiet--hover, rgba(0, 24, 73, 0.027));
  opacity: 0.9;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__edit:focus-visible {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: 2px;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin-inline-end: 2px;
  opacity: 0.55;
  pointer-events: none;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__chevron svg {
  display: block;
  width: 100%;
  height: 100%;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-section-body--collapsed {
  display: none;
}

.article[data-skin='mobile'] .mw-parser-output section section > h3 {
  display: block;
  box-sizing: border-box;
  margin: var(--spacing-75, 12px) 0 var(--spacing-35, 6px);
  padding: var(--spacing-35, 6px) 0;
  border-bottom: none;
  font-family: var(--font-family-base);
  font-size: 1rem;
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small, 1.4);
  color: var(--color-emphasized, var(--color-base));
}

/*
 * Infobox: Minerva bundles both `width:100%` and a later `float:right;width:22em`
 * rule — the float wins in practice and leaves empty gutters. Match mobile-web
 * full-column infoboxes by clearing float and pinning width to the content box.
 *
 * Minerva also sets `.mw-parser-output .content table { display:block; width:fit-content }`
 * for wrapped pages; that shrinks the table and tbody no longer spans the column.
 * Force real table layout + fixed column distribution so the body fills the table.
 */
.article[data-skin='mobile'] .mw-parser-output table.infobox {
  display: table !important;
  float: none;
  clear: both;
  width: 100% !important;
  /* Defeat pasted / template inline desktop caps (`style="max-width:22em"`, …). */
  max-width: 100% !important;
  min-width: 0;
  margin-left: 0 !important;
  margin-right: 0 !important;
  box-sizing: border-box;
  table-layout: fixed;
}

.article[data-skin='mobile'] .mw-parser-output table.infobox > caption {
  display: table-caption !important;
  caption-side: top;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.article[data-skin='mobile'] .mw-parser-output table.infobox thead {
  display: table-header-group !important;
  width: 100%;
}

.article[data-skin='mobile'] .mw-parser-output table.infobox tbody {
  display: table-row-group !important;
  width: 100%;
}

.article[data-skin='mobile'] .mw-parser-output table.infobox tfoot {
  display: table-footer-group !important;
  width: 100%;
}

.article[data-skin='mobile'] .mw-parser-output table.infobox tr {
  width: 100%;
}

/*
 * Collapsed table widgets (app articles) — see `shared/collapseArticleTables.ts`.
 * Metrics follow the apps' own stylesheet.
 */
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table-container {
  clear: both;
  width: 100%;
  margin-block: 14px;
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__header,
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: var(--spacing-75, 12px);
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.2;
  text-align: start;
  color: var(--color-base);
  cursor: pointer;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__caption,
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__footer-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--color-subtle, #54595d);
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__chevron {
  display: inline-flex;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0.55;
  pointer-events: none;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__chevron svg {
  display: block;
  width: 100%;
  height: 100%;
}

.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__footer {
  border-block-start: 1px solid var(--border-color-muted, var(--border-color-subtle));
}

/* `display` above outranks the user-agent `[hidden]` rule. */
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__header[hidden],
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__footer[hidden],
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__content[hidden] {
  display: none;
}

/* The widget owns the sideways scrolling, so wide wikitables keep table layout. */
.article[data-skin='mobile'] .mw-parser-output .protowiki-collapse-table__content {
  overflow-x: auto;
}

.article[data-skin='mobile'] .mw-parser-output table.protowiki-collapse-table {
  display: table;
  float: none !important;
  width: 100% !important;
  max-width: none;
  margin: 0 !important;
  overflow: visible;
}

/*
 * Lead vs infobox order on mobile:
 * `applyMobileEnhancements()` repositions section-0 infoboxes in the DOM so they
 * render directly after the first real lead prose block (skipping empty utility nodes).
 */
</style>
