<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconBookmarkOutline, cdxIconEdit } from '@wikimedia/codex-icons'

import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import { fetchArticleBody } from '@/components/article/shared/fetchArticleBody'
import {
  PROTOWIKI_ARTICLE_WIKI_HOST,
  PROTOWIKI_IN_ARTICLE_WIKI_LINK,
} from '@/composables/useInArticleWikiLinks'
import { useSkin } from '@/composables/useSkin'

import { fetchCardData, type WikilinkCardData } from './fetchCardData'
import WikilinkBadge from './WikilinkBadge.vue'
import WikilinkPreview from './WikilinkPreview.vue'

/**
 * The full article, in the custom card's design: serif title (with bookmark and edit on its
 * rule), then the whole article body, with the W bar along the bottom.
 * Desktop: a panel overlaid on the right. Mobile: a bottom sheet at 90% height. With `preview`,
 * the sheet first shows just the link preview at its natural height; "Read full article" or
 * scrolling on past its end expands it into the full article.
 * Clicking anywhere outside closes it; links inside open in the panel. A `section` (from a
 * `[[Blog#History]]` link) scrolls straight to that section.
 */
const props = defineProps<{
  /** e.g. https://en.wikipedia.org */
  wiki: string
  title: string
  /** Section anchor to scroll to, e.g. `History`. */
  section?: string
  /** "Styled": recoloured in todepond.com's palette (styled.css). */
  styled?: boolean
  /** Sheet only: start as the link preview rather than the full article. */
  preview?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const host = computed(() => new URL(props.wiki).host)
const articleUrl = (title: string) =>
  `${props.wiki}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
/** e.g. action=edit, opened on the wiki in a new tab. */
const actionUrl = (title: string, action: string) =>
  `${props.wiki}/w/index.php?${new URLSearchParams({ title, action })}`

// The article shown (and section to scroll to): a new link from outside, or a link clicked
// inside, replaces it.
const target = ref({ title: props.title, section: props.section ?? '' })
watch(
  () => [props.title, props.section] as const,
  ([title, section]) => {
    target.value = { title, section: section ?? '' }
  },
)
const current = computed(() => target.value.title)

function open(title: string): void {
  target.value = { title, section: '' }
}

provide(PROTOWIKI_ARTICLE_WIKI_HOST, host)
provide(PROTOWIKI_IN_ARTICLE_WIKI_LINK, {
  navigate: (title) => {
    if (title) open(title)
  },
  resolveUrl: (title) => (title ? articleUrl(title) : null),
})

// Mobile skin → bottom sheet; desktop → side panel. The article always uses the mobile skin:
// the panel is phone-width either way.
const skin = useSkin()
const isSheet = computed(() => skin.value === 'mobile')

// Preview (sheet only): the link preview at its natural height, until expanded.
const expanded = ref(!isSheet.value || !props.preview)
const cardData = ref<WikilinkCardData | null>(null)
if (!expanded.value) {
  fetchCardData(props.wiki, props.title, props.section ?? '').then((data) => {
    if (data) cardData.value = data
    else expand()
  })
}

// Data for the current article.
const liveTitle = ref<string | null>(null)
const bodyHtml = ref<string | null>(null)
const bodyError = ref(false)
const scroller = ref<HTMLElement | null>(null)
let loadToken = 0

/** Scroll the panel so the section's heading sits just under the top. */
function scrollToSection(anchor: string): void {
  const frame = scroller.value
  const found = frame?.querySelector(`[id="${CSS.escape(anchor.replace(/ /g, '_'))}"]`)
  if (!frame || !found) return
  const heading = found.closest('h1, h2, h3, h4, h5, h6') ?? found
  const offset = heading.getBoundingClientRect().top - frame.getBoundingClientRect().top
  frame.scrollTo({ top: frame.scrollTop + offset - 12 })
}

watch(
  target,
  async ({ title, section }) => {
    const token = ++loadToken
    liveTitle.value = null
    bodyHtml.value = null
    bodyError.value = false
    await nextTick()
    scroller.value?.scrollTo({ top: 0 })

    try {
      const body = await fetchArticleBody(title, host.value)
      if (token !== loadToken) return
      liveTitle.value = body.liveTitle
      bodyHtml.value = body.html
      if (section && expanded.value) {
        // Two ticks: our v-html, then ArticleRenderer's mobile section reshaping.
        await nextTick()
        await nextTick()
        if (token === loadToken) scrollToSection(section)
      }
    } catch {
      if (token === loadToken) bodyError.value = true
    }
  },
  { immediate: true },
)

/** Grow the preview sheet to full height and show the article in place of the preview. */
async function expand(): Promise<void> {
  if (expanded.value) return
  const el = panel.value
  if (el) {
    // Animate from the preview's height (auto, so not animatable) to the full 90vh, then hand
    // the height back to the stylesheet.
    el.style.height = `${el.offsetHeight}px`
    void el.offsetHeight
    el.style.height = '90vh'
    el.addEventListener(
      'transitionend',
      (event) => {
        if (event.target === el) el.style.height = ''
      },
      { once: true },
    )
  }
  expanded.value = true
  await nextTick()
  scroller.value?.scrollTo({ top: 0 })
  if (target.value.section && bodyHtml.value !== null) {
    // Two ticks: our v-html, then ArticleRenderer's mobile section reshaping.
    await nextTick()
    scrollToSection(target.value.section)
  }
}

// Scrolling on past the end of the preview expands it (wheel, or a swipe up).
function atBottom(): boolean {
  const frame = scroller.value
  return !frame || frame.scrollTop + frame.clientHeight >= frame.scrollHeight - 1
}
function onPreviewWheel(event: WheelEvent): void {
  if (event.deltaY > 0 && atBottom()) expand()
}
let touchStartY: number | null = null
function onPreviewTouchStart(event: TouchEvent): void {
  touchStartY = atBottom() ? event.touches[0].clientY : null
}
function onPreviewTouchMove(event: TouchEvent): void {
  if (touchStartY === null) return
  if (touchStartY - event.touches[0].clientY > 24) {
    touchStartY = null
    event.preventDefault()
    expand()
  }
}

/** The title after redirects, once the body has loaded. */
const heading = computed(() => liveTitle.value ?? current.value)
const wikiHome = computed(() => `${props.wiki}/`)

// Close on any press outside the panel, except on things that open (another) article in it:
// the blog's wikilinks and the hover card.
const panel = ref<HTMLElement | null>(null)
const KEEP_OPEN = 'a.wikilink, .wikilink-card'
function onPointerDown(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  if (panel.value?.contains(target) || target.closest(KEEP_OPEN)) return
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

// Keyboard, focus and (sheet only) page scroll lock.
let previousOverflow = ''
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  // Deferred, so the click that opened the panel can't count as an outside click.
  requestAnimationFrame(() => document.addEventListener('pointerdown', onPointerDown, true))
  panel.value?.focus({ preventScroll: true })
  if (isSheet.value) {
    previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown, true)
  if (isSheet.value) document.documentElement.style.overflow = previousOverflow
})
</script>

<template>
  <div class="article-panel-root">
    <div v-if="isSheet" class="article-panel-backdrop" />
    <section
      ref="panel"
      class="article-panel article"
      :class="[
        isSheet ? 'article-panel--sheet' : 'article-panel--side',
        { 'wikilink-styled': styled, 'article-panel--expanded': expanded },
      ]"
      data-skin="mobile"
      :role="isSheet ? 'dialog' : 'complementary'"
      :aria-modal="isSheet ? 'true' : undefined"
      :aria-label="heading"
      tabindex="-1"
    >
      <!-- Everything but the W bar scrolls, inside the card's white border. -->
      <div
        ref="scroller"
        class="article-panel__frame"
        @wheel="expanded || onPreviewWheel($event)"
        @touchstart="expanded || onPreviewTouchStart($event)"
        @touchmove="expanded || onPreviewTouchMove($event)"
      >
        <template v-if="!expanded">
          <WikilinkPreview
            v-if="cardData"
            class="article-panel__preview"
            :data="cardData"
            expand-icon
            @open="expand"
          />
          <p v-else class="article-panel__status article-panel__status--preview">Loading…</p>
        </template>
        <template v-else>
          <div class="article-panel__head">
            <!-- Placeholder until saving is designed: for now it opens the article on the wiki. -->
            <a
              class="article-panel__action cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only"
              :href="articleUrl(current)"
              target="_blank"
              rel="noopener"
              aria-label="Bookmark"
              title="Bookmark"
            >
              <CdxIcon :icon="cdxIconBookmarkOutline" />
            </a>
            <h2 class="article-panel__title">{{ heading }}</h2>
            <div class="article-panel__actions">
              <a
                class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only"
                :href="actionUrl(current, 'edit')"
                target="_blank"
                rel="noopener"
                aria-label="Edit"
                title="Edit"
              >
                <CdxIcon :icon="cdxIconEdit" />
              </a>
            </div>
          </div>

          <div class="article-panel__body">
            <p v-if="bodyError" class="article-panel__status">
              Couldn't load this article.
              <a :href="articleUrl(current)" target="_blank" rel="noopener">Open it on Wikipedia</a
              >.
            </p>
            <p v-else-if="bodyHtml === null" class="article-panel__status">Loading article…</p>
            <!-- Styled: dark theme, so Wikipedia content gets ProtoWiki's dark patches; styled.css
               then repaints the dark tokens in todepond.com's colours. -->
            <ArticleRenderer v-else skin="mobile" :theme="styled ? 'dark' : undefined">
              <div v-html="bodyHtml" />
            </ArticleRenderer>
          </div>
        </template>
      </div>

      <WikilinkBadge :href="wikiHome" />
    </section>
  </div>
</template>

<style scoped>
.article-panel-root {
  /* Only a host for the backdrop and panel; both are fixed to the viewport. */
  display: contents;
}

.article-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 104;
  background-color: var(--background-color-backdrop-dark);
}

/* Shared shell: the card's look at panel size. */
.article-panel {
  position: fixed;
  z-index: 105;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color-base);
  box-shadow: var(--box-shadow-medium);
  color: var(--color-base);
  text-align: start;
  outline: none;
}

/* Desktop: overlaid on the right, inset like a floating card; the blog stays visible. */
.article-panel--side {
  top: var(--spacing-100);
  right: var(--spacing-100);
  bottom: var(--spacing-100);
  width: min(480px, calc(100vw - 2 * var(--spacing-100)));
  border-radius: 16px;
}

/* Mobile: a bottom sheet filling most of the screen. */
.article-panel--sheet {
  right: 0;
  bottom: 0;
  left: 0;
  /* Preview: as tall as its content. Expanded: the full 90vh (see expand()). */
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
  transition: height 250ms ease;
}

.article-panel--sheet.article-panel--expanded {
  height: 90vh;
}

@media (prefers-reduced-motion: reduce) {
  .article-panel--sheet {
    transition: none;
  }
}

/* The preview's summary is clamped like the hover card's. */
.article-panel__preview {
  --wikilink-card-extract-lines: 6;
}

.article-panel__status--preview {
  margin: var(--spacing-150) var(--spacing-100);
}

/* White border on three sides (the W bar closes the bottom); clips inside the border. */
.article-panel__frame {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: var(--border-width-base) var(--border-style-base) var(--border-color-inverted);
  border-bottom: 0;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

/*
 * A slim, quiet scrollbar: a 4px rounded grey thumb, inset 3px from the edge, on no track, and
 * kept clear of the panel's rounded corners. (Chrome ignores these ::-webkit rules once the
 * standard scrollbar-width / scrollbar-color are set, so those are only for other browsers.)
 */
.article-panel__frame::-webkit-scrollbar {
  width: 10px;
}

.article-panel__frame::-webkit-scrollbar-track {
  margin: var(--spacing-100) 0;
  background: transparent;
}

.article-panel__frame::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 5px;
  background-clip: padding-box;
  background-color: var(--border-color-base);
}

.article-panel__frame::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-placeholder);
}

@supports not selector(::-webkit-scrollbar) {
  .article-panel__frame {
    scrollbar-width: thin;
    scrollbar-color: var(--border-color-base) transparent;
  }
}

/* Title and its actions share the black rule underneath. */
.article-panel__head {
  display: flex;
  /* Icons centred on the title's line. */
  align-items: center;
  gap: var(--spacing-50);
  margin: var(--spacing-75) var(--spacing-100) 0;
  padding-bottom: var(--spacing-25);
  border-bottom: var(--border-width-base) var(--border-style-base) var(--background-color-inverted);
}

.article-panel__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  font-family: var(--font-family-serif);
  /* One step up from the card's title: the panel is a whole article. */
  font-size: var(--font-size-xxx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xxx-large);
  color: var(--color-base);
  overflow-wrap: break-word;
}

.article-panel__action,
.article-panel__actions {
  display: flex;
  flex: none;
}

/*
 * Every icon button in the panel uses the base text colour: the title's bookmark and edit
 * (Codex buttons default to a lighter grey) and the article's section chevrons and edit pencils
 * (which the mobile skin also fades to 55% / 70% opacity).
 */
.article-panel__head .cdx-button,
.article-panel__head .cdx-button:hover {
  color: var(--color-base);
}

/*
 * Section heading chevrons and pencils: base colour at full strength (the mobile skin fades
 * them). The extra `.article-panel.article[data-skin]` outranks the skin's own heading rules.
 */
.article-panel.article[data-skin='mobile']
  .article-panel__body
  :deep(.protowiki-mobile-h2__chevron),
.article-panel.article[data-skin='mobile'] .article-panel__body :deep(.protowiki-mobile-h2__edit),
.article-panel.article[data-skin='mobile']
  .article-panel__body
  :deep(.protowiki-mobile-h2__edit:hover) {
  color: var(--color-base);
  opacity: 1;
}

/*
 * Section edit pencils size, hover and press like the title's Codex quiet icon buttons, and are
 * pulled out by their padding the same way, so they line up with the title's pencil.
 */
.article-panel.article[data-skin='mobile'] .article-panel__body :deep(.protowiki-mobile-h2__edit) {
  width: var(--min-size-interactive-pointer);
  height: var(--min-size-interactive-pointer);
  margin-inline-end: calc((var(--size-icon-medium) - var(--min-size-interactive-pointer)) / 2);
  transition-property: background-color;
  transition-duration: var(--transition-duration-base);
}

.article-panel.article[data-skin='mobile']
  .article-panel__body
  :deep(.protowiki-mobile-h2__edit:hover) {
  background-color: var(--background-color-interactive-subtle--hover);
  mix-blend-mode: var(--mix-blend-mode-blend);
}

.article-panel.article[data-skin='mobile']
  .article-panel__body
  :deep(.protowiki-mobile-h2__edit:active) {
  background-color: var(--background-color-interactive-subtle--active);
}

/*
 * Section headings take the title row's height (gap above, title line, gap above its rule) rather
 * than the skin's taller 12px-each-side, and keep the skin's grey rule.
 */
.article-panel.article[data-skin='mobile'] .article-panel__body :deep(.protowiki-mobile-h2) {
  min-height: calc(
    var(--spacing-75) + var(--line-height-xxx-large) + var(--spacing-25) + var(--border-width-base)
  );
  padding: var(--spacing-75) 0 var(--spacing-25);
}

/*
 * Pull the icon buttons out by their padding (32px target, 20px icon), so the icons themselves
 * line up with the ends of the rule and the article text below.
 */
.article-panel__action {
  margin-inline-start: calc((var(--size-icon-medium) - var(--min-size-interactive-pointer)) / 2);
  /* And on its title side, so the bookmark sits snug against the title. */
  margin-inline-end: calc((var(--size-icon-medium) - var(--min-size-interactive-pointer)) / 2);
}

.article-panel__actions {
  margin-inline-end: calc((var(--size-icon-medium) - var(--min-size-interactive-pointer)) / 2);
}

.article-panel__body {
  padding: 0 var(--spacing-100) var(--spacing-150);
}

/*
 * Notice boxes ("This article needs…") have no top margin of their own, so one at the top of the
 * lead or of a section would touch the title's or heading's rule. Only the first in a run gets it:
 * stacked boxes stay joined. (Where a paragraph comes first, the margins collapse together.)
 */
.article-panel__body :deep(table.ambox:first-of-type) {
  margin-top: var(--spacing-75);
}

/*
 * Notice boxes fill the column. Wikipedia indents them by 10% each side on wide screens, which
 * squeezes them into a narrow strip in a phone-width panel.
 */
.article-panel__body :deep(table.ambox),
.article-panel__body :deep(table.ombox),
.article-panel__body :deep(table.tmbox),
.article-panel__body :deep(table.cmbox),
.article-panel__body :deep(table.fmbox),
.article-panel__body :deep(table.imbox) {
  box-sizing: border-box;
  width: 100%;
  margin-inline: 0;
}

/* No hatnotes ("For other uses, see…", "X redirects here") in the panel. */
.article-panel__body :deep(.hatnote),
.article-panel__body :deep(.dablink) {
  display: none;
}

/* Article images (thumbnail figures) fill the column. */
.article-panel__body :deep(figure[typeof~='mw:File/Thumb']),
.article-panel__body :deep(figure[typeof~='mw:File/Frame']) {
  float: none;
  clear: both;
  width: 100% !important;
  max-width: none;
  margin: var(--spacing-100) 0;
}

.article-panel__body :deep(figure[typeof~='mw:File/Thumb'] > a),
.article-panel__body :deep(figure[typeof~='mw:File/Thumb'] > span),
.article-panel__body :deep(figure[typeof~='mw:File/Frame'] > a),
.article-panel__body :deep(figure[typeof~='mw:File/Frame'] > span) {
  display: block;
  width: 100%;
}

/*
 * Wikipedia gives thumbnails a 3px margin and a 1px border inside the figure's frame; take both
 * out of the width so the image fills the frame without spilling past it.
 */
.article-panel__body :deep(figure[typeof~='mw:File/Thumb'] img),
.article-panel__body :deep(figure[typeof~='mw:File/Frame'] img) {
  display: block;
  box-sizing: border-box;
  width: calc(100% - 6px) !important;
  max-width: none;
  height: auto !important;
}

/* No little "enlarge" icon (magnify-clip) beside thumbnail captions; it hangs off the image link. */
.article-panel__body :deep(figure .mw-file-description::after) {
  display: none;
}

.article-panel__status {
  margin: var(--spacing-150) 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}
</style>

<!-- Enter/leave: the side panel slides in from the right, the sheet up from the bottom. -->
<style>
.article-panel-slide-enter-active .article-panel,
.article-panel-slide-leave-active .article-panel {
  transition: transform 250ms ease;
}

.article-panel-slide-enter-active .article-panel-backdrop,
.article-panel-slide-leave-active .article-panel-backdrop {
  transition: opacity 250ms ease;
}

.article-panel-slide-enter-from .article-panel--side,
.article-panel-slide-leave-to .article-panel--side {
  transform: translateX(calc(100% + var(--spacing-100)));
}

.article-panel-slide-enter-from .article-panel--sheet,
.article-panel-slide-leave-to .article-panel--sheet {
  transform: translateY(100%);
}

.article-panel-slide-enter-from .article-panel-backdrop,
.article-panel-slide-leave-to .article-panel-backdrop {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .article-panel-slide-enter-active .article-panel,
  .article-panel-slide-leave-active .article-panel,
  .article-panel-slide-enter-active .article-panel-backdrop,
  .article-panel-slide-leave-active .article-panel-backdrop {
    transition: none;
  }
}
</style>
