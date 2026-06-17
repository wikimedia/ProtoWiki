export type TokenKind =
  | 'color-text'
  | 'color-bg'
  | 'color-border'
  | 'spacing'
  | 'radius'
  | 'font-size'
  | 'font-weight'
  | 'font-family'
  | 'line-height'
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
}

export interface TokenFamilyGroup {
  family: TokenFamily
  categories: { category: string; tokens: TokenEntry[] }[]
}

export function inferTokenKind(name: string): TokenKind {
  if (name.startsWith('--background-color-')) return 'color-bg'
  if (name.startsWith('--border-color-')) return 'color-border'
  if (name.startsWith('--color-')) return 'color-text'
  if (name.startsWith('--spacing-')) return 'spacing'
  if (name.startsWith('--border-radius-')) return 'radius'
  if (name.startsWith('--font-size-')) return 'font-size'
  if (name.startsWith('--font-weight-')) return 'font-weight'
  if (name.startsWith('--font-family-')) return 'font-family'
  if (name.startsWith('--line-height-')) return 'line-height'
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
  if (name.startsWith('--font-') || name.startsWith('--line-height-') || name.startsWith('--letter-spacing-')) {
    return 'Typography'
  }
  if (name.startsWith('--border-radius-') || name.startsWith('--border-width-') || name.startsWith('--border-style-')) {
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
  if (name.startsWith('--border-radius-') || name.startsWith('--border-width-') || name.startsWith('--border-style-')) {
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
  if (name.startsWith('--transform-')) return 'Transform'
  if (name.startsWith('--accent-color-')) return 'Accent'
  if (name.startsWith('--position-')) return 'Position'
  if (name.startsWith('--tab-size-')) return 'Tab size'
  return 'Other'
}

export function parseTokensFromCss(css: string): TokenEntry[] {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) return []

  const seen = new Set<string>()
  const tokens: TokenEntry[] = []
  const re = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm
  let match: RegExpExecArray | null

  while ((match = re.exec(rootMatch[1])) !== null) {
    const name = match[1]
    if (seen.has(name)) continue
    seen.add(name)
    tokens.push({
      name,
      value: match[2].trim(),
      category: inferTokenCategory(name),
      kind: inferTokenKind(name),
      family: inferTokenFamily(name),
    })
  }

  return tokens.sort((a, b) => a.name.localeCompare(b.name))
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
    .map((category) => ({ category, tokens: map.get(category)! }))
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
