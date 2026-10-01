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

export interface LogoSize {
  width: number
  height: number
}

/**
 * Each wiki's own rendered logo sizes (px at a 16px root), from its
 * `mw-logo-wordmark` / `mw-logo-tagline` styles. English is the reference:
 * components size the English images by height, so a language only needs an
 * entry when its artwork has different proportions. arwiki: wordmark 7em ×
 * 2.4375em, tagline 6.5625em × 1.375em — taller than enwiki's 8.75em × 1.375em
 * and 8.75em × 0.6875em, so at the English height it renders tiny.
 */
const EN_WORDMARK_HEIGHT = 22

const LOGO_SIZES: Record<string, { wordmark: LogoSize; tagline: LogoSize }> = {
  ar: {
    wordmark: { width: 112, height: 39 },
    tagline: { width: 105, height: 22 },
  },
}

/**
 * Inline size for a wordmark / tagline image, or `undefined` to keep the
 * component's English sizing. `enWordmarkHeight` is the height the component
 * gives the English wordmark; the wiki's sizes are scaled by the same ratio.
 */
export function wikipediaLogoStyle(
  kind: 'wordmark' | 'tagline',
  enWordmarkHeight: number,
  lang = getUiLang(),
): { width: string; height: string } | undefined {
  const size = LOGO_SIZES[lang]?.[kind]
  if (!size) return undefined
  const scale = enWordmarkHeight / EN_WORDMARK_HEIGHT
  return {
    width: `${Math.round(size.width * scale)}px`,
    height: `${Math.round(size.height * scale)}px`,
  }
}
