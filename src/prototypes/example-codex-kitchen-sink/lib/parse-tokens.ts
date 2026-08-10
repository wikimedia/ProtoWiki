export type TokenKind =
  | 'color-text'
  | 'color-bg'
  | 'color-border'
  | 'color-accent'
  | 'spacing'
  | 'radius'
  | 'font-size'
  | 'font-weight'
  | 'font-family'
  | 'line-height'
  | 'text-decoration'
  | 'text-overflow'
  | 'shadow'
  | 'opacity'
  | 'size'
  | 'generic'

export type TokenFamily =
  | 'Color'
  | 'Spacing'
  | 'Typography'
  | 'Border'
  | 'Shadow'
  | 'Sizing'
  | 'Opacity'
  | 'Transition'
  | 'Z-index'
  | 'Other'

export interface TokenEntry {
  name: string
  value: string
  category: string
  kind: TokenKind
  family: TokenFamily
  deprecated: boolean
}

export interface TokenFamilyGroup {
  family: TokenFamily
  categories: { category: string; tokens: TokenEntry[] }[]
}

export function inferTokenKind(name: string): TokenKind {
  if (name.startsWith('--background-color-')) return 'color-bg'
  if (name.startsWith('--border-color-')) return 'color-border'
  if (name.startsWith('--accent-color-')) return 'color-accent'
  if (name.startsWith('--color-')) return 'color-text'
  if (name.startsWith('--spacing-')) return 'spacing'
  if (name.startsWith('--border-radius-')) return 'radius'
  if (name.startsWith('--font-size-')) return 'font-size'
  if (name.startsWith('--font-weight-')) return 'font-weight'
  if (name.startsWith('--font-family-')) return 'font-family'
  if (name.startsWith('--line-height-')) return 'line-height'
  if (name.startsWith('--text-decoration-')) return 'text-decoration'
  if (name.startsWith('--text-overflow-')) return 'text-overflow'
  if (name.startsWith('--box-shadow-')) return 'shadow'
  if (name.startsWith('--opacity-')) return 'opacity'
  if (
    name.startsWith('--size-') ||
    name.startsWith('--min-size-') ||
    name.startsWith('--max-size-') ||
    name.startsWith('--min-width-') ||
    name.startsWith('--max-width-') ||
    name.startsWith('--width-') ||
    name.startsWith('--height-')
  ) {
    return 'size'
  }
  return 'generic'
}

export function inferTokenFamily(name: string): TokenFamily {
  if (
    name.startsWith('--color-') ||
    name.startsWith('--background-color-') ||
    name.startsWith('--border-color-') ||
    name.startsWith('--accent-color-')
  ) {
    return 'Color'
  }
  if (name.startsWith('--spacing-')) return 'Spacing'
  if (
    name.startsWith('--font-') ||
    name.startsWith('--line-height-') ||
    name.startsWith('--letter-spacing-') ||
    name.startsWith('--text-decoration-') ||
    name.startsWith('--text-overflow-')
  ) {
    return 'Typography'
  }
  if (
    name.startsWith('--border-radius-') ||
    name.startsWith('--border-width-') ||
    name.startsWith('--border-style-') ||
    name.startsWith('--position-offset-')
  ) {
    return 'Border'
  }
  if (name.startsWith('--box-shadow-')) return 'Shadow'
  if (name.startsWith('--opacity-')) return 'Opacity'
  if (name.startsWith('--transition-') || name.startsWith('--animation-')) return 'Transition'
  if (name.startsWith('--z-index-')) return 'Z-index'
  if (
    name.startsWith('--size-') ||
    name.startsWith('--min-') ||
    name.startsWith('--max-') ||
    name.startsWith('--width-') ||
    name.startsWith('--height-')
  ) {
    return 'Sizing'
  }
  return 'Other'
}

export function inferTokenCategory(name: string): string {
  if (name.startsWith('--background-color-')) return 'Background colors'
  if (name.startsWith('--border-color-')) return 'Border colors'
  if (name.startsWith('--color-')) return 'Text colors'
  if (name.startsWith('--spacing-')) return 'Spacing'
  if (
    name.startsWith('--border-radius-') ||
    name.startsWith('--border-width-') ||
    name.startsWith('--border-style-') ||
    name.startsWith('--position-offset-')
  ) {
    return 'Border'
  }
  if (name.startsWith('--font-') || name.startsWith('--line-height-') || name.startsWith('--letter-spacing-')) {
    return 'Typography'
  }
  if (name.startsWith('--box-shadow-')) return 'Shadow'
  if (name.startsWith('--opacity-')) return 'Opacity'
  if (name.startsWith('--size-') || name.startsWith('--min-') || name.startsWith('--max-') || name.startsWith('--width-') || name.startsWith('--height-')) {
    return 'Sizing'
  }
  if (name.startsWith('--transition-')) return 'Transition'
  if (name.startsWith('--animation-')) return 'Animation'
  if (name.startsWith('--z-index-')) return 'Z-index'
  if (name.startsWith('--cursor-')) return 'Cursor'
  if (name.startsWith('--filter-')) return 'Filter'
  if (name.startsWith('--outline-')) return 'Outline'
  if (name.startsWith('--mix-blend-mode-')) return 'Blend mode'
  if (name.startsWith('--text-decoration-')) return 'Text decoration'
  if (name.startsWith('--text-overflow-')) return 'Text overflow'
  if (name.startsWith('--transform-')) return 'Transform'
  if (name.startsWith('--accent-color-')) return 'Accent'
  if (name.startsWith('--position-')) return 'Position'
  if (name.startsWith('--tab-size-')) return 'Tab size'
  return 'Other'
}

export function sortTokensWithDeprecatedLast(
  tokens: TokenEntry[],
  compare: (a: TokenEntry, b: TokenEntry) => number = (a, b) => a.name.localeCompare(b.name),
): TokenEntry[] {
  return [...tokens].sort((a, b) => {
    if (a.deprecated !== b.deprecated) return a.deprecated ? 1 : -1
    return compare(a, b)
  })
}

function parseDeprecatedTokenNames(cssBlock: string): Set<string> {
  const deprecated = new Set<string>()
  const re =
    /\/\*\s*Warning:\s*the following token name is deprecated[^*]*\*\/\s*\n\s*(--[a-z0-9-]+):/g
  let match: RegExpExecArray | null

  while ((match = re.exec(cssBlock)) !== null) {
    deprecated.add(match[1])
  }

  return deprecated
}

export function parseTokensFromCss(css: string): TokenEntry[] {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) return []

  const rootBlock = rootMatch[1]
  const deprecatedNames = parseDeprecatedTokenNames(rootBlock)
  const seen = new Set<string>()
  const tokens: TokenEntry[] = []
  const re = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm
  let match: RegExpExecArray | null

  while ((match = re.exec(rootBlock)) !== null) {
    const name = match[1]
    if (seen.has(name)) continue
    seen.add(name)
    tokens.push({
      name,
      value: match[2].trim(),
      category: inferTokenCategory(name),
      kind: inferTokenKind(name),
      family: inferTokenFamily(name),
      deprecated: deprecatedNames.has(name),
    })
  }

  return sortTokensWithDeprecatedLast(tokens)
}

const categoryOrder = [
  'Text colors',
  'Background colors',
  'Border colors',
  'Spacing',
  'Border',
  'Typography',
  'Shadow',
  'Opacity',
  'Sizing',
  'Transition',
  'Animation',
  'Z-index',
  'Cursor',
  'Filter',
  'Outline',
  'Blend mode',
  'Text decoration',
  'Transform',
  'Accent',
  'Position',
  'Tab size',
  'Other',
] as const

const familyOrder: TokenFamily[] = [
  'Color',
  'Spacing',
  'Typography',
  'Border',
  'Shadow',
  'Sizing',
  'Opacity',
  'Transition',
  'Z-index',
  'Other',
]

function groupByCategory(tokens: TokenEntry[]): { category: string; tokens: TokenEntry[] }[] {
  const map = new Map<string, TokenEntry[]>()
  for (const token of tokens) {
    const list = map.get(token.category) ?? []
    list.push(token)
    map.set(token.category, list)
  }

  return categoryOrder
    .filter((category) => map.has(category))
    .map((category) => ({
      category,
      tokens: sortTokensWithDeprecatedLast(map.get(category)!),
    }))
}

export function groupTokensByCategory(tokens: TokenEntry[]): { category: string; tokens: TokenEntry[] }[] {
  return groupByCategory(tokens)
}

export function groupTokensByFamily(
  tokens: TokenEntry[],
  options: { exclude?: TokenFamily[] } = {},
): TokenFamilyGroup[] {
  const excluded = new Set(options.exclude ?? [])
  const byFamily = new Map<TokenFamily, TokenEntry[]>()

  for (const token of tokens) {
    if (excluded.has(token.family)) continue
    const list = byFamily.get(token.family) ?? []
    list.push(token)
    byFamily.set(token.family, list)
  }

  return familyOrder
    .filter((family) => !excluded.has(family) && byFamily.has(family))
    .map((family) => ({
      family,
      categories: groupByCategory(byFamily.get(family)!),
    }))
}

export function getTokensForFamily(tokens: TokenEntry[], family: TokenFamily): TokenEntry[] {
  return tokens.filter((token) => token.family === family)
}

export type TypographySubTab =
  | 'style'
  | 'font'
  | 'size'
  | 'weight'
  | 'line-height'
  | 'decoration'
  | 'overflow'

const typographySubTabOrder: TypographySubTab[] = [
  'style',
  'font',
  'size',
  'weight',
  'line-height',
  'decoration',
  'overflow',
]

const typographySubTabLabels: Record<TypographySubTab, string> = {
  style: 'Style',
  font: 'Font',
  size: 'Size',
  weight: 'Weight',
  'line-height': 'Line height',
  decoration: 'Decoration',
  overflow: 'Overflow',
}

export const typographySubTabs = typographySubTabOrder.map((id) => ({
  id,
  label: typographySubTabLabels[id],
}))

export function getTypographyTokensForSubTab(
  tokens: TokenEntry[],
  subTab: Exclude<TypographySubTab, 'style'>,
): TokenEntry[] {
  const kindBySubTab: Record<Exclude<TypographySubTab, 'style'>, TokenKind> = {
    font: 'font-family',
    size: 'font-size',
    weight: 'font-weight',
    'line-height': 'line-height',
    decoration: 'text-decoration',
    overflow: 'text-overflow',
  }

  const filtered = getTokensForFamily(tokens, 'Typography').filter(
    (token) => token.kind === kindBySubTab[subTab],
  )

  if (subTab === 'size') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) => parseFontSizeValue(a.value) - parseFontSizeValue(b.value))
  }

  if (subTab === 'weight') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) => parseFontWeightValue(a.value) - parseFontWeightValue(b.value))
  }

  if (subTab === 'line-height') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) => lineHeightSortIndex(a.name) - lineHeightSortIndex(b.name))
  }

  if (subTab === 'decoration') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) => textDecorationSortIndex(a.name) - textDecorationSortIndex(b.name))
  }

  if (subTab === 'overflow') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) => textOverflowSortIndex(a.name) - textOverflowSortIndex(b.name))
  }

  return sortTokensWithDeprecatedLast(filtered)
}

const lineHeightScaleOrder = [
  'x-small',
  'small',
  'medium',
  'content',
  'large',
  'x-large',
  'xx-large',
  'xxx-large',
] as const

function lineHeightSortIndex(name: string): number {
  const suffix = name.slice('--line-height-'.length)
  const index = lineHeightScaleOrder.indexOf(suffix as (typeof lineHeightScaleOrder)[number])
  return index === -1 ? lineHeightScaleOrder.length : index
}

const textDecorationOrder = ['none', 'underline', 'line-through'] as const

function textDecorationSortIndex(name: string): number {
  const suffix = name.slice('--text-decoration-'.length)
  const index = textDecorationOrder.indexOf(suffix as (typeof textDecorationOrder)[number])
  return index === -1 ? textDecorationOrder.length : index
}

const textOverflowOrder = ['clip', 'ellipsis'] as const

function textOverflowSortIndex(name: string): number {
  const suffix = name.slice('--text-overflow-'.length)
  const index = textOverflowOrder.indexOf(suffix as (typeof textOverflowOrder)[number])
  return index === -1 ? textOverflowOrder.length : index
}

function parseFontSizeValue(value: string): number {
  const match = value.match(/^([\d.]+)rem$/)
  return match ? parseFloat(match[1]) : 0
}

function parseFontWeightValue(value: string): number {
  return parseFloat(value) || 0
}

export type ColorSubTab = 'text' | 'background' | 'border' | 'accent' | 'palette'

const colorSubTabOrder: ColorSubTab[] = ['text', 'background', 'border', 'accent', 'palette']

const colorSubTabLabels: Record<ColorSubTab, string> = {
  text: 'Text',
  background: 'Background',
  border: 'Border',
  accent: 'Accent',
  palette: 'Palette',
}

export const colorSubTabs = colorSubTabOrder.map((id) => ({
  id,
  label: colorSubTabLabels[id],
}))

export function getColorTokensForSubTab(tokens: TokenEntry[], subTab: ColorSubTab): TokenEntry[] {
  if (subTab === 'palette') return []

  const kindBySubTab: Record<Exclude<ColorSubTab, 'palette'>, TokenKind> = {
    text: 'color-text',
    background: 'color-bg',
    border: 'color-border',
    accent: 'color-accent',
  }

  return sortTokensWithDeprecatedLast(
    getTokensForFamily(tokens, 'Color').filter((token) => token.kind === kindBySubTab[subTab]),
  )
}

export type TokenSection = 'layout' | 'appearance' | 'animation'

export type LayoutSubTab =
  | 'spacing'
  | 'size'
  | 'breakpoint'
  | 'z-index'
  | 'box-sizing'

export type AppearanceSubTab = 'border' | 'box-shadow' | 'cursor' | 'opacity' | 'outline'

export type AnimationSubTab = 'animation' | 'transition'

export type TokenSubTab = LayoutSubTab | AppearanceSubTab | AnimationSubTab

const layoutSubTabOrder: LayoutSubTab[] = [
  'spacing',
  'size',
  'breakpoint',
  'z-index',
  'box-sizing',
]

const appearanceSubTabOrder: AppearanceSubTab[] = [
  'border',
  'box-shadow',
  'cursor',
  'opacity',
  'outline',
]

const animationSubTabOrder: AnimationSubTab[] = ['animation', 'transition']

const layoutSubTabLabels: Record<LayoutSubTab, string> = {
  spacing: 'Spacing',
  size: 'Size',
  breakpoint: 'Breakpoint',
  'z-index': 'Z-index',
  'box-sizing': 'Box-sizing',
}

const appearanceSubTabLabels: Record<AppearanceSubTab, string> = {
  border: 'Border',
  'box-shadow': 'Box-shadow',
  cursor: 'Cursor',
  opacity: 'Opacity',
  outline: 'Outline',
}

const animationSubTabLabels: Record<AnimationSubTab, string> = {
  animation: 'Animation',
  transition: 'Transition',
}

export const tokenSectionTabs = [
  {
    id: 'layout' as const,
    label: 'Layout',
    subTabs: layoutSubTabOrder.map((id) => ({ id, label: layoutSubTabLabels[id] })),
  },
  {
    id: 'appearance' as const,
    label: 'Appearance',
    subTabs: appearanceSubTabOrder.map((id) => ({ id, label: appearanceSubTabLabels[id] })),
  },
  {
    id: 'animation' as const,
    label: 'Animation',
    subTabs: animationSubTabOrder.map((id) => ({ id, label: animationSubTabLabels[id] })),
  },
]

const borderShorthandNames = new Set([
  '--border-base',
  '--border-subtle',
  '--border-progressive',
  '--border-destructive',
  '--border-transparent',
])

export type BorderTokenGroup = 'Shorthand' | 'Radius' | 'Style' | 'Width' | 'Offset'

export function isPositionOffsetToken(name: string): boolean {
  return name.startsWith('--position-offset-')
}

export type TransitionTokenGroup = 'Property' | 'Timing' | 'Duration'

export type AnimationTokenGroup = 'Timing' | 'Iteration' | 'Duration' | 'Delay' | 'Transform'

export function getBorderTokenGroup(name: string): BorderTokenGroup {
  if (borderShorthandNames.has(name)) return 'Shorthand'
  if (name.startsWith('--border-radius-')) return 'Radius'
  if (name.startsWith('--border-style-')) return 'Style'
  if (isPositionOffsetToken(name)) return 'Offset'
  return 'Width'
}

export function getTransitionTokenGroup(name: string): TransitionTokenGroup {
  if (name.startsWith('--transition-property-')) return 'Property'
  if (name.startsWith('--transition-timing-function-')) return 'Timing'
  return 'Duration'
}

export function getAnimationTokenGroup(name: string): AnimationTokenGroup {
  if (name.startsWith('--animation-timing-function-')) return 'Timing'
  if (name.startsWith('--animation-iteration-count-')) return 'Iteration'
  if (name.startsWith('--animation-duration-')) return 'Duration'
  if (name.startsWith('--animation-delay-')) return 'Delay'
  return 'Transform'
}

const borderTokenOrder = [
  '--border-base',
  '--border-subtle',
  '--border-progressive',
  '--border-destructive',
  '--border-transparent',
  '--border-radius-sharp',
  '--border-radius-base',
  '--border-radius-pill',
  '--border-radius-circle',
  '--border-style-base',
  '--border-style-dashed',
  '--border-width-base',
  '--border-width-thick',
  '--border-width-input-radio--checked',
  '--position-offset-border-width-base',
] as const

export type BoxShadowTokenGroup = 'Shorthand' | 'Color' | 'Inset' | 'Outset' | 'Deprecated'

const deprecatedBoxShadowTokens = new Set([
  '--box-shadow-drop-small',
  '--box-shadow-drop-medium',
  '--box-shadow-drop-xx-large',
])

export function getBoxShadowTokenGroup(name: string): BoxShadowTokenGroup {
  if (name.startsWith('--box-shadow-color-')) return 'Color'
  if (name.startsWith('--box-shadow-inset-')) return 'Inset'
  if (name.startsWith('--box-shadow-outset-')) return 'Outset'
  if (deprecatedBoxShadowTokens.has(name)) return 'Deprecated'
  return 'Shorthand'
}

const boxShadowTokenOrder = [
  '--box-shadow-small',
  '--box-shadow-small-top',
  '--box-shadow-small-bottom',
  '--box-shadow-medium',
  '--box-shadow-large',
  '--box-shadow-inset-small',
  '--box-shadow-inset-medium',
  '--box-shadow-inset-medium-vertical',
  '--box-shadow-outset-small',
  '--box-shadow-outset-small-top',
  '--box-shadow-outset-small-bottom',
  '--box-shadow-outset-small-start',
  '--box-shadow-outset-medium-below',
  '--box-shadow-outset-medium-around',
  '--box-shadow-outset-large-below',
  '--box-shadow-outset-large-around',
  '--box-shadow-color-alpha-base',
  '--box-shadow-color-base',
  '--box-shadow-color-destructive--focus',
  '--box-shadow-color-inverted',
  '--box-shadow-color-progressive--active',
  '--box-shadow-color-progressive--focus',
  '--box-shadow-color-progressive-selected',
  '--box-shadow-color-progressive-selected--active',
  '--box-shadow-color-progressive-selected--hover',
  '--box-shadow-color-transparent',
  '--box-shadow-drop-small',
  '--box-shadow-drop-medium',
  '--box-shadow-drop-xx-large',
] as const

const cursorTokenOrder = [
  '--cursor-base',
  '--cursor-base--disabled',
  '--cursor-base--hover',
  '--cursor-grab',
  '--cursor-grabbing',
  '--cursor-help',
  '--cursor-move',
  '--cursor-not-allowed',
  '--cursor-resize-nesw',
  '--cursor-resize-nwse',
  '--cursor-text',
  '--cursor-zoom-in',
  '--cursor-zoom-out',
] as const

const opacityTokenOrder = [
  '--opacity-base',
  '--opacity-medium',
  '--opacity-low',
  '--opacity-transparent',
  '--opacity-icon-base',
  '--opacity-icon-base--hover',
  '--opacity-icon-base--selected',
  '--opacity-icon-base--disabled',
  '--opacity-icon-placeholder',
  '--opacity-icon-subtle',
] as const

const outlineTokenOrder = [
  '--outline-base--focus',
  '--outline-color-progressive--focus',
] as const

const transitionTokenOrder = [
  '--transition-property-base',
  '--transition-property-fade',
  '--transition-property-icon',
  '--transition-property-icon-css-only',
  '--transition-property-toast',
  '--transition-property-toggle-switch-grip',
  '--transition-timing-function-system',
  '--transition-timing-function-user',
  '--transition-duration-base',
  '--transition-duration-medium',
] as const

const animationTokenOrder = [
  '--animation-timing-function-base',
  '--animation-timing-function-bouncing',
  '--animation-iteration-count-base',
  '--animation-duration-fast',
  '--animation-duration-medium',
  '--animation-duration-slow',
  '--animation-delay-none',
  '--animation-delay-medium',
  '--animation-delay-slow',
  '--transform-checkbox-tick--checked',
  '--transform-progress-indicator-spinner-start',
  '--transform-progress-indicator-spinner-end',
] as const

const breakpointTokenOrder = [
  '--min-width-breakpoint-mobile',
  '--min-width-breakpoint-tablet',
  '--min-width-breakpoint-desktop',
  '--min-width-breakpoint-desktop-wide',
  '--max-width-breakpoint-mobile',
  '--max-width-breakpoint-tablet',
  '--max-width-breakpoint-desktop',
] as const

export function inferTokenSubTab(name: string): TokenSubTab | null {
  if (name.startsWith('--spacing-')) return 'spacing'
  if (name.startsWith('--box-sizing-')) return 'box-sizing'
  if (name.startsWith('--z-index-')) return 'z-index'
  if (name.includes('breakpoint')) return 'breakpoint'
  if (name.startsWith('--background-position-') || name.startsWith('--background-size-')) return 'size'
  if (name.startsWith('--position-offset-')) return 'border'

  if (
    name.startsWith('--size-') ||
    name.startsWith('--min-size-') ||
    name.startsWith('--max-size-') ||
    name.startsWith('--min-width-') ||
    name.startsWith('--max-width-') ||
    name.startsWith('--width-') ||
    name.startsWith('--height-') ||
    name.startsWith('--min-height-') ||
    name.startsWith('--max-height-') ||
    name.startsWith('--background-size-') ||
    name.startsWith('--tab-size-')
  ) {
    return 'size'
  }

  if (
    name.startsWith('--border-radius-') ||
    name.startsWith('--border-width-') ||
    name.startsWith('--border-style-') ||
    borderShorthandNames.has(name)
  ) {
    return 'border'
  }

  if (name.startsWith('--box-shadow-')) return 'box-shadow'
  if (name.startsWith('--cursor-')) return 'cursor'
  if (name.startsWith('--opacity-')) return 'opacity'
  if (name.startsWith('--outline-')) return 'outline'

  if (name.startsWith('--transition-')) return 'transition'
  if (name.startsWith('--animation-') || name.startsWith('--transform-')) return 'animation'

  return null
}

export function inferTokenSection(subTab: TokenSubTab): TokenSection {
  if (layoutSubTabOrder.includes(subTab as LayoutSubTab)) return 'layout'
  if (appearanceSubTabOrder.includes(subTab as AppearanceSubTab)) return 'appearance'
  return 'animation'
}

export function getGeneralTokens(tokens: TokenEntry[]): TokenEntry[] {
  return tokens.filter((token) => token.family !== 'Color' && token.family !== 'Typography')
}

const spacingTokenOrder = [
  '--spacing-0',
  '--spacing-6',
  '--spacing-12',
  '--spacing-25',
  '--spacing-30',
  '--spacing-35',
  '--spacing-50',
  '--spacing-65',
  '--spacing-75',
  '--spacing-100',
  '--spacing-125',
  '--spacing-150',
  '--spacing-200',
  '--spacing-250',
  '--spacing-300',
  '--spacing-400',
  '--spacing-half',
  '--spacing-full',
  '--spacing-horizontal-button',
  '--spacing-horizontal-button-large',
  '--spacing-horizontal-button-small',
  '--spacing-horizontal-button-icon-only',
  '--spacing-horizontal-button-small-icon-only',
  '--spacing-horizontal-input-text-two-end-icons',
  '--spacing-start-typeahead-search-figure',
  '--spacing-start-typeahead-search-icon',
  '--spacing-typeahead-search-focus-addition',
  '--spacing-toggle-switch-grip-start',
  '--spacing-toggle-switch-grip-end',
] as const

const sizeTokenOrder = [
  '--size-0',
  '--size-6',
  '--size-12',
  '--size-25',
  '--size-50',
  '--size-75',
  '--size-100',
  '--size-125',
  '--size-150',
  '--size-200',
  '--size-250',
  '--size-275',
  '--size-300',
  '--size-400',
  '--size-800',
  '--size-1200',
  '--size-1600',
  '--size-2400',
  '--size-2800',
  '--size-3200',
  '--size-4000',
  '--size-5600',
  '--size-absolute-1',
  '--size-absolute-9999',
  '--size-viewport-width-full',
  '--size-viewport-height-full',
  '--size-content-min',
  '--size-content-fit',
  '--size-content-max',
  '--size-third',
  '--size-half',
  '--size-full',
  '--size-double',
  '--size-search-figure',
  '--size-icon-x-small',
  '--size-icon-small',
  '--size-icon-medium',
  '--size-toggle-switch-grip',
  '--min-size-interactive-pointer',
  '--min-size-interactive-touch',
  '--min-size-icon-x-small',
  '--min-size-icon-small',
  '--min-size-icon-medium',
  '--min-size-search-figure',
  '--min-size-input-binary',
  '--min-size-input-chip-clear-button',
  '--min-size-toggle-switch-grip',
  '--min-width-medium',
  '--min-width-breakpoint-mobile',
  '--min-width-breakpoint-tablet',
  '--min-width-breakpoint-desktop',
  '--min-width-breakpoint-desktop-wide',
  '--min-width-toggle-switch',
  '--max-width-base',
  '--max-width-breakpoint-mobile',
  '--max-width-breakpoint-tablet',
  '--max-width-breakpoint-desktop',
  '--max-width-button',
  '--min-height-text-area',
  '--min-height-table-header',
  '--min-height-table-footer',
  '--min-height-toggle-switch',
  '--max-height-chip',
  '--width-toggle-switch',
  '--height-toggle-switch',
  '--background-position-base',
  '--background-size-search-figure',
  '--tab-size-base',
] as const

function manualTokenSortIndex(name: string, order: readonly string[]): number {
  const index = order.indexOf(name)
  return index === -1 ? order.length : index
}

export type SpacingTokenGroup = 'Scale' | 'Positioning' | 'Components'

export function getSpacingTokenGroup(name: string): SpacingTokenGroup {
  if (name === '--spacing-half' || name === '--spacing-full') return 'Positioning'
  if (/^--spacing-\d/.test(name)) return 'Scale'
  return 'Components'
}

export type SizeTokenGroup =
  | 'Scale'
  | 'Absolute'
  | 'Viewport'
  | 'Content sizing'
  | 'Fractions'
  | 'Component sizes'
  | 'Minimum sizes'
  | 'Minimum widths'
  | 'Maximum widths'
  | 'Minimum heights'
  | 'Maximum heights'
  | 'Component dimensions'
  | 'Other'

export type BreakpointTokenGroup = 'Minimum width' | 'Maximum width'

export function getBreakpointTokenGroup(name: string): BreakpointTokenGroup {
  return name.startsWith('--max-width-breakpoint-') ? 'Maximum width' : 'Minimum width'
}

export function getSizeTokenGroup(name: string): SizeTokenGroup {
  if (/^--size-\d/.test(name)) return 'Scale'
  if (name.startsWith('--size-absolute-')) return 'Absolute'
  if (name.startsWith('--size-viewport-')) return 'Viewport'
  if (name.startsWith('--size-content-')) return 'Content sizing'
  if (
    name === '--size-third' ||
    name === '--size-half' ||
    name === '--size-full' ||
    name === '--size-double'
  ) {
    return 'Fractions'
  }
  if (
    name.startsWith('--size-search-') ||
    name.startsWith('--size-icon-') ||
    name.startsWith('--size-toggle-')
  ) {
    return 'Component sizes'
  }
  if (name.startsWith('--min-size-')) return 'Minimum sizes'
  if (name.startsWith('--min-width-')) return 'Minimum widths'
  if (name.startsWith('--max-width-')) return 'Maximum widths'
  if (name.startsWith('--min-height-')) return 'Minimum heights'
  if (name.startsWith('--max-height-')) return 'Maximum heights'
  if (name.startsWith('--width-') || name.startsWith('--height-')) return 'Component dimensions'
  if (name.startsWith('--background-position-') || name.startsWith('--background-size-')) return 'Background'
  return 'Other'
}

export function isBackgroundPositionToken(name: string): boolean {
  return name.startsWith('--background-position-')
}

export function isBackgroundSizeToken(name: string): boolean {
  return name.startsWith('--background-size-')
}

export type ZIndexTokenGroup = 'Layout' | 'Stacking'

export function getZIndexTokenGroup(name: string): ZIndexTokenGroup {
  return name.startsWith('--z-index-stacking-') ? 'Stacking' : 'Layout'
}

export function parseZIndexValue(value: string): number {
  return Number.parseInt(value.trim(), 10)
}

export function usesDimensionBarDemo(token: TokenEntry): boolean {
  const { name, value } = token
  if (value === 'none' || value === 'cover') return false
  if (name.startsWith('--size-content-')) return false
  if (name === '--tab-size-base') return false
  return true
}

export function parsePlainPercentage(value: string): number | null {
  const match = value.trim().match(/^([\d.]+)%$/)
  return match ? parseFloat(match[1]) : null
}

export function isZeroDimensionToken(token: TokenEntry): boolean {
  const value = token.value.trim()
  if (value === '0') return true
  if (/^0(?:px|rem|em|%|vw|vh|ch|ex)?$/i.test(value)) return true
  return parsePlainPercentage(value) === 0
}

export function getTokensForTokenSubTab(
  tokens: TokenEntry[],
  section: TokenSection,
  subTab: TokenSubTab,
): TokenEntry[] {
  const filtered = getGeneralTokens(tokens).filter((token) => {
    const tokenSubTab = inferTokenSubTab(token.name)
    return tokenSubTab === subTab && inferTokenSection(tokenSubTab) === section
  })

  if (subTab === 'spacing') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, spacingTokenOrder) - manualTokenSortIndex(b.name, spacingTokenOrder),
    )
  }

  if (subTab === 'size') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, sizeTokenOrder) - manualTokenSortIndex(b.name, sizeTokenOrder),
    )
  }

  if (subTab === 'breakpoint') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, breakpointTokenOrder) - manualTokenSortIndex(b.name, breakpointTokenOrder),
    )
  }

  if (subTab === 'z-index') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) => {
      const groupOrder = getZIndexTokenGroup(a.name).localeCompare(getZIndexTokenGroup(b.name))
      if (groupOrder !== 0) return groupOrder
      return parseZIndexValue(a.value) - parseZIndexValue(b.value)
    })
  }

  if (subTab === 'border') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, borderTokenOrder) - manualTokenSortIndex(b.name, borderTokenOrder),
    )
  }

  if (subTab === 'box-shadow') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, boxShadowTokenOrder) - manualTokenSortIndex(b.name, boxShadowTokenOrder),
    )
  }

  if (subTab === 'cursor') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, cursorTokenOrder) - manualTokenSortIndex(b.name, cursorTokenOrder),
    )
  }

  if (subTab === 'opacity') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, opacityTokenOrder) - manualTokenSortIndex(b.name, opacityTokenOrder),
    )
  }

  if (subTab === 'outline') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, outlineTokenOrder) - manualTokenSortIndex(b.name, outlineTokenOrder),
    )
  }

  if (subTab === 'transition') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, transitionTokenOrder) - manualTokenSortIndex(b.name, transitionTokenOrder),
    )
  }

  if (subTab === 'animation') {
    return sortTokensWithDeprecatedLast(filtered, (a, b) =>
      manualTokenSortIndex(a.name, animationTokenOrder) - manualTokenSortIndex(b.name, animationTokenOrder),
    )
  }

  return sortTokensWithDeprecatedLast(filtered)
}
