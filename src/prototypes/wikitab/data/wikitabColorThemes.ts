import { wikitabColor, type WikitabPaletteFamily, type WikitabPaletteStep } from './wikitabPalette'

const INVERTED_FG = 'var(--color-inverted-fixed)'

export type WikitabColorThemeId =
  | 'default-white'
  | 'red-white'
  | 'orange-white'
  | 'yellow-white'
  | 'lime-white'
  | 'green-white'
  | 'blue-white'
  | 'purple-white'
  | 'pink-white'
  | 'maroon-white'
  | 'black'
  | 'off-black'
  | 'gray'
  | 'red-light'
  | 'orange-light'
  | 'yellow-light'
  | 'lime-light'
  | 'green-light'
  | 'blue-light'
  | 'blue-bold'
  | 'purple-light'
  | 'purple-bold'
  | 'pink-light'
  | 'maroon-light'

export type WikitabColorThemeStyle = {
  bg: string
  border: string
  /** Swatch label on the theme picker card. */
  fg: string
  /**
   * Link / progressive accent on white card surfaces. `null` keeps Codex default
   * blue — used for neutral (gray/black) page themes.
   */
  progressive: string | null
  /** Light backgrounds use a dark translucent hover overlay. */
  lightHover: boolean
  /**
   * Saturated page tint with Codex light mode (white cards): black page chrome,
   * white progressive on the tint, accent progressive on card surfaces.
   */
  lightCards?: boolean
  /** White Show more / tabs on a neutral lightCards tint; cards keep Codex blue. */
  tintPageProgressive?: boolean
  /** Codex document theme; defaults from {@link lightHover} / {@link lightCards}. */
  codexMode?: 'light' | 'dark'
  /** White page with only the link accent swapped — neutral skeletons / placeholders. */
  accentOnWhite?: boolean
}

export const DEFAULT_COLOR_THEME_ID = 'default-white' satisfies WikitabColorThemeId

/** Un-tinted page — same as a missing / null stored preference. */
export function isDefaultColorTheme(id: WikitabColorThemeId | null | undefined): boolean {
  return id === null || id === undefined || id === DEFAULT_COLOR_THEME_ID
}

/** White page chrome with only the progressive / link accent swapped. */
function whiteProgressiveTheme(
  family: WikitabPaletteFamily,
  step: WikitabPaletteStep,
): WikitabColorThemeStyle {
  const progressive = wikitabColor(family, step)
  return {
    bg: '#ffffff',
    border: wikitabColor('gray', 200),
    fg: progressive,
    progressive,
    lightHover: true,
    accentOnWhite: true,
  }
}

const WHITE_PROGRESSIVE_THEME_ITEMS: {
  id: WikitabColorThemeId
  label: string
  family: WikitabPaletteFamily
  step: WikitabPaletteStep
}[] = [
  { id: 'red-white', label: 'Red', family: 'red', step: 500 },
  { id: 'orange-white', label: 'Orange', family: 'orange', step: 400 },
  { id: 'yellow-white', label: 'Yellow', family: 'yellow', step: 400 },
  { id: 'lime-white', label: 'Lime', family: 'lime', step: 500 },
  { id: 'green-white', label: 'Green', family: 'green', step: 600 },
  { id: 'blue-white', label: 'Blue', family: 'blue', step: 600 },
  { id: 'purple-white', label: 'Purple', family: 'purple', step: 700 },
  { id: 'pink-white', label: 'Pink', family: 'pink', step: 800 },
  { id: 'maroon-white', label: 'Maroon', family: 'maroon', step: 700 },
]

export const WIKITAB_COLOR_THEME_ITEMS: {
  id: WikitabColorThemeId
  label: string
}[] = [
  { id: 'default-white', label: 'Default' },
  ...WHITE_PROGRESSIVE_THEME_ITEMS.map(({ id, label }) => ({ id, label })),
  { id: 'black', label: 'Dark' },
  { id: 'off-black', label: 'Off black' },
  { id: 'gray', label: 'Gray' },
  { id: 'red-light', label: 'Red light' },
  { id: 'orange-light', label: 'Orange light' },
  { id: 'yellow-light', label: 'Yellow light' },
  { id: 'lime-light', label: 'Lime light' },
  { id: 'green-light', label: 'Green light' },
  { id: 'blue-light', label: 'Blue light' },
  { id: 'blue-bold', label: 'Blue bold' },
  { id: 'purple-light', label: 'Purple light' },
  { id: 'purple-bold', label: 'Purple bold' },
  { id: 'pink-light', label: 'Pink light' },
  { id: 'maroon-light', label: 'Maroon light' },
]

const COLOR_THEME_CYCLE_IDS = WIKITAB_COLOR_THEME_ITEMS.map((item) => item.id)

/** Step through {@link WIKITAB_COLOR_THEME_ITEMS} for quick theme debugging. */
export function colorThemeCycleId(
  current: WikitabColorThemeId | null | undefined,
  direction: 'prev' | 'next',
): WikitabColorThemeId {
  const id = isDefaultColorTheme(current) ? DEFAULT_COLOR_THEME_ID : current!
  const index = COLOR_THEME_CYCLE_IDS.indexOf(id)
  const start = index >= 0 ? index : 0
  const delta = direction === 'next' ? 1 : -1
  const nextIndex =
    (start + delta + COLOR_THEME_CYCLE_IDS.length) % COLOR_THEME_CYCLE_IDS.length
  return COLOR_THEME_CYCLE_IDS[nextIndex]!
}

/*
 * Color hierarchy (applied in colorThemePageStyle / colorThemeChromeFg):
 *
 * - Page chrome (headings, tab labels on tinted bg): near-black on light / lightCards
 *   themes; inverted on neutral dark themes (black, off-black).
 * - Progressive on light page themes: accent on both page and cards.
 * - Progressive on lightCards themes: white on the tint (Show more, tab underline);
 *   accent on white card surfaces (links, icons).
 * - Neutral gray/black themes (black, off-black): Codex dark mode and default blue
 *   progressive.
 */
export const WIKITAB_COLOR_THEME_STYLES: Record<WikitabColorThemeId, WikitabColorThemeStyle> = {
  'default-white': {
    /* Fixed white — `--background-color-base` follows Codex dark mode and the swatch
       would inherit the active theme’s document mode (e.g. Black → unreadable). */
    bg: '#ffffff',
    border: wikitabColor('gray', 200),
    fg: wikitabColor('gray', 900),
    progressive: null,
    lightHover: true,
  },
  ...Object.fromEntries(
    WHITE_PROGRESSIVE_THEME_ITEMS.map(({ id, family, step }) => [
      id,
      whiteProgressiveTheme(family, step),
    ]),
  ),
  black: {
    /* Codex `--background-color-inverted` flips to a light gray in dark mode; use the
       fixed dark-base value so Black stays black once we sync Codex dark mode. */
    bg: '#101418',
    border: wikitabColor('gray', 800),
    fg: INVERTED_FG,
    progressive: null,
    lightHover: false,
  },
  'off-black': {
    bg: wikitabColor('gray', 800),
    border: wikitabColor('gray', 600),
    fg: INVERTED_FG,
    progressive: null,
    lightHover: false,
  },
  gray: {
    bg: wikitabColor('gray', 50),
    border: wikitabColor('gray', 200),
    fg: wikitabColor('gray', 500),
    progressive: null,
    lightHover: true,
  },
  'red-light': {
    bg: wikitabColor('red', 200),
    border: wikitabColor('red', 300),
    fg: wikitabColor('red', 500),
    progressive: wikitabColor('red', 500),
    lightHover: true,
  },
  'orange-light': {
    bg: wikitabColor('orange', 100),
    border: wikitabColor('orange', 200),
    fg: wikitabColor('orange', 400),
    progressive: wikitabColor('orange', 400),
    lightHover: true,
  },
  'yellow-light': {
    bg: wikitabColor('yellow', 50),
    border: wikitabColor('yellow', 100),
    fg: wikitabColor('yellow', 400),
    progressive: wikitabColor('yellow', 400),
    lightHover: true,
  },
  'lime-light': {
    bg: wikitabColor('lime', 100),
    border: wikitabColor('lime', 200),
    fg: wikitabColor('lime', 500),
    progressive: wikitabColor('lime', 500),
    lightHover: true,
  },
  'green-light': {
    bg: wikitabColor('green', 200),
    border: wikitabColor('green', 300),
    fg: wikitabColor('green', 600),
    progressive: wikitabColor('green', 600),
    lightHover: true,
  },
  'blue-light': {
    bg: wikitabColor('blue', 300),
    border: wikitabColor('blue', 400),
    fg: wikitabColor('blue', 600),
    progressive: wikitabColor('blue', 600),
    lightHover: true,
  },
  'blue-bold': {
    bg: wikitabColor('blue', 500),
    border: wikitabColor('blue', 600),
    fg: INVERTED_FG,
    progressive: wikitabColor('blue', 700),
    lightHover: false,
    lightCards: true,
  },
  'purple-light': {
    bg: wikitabColor('purple', 300),
    border: wikitabColor('purple', 400),
    fg: wikitabColor('purple', 700),
    progressive: wikitabColor('purple', 700),
    lightHover: true,
  },
  'purple-bold': {
    bg: wikitabColor('purple', 500),
    border: wikitabColor('purple', 600),
    fg: INVERTED_FG,
    progressive: wikitabColor('purple', 700),
    lightHover: false,
    lightCards: true,
  },
  'pink-light': {
    bg: wikitabColor('pink', 300),
    border: wikitabColor('pink', 400),
    fg: wikitabColor('pink', 800),
    progressive: wikitabColor('pink', 800),
    lightHover: true,
  },
  'maroon-light': {
    bg: wikitabColor('maroon', 300),
    border: wikitabColor('maroon', 400),
    fg: wikitabColor('maroon', 600),
    progressive: wikitabColor('maroon', 600),
    lightHover: true,
  },
}

const LEGACY_THEME_ALIASES: Record<string, WikitabColorThemeId> = {
  'gray-bold': 'off-black',
  'red-bold': 'red-light',
  'red-dark': 'red-light',
  brown: 'orange-light',
  'brown-light': 'orange-light',
  'orange-dark': 'orange-light',
  'orange-bold': 'orange-light',
  'yellow-bold': 'yellow-light',
  'yellow-dark': 'yellow-light',
  'lime-bold': 'lime-light',
  'lime-dark': 'lime-light',
  'green-dark': 'green-light',
  'blue-dark': 'blue-bold',
  'purple-dark': 'purple-bold',
  'pink-bold': 'pink-light',
  'pink-dark': 'pink-light',
  'maroon-bold': 'maroon-light',
  'maroon-dark': 'maroon-light',
}

const VALID_THEME_IDS = new Set<WikitabColorThemeId>(
  WIKITAB_COLOR_THEME_ITEMS.map((item) => item.id),
)

export function resolveColorThemeId(value: string): WikitabColorThemeId | null {
  if (VALID_THEME_IDS.has(value as WikitabColorThemeId)) {
    return value as WikitabColorThemeId
  }
  return LEGACY_THEME_ALIASES[value] ?? null
}

export function normalizeColorThemeId(raw: unknown): WikitabColorThemeId | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw !== 'string') return null
  return resolveColorThemeId(raw.trim())
}

/** Progressive accent on the saturated page tint (Show more, tab underline). */
const PROGRESSIVE_ON_TINT = '#ffffff'

/** Codex light-mode default — card links on neutral lightCards themes. */
const CODEX_LIGHT_PROGRESSIVE = '#3366cc'

/** Codex document theme to pair with this page tint (bold → dark, light → light). */
export function colorThemeCodexMode(theme: WikitabColorThemeStyle): 'light' | 'dark' {
  if (theme.lightCards) return 'light'
  return theme.codexMode ?? (theme.lightHover ? 'light' : 'dark')
}

export function colorThemeUsesLightCards(id: WikitabColorThemeId): boolean {
  return WIKITAB_COLOR_THEME_STYLES[id].lightCards === true
}

/** Accent-only themes on a white page (Default, Red, Orange, … top-row swatches). */
export function colorThemeIsAccentOnWhite(id: WikitabColorThemeId | null | undefined): boolean {
  if (isDefaultColorTheme(id)) return true
  return WIKITAB_COLOR_THEME_STYLES[id!].accentOnWhite === true
}

function colorThemeUsesWhitePageProgressive(theme: WikitabColorThemeStyle): boolean {
  return (
    theme.lightCards === true &&
    (theme.progressive !== null || theme.tintPageProgressive === true)
  )
}

/** lightCards themes with white Show more / tabs (card links use accent or Codex blue). */
export function colorThemeUsesTintProgressive(id: WikitabColorThemeId): boolean {
  return colorThemeUsesWhitePageProgressive(WIKITAB_COLOR_THEME_STYLES[id])
}

export function colorThemeRemapsCardProgressive(id: WikitabColorThemeId): boolean {
  return colorThemeUsesTintProgressive(id)
}

/** Hue page tints only — not neutral Dark, Off black, or Gray. */
export function colorThemeUsesTintedPageSubtle(id: WikitabColorThemeId): boolean {
  const theme = WIKITAB_COLOR_THEME_STYLES[id]
  if (theme.accentOnWhite) return false
  if (theme.lightCards) return true
  return theme.lightHover && theme.progressive !== null
}

export function colorThemeSubtleFg(theme: WikitabColorThemeStyle): string {
  if (theme.lightCards) return 'rgba(255, 255, 255, 0.72)'
  if (theme.lightHover) {
    if (theme.progressive !== null) {
      /* Hue-tinted page — accent warmed into dark gray (border is too light to mix in). */
      return `color-mix(in srgb, ${wikitabColor('gray', 800)} 58%, ${theme.progressive})`
    }
    return wikitabColor('gray', 500)
  }
  return 'rgba(255, 255, 255, 0.72)'
}

/** Headings and page chrome on the tinted background — not the progressive accent. */
export function colorThemeChromeFg(theme: WikitabColorThemeStyle): string {
  if (theme.lightCards || theme.lightHover) return wikitabColor('gray', 900)
  return theme.fg
}

export type ColorThemeCardStyle = {
  lightHover: boolean
  style: {
    backgroundColor: string
    borderColor: string
    color: string
  }
}

export function colorThemeCardStyle(id: WikitabColorThemeId): ColorThemeCardStyle {
  const colors = WIKITAB_COLOR_THEME_STYLES[id]
  return {
    lightHover: colors.lightHover,
    style: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      color: colors.fg,
    },
  }
}

function colorThemeProgressiveHover(progressive: string): string {
  if (progressive === PROGRESSIVE_ON_TINT) return 'rgba(255, 255, 255, 0.85)'
  return `color-mix(in srgb, ${progressive} 85%, black)`
}

function colorThemeProgressiveActive(progressive: string): string {
  if (progressive === PROGRESSIVE_ON_TINT) return 'rgba(255, 255, 255, 0.75)'
  return `color-mix(in srgb, ${progressive} 75%, black)`
}

function colorThemeProgressiveSubtle(progressive: string): string {
  if (progressive === PROGRESSIVE_ON_TINT) return 'rgba(255, 255, 255, 0.12)'
  return `color-mix(in srgb, ${progressive} 12%, var(--background-color-base))`
}

function colorThemeProgressiveSubtleHover(progressive: string): string {
  if (progressive === PROGRESSIVE_ON_TINT) return 'rgba(255, 255, 255, 0.18)'
  return `color-mix(in srgb, ${progressive} 18%, var(--background-color-base))`
}

function colorThemeProgressiveSubtleActive(progressive: string): string {
  if (progressive === PROGRESSIVE_ON_TINT) return 'rgba(255, 255, 255, 0.26)'
  return `color-mix(in srgb, ${progressive} 26%, var(--background-color-base))`
}

/** Page-chrome quiet button hover fill — Codex subtle + multiply clashes on page tints. */
function colorThemeQuietHoverBg(theme: WikitabColorThemeStyle): string {
  if (theme.lightCards) {
    if (colorThemeUsesWhitePageProgressive(theme)) return 'rgba(255, 255, 255, 0.12)'
    return `color-mix(in srgb, ${CODEX_LIGHT_PROGRESSIVE} 18%, transparent)`
  }
  if (theme.lightHover && theme.progressive !== null) {
    return `color-mix(in srgb, ${theme.progressive} 16%, transparent)`
  }
  if (theme.lightHover) return 'rgba(0, 0, 0, 0.08)'
  return 'rgba(255, 255, 255, 0.12)'
}

function colorThemeQuietActiveBg(theme: WikitabColorThemeStyle): string {
  if (theme.lightCards) {
    if (colorThemeUsesWhitePageProgressive(theme)) return 'rgba(255, 255, 255, 0.2)'
    return `color-mix(in srgb, ${CODEX_LIGHT_PROGRESSIVE} 26%, transparent)`
  }
  if (theme.lightHover && theme.progressive !== null) {
    return `color-mix(in srgb, ${theme.progressive} 26%, transparent)`
  }
  if (theme.lightHover) return 'rgba(0, 0, 0, 0.12)'
  return 'rgba(255, 255, 255, 0.2)'
}

function appendQuietHoverTokens(style: Record<string, string>, theme: WikitabColorThemeStyle): void {
  style['--wikitab-theme-quiet-hover-bg'] = colorThemeQuietHoverBg(theme)
  style['--wikitab-theme-quiet-active-bg'] = colorThemeQuietActiveBg(theme)
}

function colorThemeSkeletonTint(theme: WikitabColorThemeStyle): string {
  return theme.progressive ?? theme.border
}

/** Reserved slots on the tinted page — a step toward the theme border from the page bg. */
function colorThemeSkeletonBg(theme: WikitabColorThemeStyle): string {
  return `color-mix(in srgb, ${theme.bg} 72%, ${colorThemeSkeletonTint(theme)})`
}

/** Thumbnail / line skeletons inside white cards — lightly tinted, still card-local. */
function colorThemeSkeletonOnCardBg(theme: WikitabColorThemeStyle): string {
  return `color-mix(in srgb, var(--background-color-base) 84%, ${colorThemeSkeletonTint(theme)})`
}

/** Image-placeholder icon — warmed from the skeleton tint (Codex --color-placeholder inherits). */
function colorThemeSkeletonIconFg(theme: WikitabColorThemeStyle, onCard = false): string {
  const tint = colorThemeSkeletonTint(theme)
  const grayWeight = onCard ? 48 : 40
  return `color-mix(in srgb, ${wikitabColor('gray', 500)} ${grayWeight}%, ${tint})`
}

function appendSkeletonTokens(style: Record<string, string>, theme: WikitabColorThemeStyle): void {
  if (theme.accentOnWhite) return
  style['--wikitab-theme-skeleton-bg'] = colorThemeSkeletonBg(theme)
  style['--wikitab-theme-skeleton-on-card-bg'] = colorThemeSkeletonOnCardBg(theme)
  style['--wikitab-theme-skeleton-icon'] = colorThemeSkeletonIconFg(theme)
  style['--wikitab-theme-skeleton-on-card-icon'] = colorThemeSkeletonIconFg(theme, true)
}

function appendProgressiveTokens(style: Record<string, string>, progressive: string): void {
  const progressiveHover = colorThemeProgressiveHover(progressive)
  const progressiveActive = colorThemeProgressiveActive(progressive)
  const progressiveSubtle = colorThemeProgressiveSubtle(progressive)
  const progressiveSubtleHover = colorThemeProgressiveSubtleHover(progressive)
  const progressiveSubtleActive = colorThemeProgressiveSubtleActive(progressive)

  style['--color-progressive'] = progressive
  style['--color-progressive--hover'] = progressiveHover
  style['--color-progressive--active'] = progressiveActive
  style['--border-color-progressive'] = progressive
  style['--border-color-progressive--hover'] = progressiveHover
  style['--border-color-progressive--active'] = progressiveActive
  style['--border-color-progressive--focus'] = progressive
  style['--box-shadow-color-progressive--focus'] = progressive
  style['--background-color-progressive'] = progressive
  style['--background-color-progressive--hover'] = progressiveHover
  style['--background-color-progressive--active'] = progressiveActive
  style['--background-color-progressive-subtle'] = progressiveSubtle
  style['--background-color-progressive-subtle--hover'] = progressiveSubtleHover
  style['--background-color-progressive-subtle--active'] = progressiveSubtleActive

  /* Show more and tab underline read page-scope aliases — set explicitly on colorful
     themes so Codex defaults from <html> do not leak through. Card links and the
     hero search field pick up --wikitab-theme-card-progressive* via scoped CSS. */
  style['--color-link'] = progressive
  style['--color-link--hover'] = progressiveHover
  style['--color-link--active'] = progressiveActive
  style['--color-visited'] = progressive
  style['--color-visited--hover'] = progressiveHover
  style['--color-visited--active'] = progressiveActive
  style['--box-shadow-color-progressive-selected'] = progressive
  style['--box-shadow-color-progressive-selected--hover'] = progressiveHover
  style['--box-shadow-color-progressive-selected--active'] = progressiveActive
}

/** Accent on white card surfaces — also drives hero search progressive styling. */
function appendThemeCardProgressiveTokens(
  style: Record<string, string>,
  progressive: string,
): void {
  style['--wikitab-theme-card-progressive'] = progressive
  style['--wikitab-theme-card-progressive--hover'] = colorThemeProgressiveHover(progressive)
  style['--wikitab-theme-card-progressive--active'] = colorThemeProgressiveActive(progressive)
  style['--wikitab-theme-card-progressive-subtle'] = colorThemeProgressiveSubtle(progressive)
  style['--wikitab-theme-card-progressive-subtle--hover'] =
    colorThemeProgressiveSubtleHover(progressive)
  style['--wikitab-theme-card-progressive-subtle--active'] =
    colorThemeProgressiveSubtleActive(progressive)
}

export function colorThemePageStyle(id: WikitabColorThemeId): Record<string, string> {
  const theme = WIKITAB_COLOR_THEME_STYLES[id]

  const style: Record<string, string> = {
    backgroundColor: theme.bg,
    '--wikitab-theme-bg': theme.bg,
    '--wikitab-theme-border': theme.border,
    '--wikitab-theme-fg': colorThemeChromeFg(theme),
    '--wikitab-theme-subtle': colorThemeSubtleFg(theme),
    /* Neutral Codex subtle for white card surfaces inside a tinted page. */
    '--wikitab-codex-subtle': wikitabColor('gray', 500),
  }

  if (theme.lightCards) {
    const cardAccent = theme.progressive ?? CODEX_LIGHT_PROGRESSIVE
    appendThemeCardProgressiveTokens(style, cardAccent)
    if (colorThemeUsesWhitePageProgressive(theme)) {
      appendProgressiveTokens(style, PROGRESSIVE_ON_TINT)
    } else {
      appendProgressiveTokens(style, cardAccent)
    }
  } else if (theme.progressive !== null) {
    appendProgressiveTokens(style, theme.progressive)
    appendThemeCardProgressiveTokens(style, theme.progressive)
  } else if (theme.lightHover) {
    /* Gray — null progressive alone does not survive card-scoped remaps in index.vue. */
    appendProgressiveTokens(style, CODEX_LIGHT_PROGRESSIVE)
    appendThemeCardProgressiveTokens(style, CODEX_LIGHT_PROGRESSIVE)
  } else {
    /* black / off-black — white cards keep Codex blue links. */
    appendThemeCardProgressiveTokens(style, CODEX_LIGHT_PROGRESSIVE)
  }

  appendQuietHoverTokens(style, theme)
  appendSkeletonTokens(style, theme)

  return style
}
