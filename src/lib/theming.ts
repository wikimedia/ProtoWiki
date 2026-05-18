import { ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'

import lightTokensRaw from '@wikimedia/codex-design-tokens/theme-wikimedia-ui.css?raw'
import darkTokensRaw from '@wikimedia/codex-design-tokens/theme-wikimedia-ui-mode-dark.css?raw'

export type Skin = 'desktop' | 'mobile'
export type Theme = 'light' | 'dark'

/**
 * When **`ArticleLive`**, **`ArticleSnapshot`**, **`ArticleCustom`**, **`ArticleWrapper`**, **`ArticleRenderer`**, or **`SpecialPageWrapper`** sit inside **`ChromeWrapper`**,
 * they inherit `effectiveSkin` via Vue inject so columns match chrome without
 * repeating `skin` on every child (embedded mobile previews still work).
 */
export const PROTOWIKI_CHROME_SKIN: InjectionKey<ComputedRef<Skin>> =
  Symbol('protowiki-chrome-skin')

export const PROTOWIKI_CHROME_THEME: InjectionKey<ComputedRef<Theme>> =
  Symbol('protowiki-chrome-theme')

/**
 * Viewport threshold for Vector vs Minerva **skin** (global `data-skin`).
 * Matches FakeMediaWiki `SpecialView/style.css`: `.nav-desktop` vs `.nav-mobile`
 * swap at **640px** — desktop chrome stays until the viewport is phone-sized.
 *
 * **1120px** is a separate concern: `ChromeHeader.vue` still hides inline search
 * below that width while remaining on desktop skin (same as FakeMediaWiki’s
 * `.nav-item-search` / `.nav-button-search` toggle).
 */
const DESKTOP_MIN_WIDTH = 640

/**
 * Inject the Codex design-token files into the page, scoped to
 * [data-theme="light"] and [data-theme="dark"] selectors instead of `:root`.
 *
 * This is what makes per-subtree theme overrides work: a `<div data-theme="dark">`
 * deep inside a light page re-applies the dark token set to itself, and the
 * Codex CSS custom-property cascade does the rest. Codex ships these tokens
 * as `:root` rules (always-on); we just rewrite the selector at runtime so
 * they cascade off `data-theme` instead.
 *
 * **Dark theme uses two stacked injections.** `theme-wikimedia-ui-mode-dark.css`
 * only overrides colours (no typography/spacing). Upstream stacks base + dark on
 * the same `:root`; we mirror that with `[data-theme="dark"]` ×2 — full light
 * tokens first, then palette overrides — so `--font-size-*`, `--spacing-*`, etc.
 * stay defined under dark mode.
 */
function injectThemedTokens(): void {
  if (typeof document === 'undefined') return

  const inject = (raw: string, selector: string, id: string) => {
    if (document.getElementById(id)) return
    const scoped = raw.replace(/:root\b/g, selector)
    const style = document.createElement('style')
    style.id = id
    style.textContent = scoped
    document.head.appendChild(style)
  }

  inject(lightTokensRaw, '[data-theme="light"]', 'protowiki-tokens-light')

  inject(lightTokensRaw, '[data-theme="dark"]', 'protowiki-tokens-dark-base')
  inject(darkTokensRaw, '[data-theme="dark"]', 'protowiki-tokens-dark-palette')
}

// Module-level reactive refs that mirror the data-skin / data-theme
// attributes on <html>. Hooks read these (read-only); only initTheming()
// writes to them.
export const globalSkin: Ref<Skin> = ref<Skin>('desktop')
export const globalTheme: Ref<Theme> = ref<Theme>('light')

function readUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const value = params.get(name)
  return value
}

function isSkin(value: unknown): value is Skin {
  return value === 'desktop' || value === 'mobile'
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

function resolveSkinFromViewport(): Skin {
  if (typeof window === 'undefined') return 'desktop'
  return window.innerWidth >= DESKTOP_MIN_WIDTH ? 'desktop' : 'mobile'
}

function resolveThemeFromMedia(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function setHtmlAttribute(name: 'data-skin' | 'data-theme', value: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute(name, value)
}

/** Matches Vector / Minerva RL selectors gated on `html.skin-theme-clientpref-night`. */
const WIKI_SKIN_NIGHT_CLASS = 'skin-theme-clientpref-night'

/**
 * Toggle Wikipedia's “night” hook on `<html>` when the **global** Codex theme is dark.
 * ResourceLoader bundles ship rules like `html.skin-theme-clientpref-night .navbox a { … }`
 * for link colours, figure backgrounds, etc.; without this class those rules never match.
 *
 * TemplateStyles (Navbox, Infobox, …) still embed their own light pastel hex values — we
 * patch those under `[data-theme="dark"] .mw-parser-output` in `src/styles/dark.css`.
 */
function syncWikiSkinNightClass(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(WIKI_SKIN_NIGHT_CLASS, theme === 'dark')
}

/**
 * Resolve and apply the initial skin / theme on <html>, then subscribe to
 * viewport and prefers-color-scheme changes so the global state stays
 * reactive when no URL param is pinning the value.
 *
 * Order of precedence:
 *   skin  : ?skin=  URL param  >  viewport (>= 640px desktop, else mobile)
 *   theme : ?theme= URL param  >  prefers-color-scheme
 *
 * Call this once, before mounting the app.
 */
export function initTheming(): void {
  if (typeof window === 'undefined') return

  injectThemedTokens()

  const skinParam = readUrlParam('skin')
  const themeParam = readUrlParam('theme')

  const skinPinned = isSkin(skinParam)
  const themePinned = isTheme(themeParam)

  globalSkin.value = skinPinned ? (skinParam as Skin) : resolveSkinFromViewport()
  globalTheme.value = themePinned ? (themeParam as Theme) : resolveThemeFromMedia()

  setHtmlAttribute('data-skin', globalSkin.value)
  setHtmlAttribute('data-theme', globalTheme.value)
  syncWikiSkinNightClass(globalTheme.value)

  if (!skinPinned) {
    const breakpoint = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`)
    const onBreakpointChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const next: Skin = event.matches ? 'desktop' : 'mobile'
      if (next !== globalSkin.value) {
        globalSkin.value = next
        setHtmlAttribute('data-skin', next)
      }
    }
    breakpoint.addEventListener('change', onBreakpointChange)
  }

  if (!themePinned) {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const onColorSchemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const next: Theme = event.matches ? 'dark' : 'light'
      if (next !== globalTheme.value) {
        globalTheme.value = next
        setHtmlAttribute('data-theme', next)
        syncWikiSkinNightClass(next)
      }
    }
    colorScheme.addEventListener('change', onColorSchemeChange)
  }
}
