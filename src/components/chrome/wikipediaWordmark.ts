import { getUiLang } from '@/i18n'

/**
 * Wikipedia wordmark and tagline images in the interface language. English
 * keeps the `-en-25` files enwiki serves; other languages use their own wiki's
 * files when one exists, and fall back to English otherwise (eswiki has a
 * tagline but no wordmark — "Wikipedia" is spelled the same).
 */
const COPYRIGHT_PATH = 'static/images/mobile/copyright'

const WORDMARK_EN = `https://en.wikipedia.org/${COPYRIGHT_PATH}/wikipedia-wordmark-en-25.svg`
const TAGLINE_EN = `https://en.wikipedia.org/${COPYRIGHT_PATH}/wikipedia-tagline-en-25.svg`

/** Languages whose wiki serves `wikipedia-<kind>-<lang>.svg` (checked with curl). */
const LOCALIZED_LANGS: Record<'wordmark' | 'tagline', Set<string>> = {
  wordmark: new Set(['fr', 'ar']),
  tagline: new Set(['fr', 'ar', 'es']),
}

function localizedFile(kind: 'wordmark' | 'tagline', lang: string): string | undefined {
  if (!LOCALIZED_LANGS[kind].has(lang)) return undefined
  return `https://${lang}.wikipedia.org/${COPYRIGHT_PATH}/wikipedia-${kind}-${lang}.svg`
}

/** "Wikipedia" wordmark image URL for the interface language. */
export function wikipediaWordmarkSrc(lang = getUiLang()): string {
  return localizedFile('wordmark', lang) ?? WORDMARK_EN
}

/** "The Free Encyclopedia" tagline image URL for the interface language. */
export function wikipediaTaglineSrc(lang = getUiLang()): string {
  return localizedFile('tagline', lang) ?? TAGLINE_EN
}
