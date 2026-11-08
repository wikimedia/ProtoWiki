/**
 * What each Wikitab feature can show on each supported Wikipedia.
 *
 * First pass at multi-language support: hard-coded, not detected at runtime.
 * Anything not listed for the current `WIKITAB_LANGUAGE` is hidden — the module
 * disappears from the home page and Modules list, or the source/spotlight is
 * skipped — instead of rendering empty, English-only or mis-parsed cards.
 *
 * Probed against the live APIs on 2026-11-08 for every `WIKITAB_LANGUAGE_OPTIONS`
 * entry. Re-probe before widening a list:
 *
 * - `feed/featured` (Wikifeeds) keys per wiki: `mostread` and `image` everywhere;
 *   `tfa`, `news` and `dyk` only where the wiki's Main Page markup is parsed.
 * - `feed/onthisday/births` returns 404 or an empty list on some wikis.
 * - `list=recentchanges&rcshow=oresreview` warns "Unrecognized value" (and
 *   silently returns *unfiltered* edits) where ORES damaging isn't deployed.
 */
import type { WikitabModuleId } from '../sections'
import { WIKITAB_LANGUAGE } from './wikitabLanguage'

export type WikitabLanguageFeature =
  /** Featured: Today's featured article (`feed/featured` `tfa`). */
  | 'featured-tfa'
  /** Featured: English-only spotlights (TFL, TFP, Word / Quote of the day). */
  | 'featured-english-spotlights'
  /** In the news (`feed/featured` `news`). */
  | 'news'
  /** Did you know (`feed/featured` `dyk`). */
  | 'dyk'
  /** On this day — parsed from the enwiki Main Page `#mp-otd`. */
  | 'otd'
  /** Birthdays (`feed/onthisday/births`). */
  | 'births'
  /** Active discussions: enwiki Village pump / Help desk noticeboards. */
  | 'discussions-noticeboards'
  /** Recent edits: Recent changes filtered by `rcshow=oresreview`. */
  | 'review-changes-risky'
  /** About footers linking to enwiki project pages (`Wikipedia:Did you know`, …). */
  | 'module-about-pages'

/**
 * Languages that support each feature. Features not listed here (Trending,
 * Picture of the day, Daily reads, Nearby, Help wanted, saved-article talk
 * and edits) work on every supported wiki.
 */
const FEATURE_LANGUAGES: Record<WikitabLanguageFeature, readonly string[]> = {
  'featured-tfa': ['de', 'en', 'he', 'ja', 'sv', 'vi', 'zh'],
  'featured-english-spotlights': ['en'],
  // Left out though present in the feed: es (recent deaths, not news),
  // fr / ko (each story leads with a date link), pt (the whole archive),
  // vi (months-old stories).
  news: ['de', 'en', 'he', 'pl', 'ru', 'sv', 'uk'],
  dyk: ['ar', 'de', 'en', 'pt', 'ru', 'uk'],
  otd: ['en'],
  // it returns 200 with no births.
  births: ['ar', 'cs', 'de', 'en', 'es', 'fr', 'pt', 'ru', 'sv', 'tr', 'uk', 'zh'],
  'discussions-noticeboards': ['en'],
  'review-changes-risky': [
    'ar', 'ca', 'cs', 'en', 'es', 'fa', 'fr', 'he', 'it', 'ko', 'nl', 'pl', 'pt', 'ru', 'sv',
    'tr', 'uk', 'zh',
  ],
  'module-about-pages': ['en'],
}

/** Home modules that exist only through one language-limited feature. */
const MODULE_FEATURE: Partial<Record<WikitabModuleId, WikitabLanguageFeature>> = {
  news: 'news',
  dyk: 'dyk',
  otd: 'otd',
  births: 'births',
}

export function isWikitabFeatureAvailable(
  feature: WikitabLanguageFeature,
  lang: string = WIKITAB_LANGUAGE,
): boolean {
  return FEATURE_LANGUAGES[feature].includes(lang)
}

/** False when the current wiki has nothing for this module — hide it entirely. */
export function isWikitabModuleAvailable(
  id: WikitabModuleId,
  lang: string = WIKITAB_LANGUAGE,
): boolean {
  const feature = MODULE_FEATURE[id]
  return !feature || isWikitabFeatureAvailable(feature, lang)
}
