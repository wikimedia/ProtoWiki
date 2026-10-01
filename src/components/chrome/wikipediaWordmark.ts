import { getUiLang } from '@/i18n'

/**
 * Wikipedia wordmark and tagline images in the interface language. English
 * keeps the `-en-25` files enwiki serves; other languages use their own wiki's
 * files when one exists (checked: fr, ar), and fall back to English otherwise.
 */
const COPYRIGHT_PATH = 'static/images/mobile/copyright'

const WORDMARK_EN = `https://en.wikipedia.org/${COPYRIGHT_PATH}/wikipedia-wordmark-en-25.svg`
const TAGLINE_EN = `https://en.wikipedia.org/${COPYRIGHT_PATH}/wikipedia-tagline-en-25.svg`

/** Languages whose wiki serves `wikipedia-wordmark-<lang>.svg` and `wikipedia-tagline-<lang>.svg`. */
const LOCALIZED_WORDMARK_LANGS = new Set(['fr', 'ar'])

function localizedFile(kind: 'wordmark' | 'tagline', lang: string): string | undefined {
  if (!LOCALIZED_WORDMARK_LANGS.has(lang)) return undefined
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
