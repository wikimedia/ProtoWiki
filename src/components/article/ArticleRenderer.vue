<script setup lang="ts">
import { computed, inject, nextTick, onUpdated, ref, watch } from 'vue'

import { globalSkin, globalTheme, PROTOWIKI_CHROME_SKIN, PROTOWIKI_CHROME_THEME } from '@/theme'
import type { Skin, Theme } from '@/theme'
import { mobileH2ChevronSvg, mobileH2EditIconSvg } from './shared/mobileH2CodexIcons'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  skin?: Skin
  theme?: Theme
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  skin: undefined,
  theme: undefined,
})

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN)
const inheritedTheme = inject(PROTOWIKI_CHROME_THEME)

const effectiveSkin = computed<Skin>(() => props.skin ?? inheritedSkin?.value ?? globalSkin.value)
const effectiveTheme = computed<Theme>(
  () => props.theme ?? inheritedTheme?.value ?? globalTheme.value,
)

const mwParserOutputRef = ref<HTMLElement | null>(null)

function enhanceMobileSectionHeadings(root: HTMLElement) {
  root.querySelectorAll<HTMLHeadingElement>('section > h2').forEach((h2) => {
    if (h2.closest('.toc')) return
    if (h2.classList.contains('protowiki-mobile-h2--ready')) return

    const parent = h2.parentElement
    if (!parent || parent.tagName !== 'SECTION') return

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

    const titleText = h2.textContent?.trim() ?? ''
    h2.textContent = ''
    h2.classList.add('protowiki-mobile-h2', 'protowiki-mobile-h2--ready')
    h2.setAttribute('aria-expanded', 'true')
    h2.setAttribute('tabindex', '0')

    const chevron = document.createElement('span')
    chevron.className = 'protowiki-mobile-h2__chevron'
    chevron.setAttribute('aria-hidden', 'true')
    chevron.innerHTML = mobileH2ChevronSvg(false)

    const label = document.createElement('span')
    label.className = 'protowiki-mobile-h2__label'
    label.textContent = titleText

    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.className = 'protowiki-mobile-h2__edit'
    editBtn.setAttribute('aria-label', 'Edit section')
    editBtn.innerHTML = mobileH2EditIconSvg()

    h2.appendChild(chevron)
    h2.appendChild(label)
    h2.appendChild(editBtn)

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
  enhanceMobileSectionHeadings(root)
  enhanceMobileLeadInfoboxOrder(root)
}

watch(
  effectiveSkin,
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
 * Lead vs infobox order on mobile:
 * `applyMobileEnhancements()` repositions section-0 infoboxes in the DOM so they
 * render directly after the first real lead prose block (skipping empty utility nodes).
 */
</style>
