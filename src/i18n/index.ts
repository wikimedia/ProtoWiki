import { DEFAULT_CONTENT_LANG, getContentLang, parseContentLang } from '@/lib/contentLang'

import { directionForLang } from './rtl'

/**
 * Interface messages, MediaWiki-style. Catalogs live in
 * `src/i18n/locales/<lang>/<namespace>.json` (Banana format: flat keys, an
 * optional `@metadata` entry; camelCase keys), and a key is `<namespace>.<key>`:
 * `t('onboarding.welcomeNamed', name)` reads `welcomeNamed` from
 * `locales/<lang>/onboarding.json`.
 *
 * - `en` is the source and the fallback for any key a language lacks.
 * - `qqq` documents each message for translators; it is never displayed.
 * - Adding a language = adding `locales/<lang>/*.json`. Run `npm run i18n:check`
 *   to list what's missing.
 *
 * The interface language is `?uselang=` when set, else the content language
 * (`?lang=`), else English. It's fixed for a page load; switching reloads.
 */

export type MessageParam = string | number

type Catalog = Record<string, string>

const DOC_LANG = 'qqq'

const catalogs: Record<string, Catalog> = {}

const files = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
})

for (const [path, messages] of Object.entries(files)) {
  const match = path.match(/\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const [, lang, namespace] = match
  if (lang === DOC_LANG) continue
  const catalog = (catalogs[lang] ??= {})
  for (const [key, value] of Object.entries(messages)) {
    if (key.startsWith('@') || typeof value !== 'string') continue
    catalog[`${namespace}.${key}`] = value
  }
}

/** Languages with at least one catalog file. */
export const AVAILABLE_UI_LANGS = Object.keys(catalogs).sort()

export function getUiLang(): string {
  if (typeof window === 'undefined') return DEFAULT_CONTENT_LANG
  const uselang = new URLSearchParams(window.location.search).get('uselang')
  return uselang ? parseContentLang(uselang) : getContentLang()
}

const warned = new Set<string>()

function lookup(key: string, lang: string): string | undefined {
  return catalogs[lang]?.[key] ?? catalogs[DEFAULT_CONTENT_LANG]?.[key]
}

const PLURAL_ORDER: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other']
const pluralRules = new Map<string, Intl.PluralRules>()

/**
 * `{{PLURAL:$1|one|other}}` — forms follow the language's CLDR categories in
 * order (zero, one, two, few, many, other; French: one|other, Arabic: all six).
 * Explicit `N=text` forms win, as in MediaWiki. Missing forms reuse the last.
 */
function resolvePlurals(message: string, lang: string, params: MessageParam[]): string {
  return message.replace(/\{\{PLURAL:\$(\d+)\|([^}]*)\}\}/gi, (_match, index, body: string) => {
    const count = Number(params[Number(index) - 1])
    const forms = body.split('|')
    const explicit = forms.find((form) => /^\d+=/.test(form) && Number(form.split('=')[0]) === count)
    if (explicit) return explicit.slice(explicit.indexOf('=') + 1)

    const plain = forms.filter((form) => !/^\d+=/.test(form))
    if (!plain.length) return ''
    let rules = pluralRules.get(lang)
    if (!rules) {
      rules = new Intl.PluralRules(intlLocale(lang))
      pluralRules.set(lang, rules)
    }
    const categories = PLURAL_ORDER.filter((category) =>
      rules.resolvedOptions().pluralCategories.includes(category),
    )
    const position = categories.indexOf(rules.select(Number.isFinite(count) ? count : 0))
    return plain[Math.min(Math.max(position, 0), plain.length - 1)]
  })
}

/**
 * `Intl` locale for a UI language. Arabic Wikipedia writes Western digits
 * ("29 سبتمبر 2026"), so pin them; `$n` params are inserted as Western digits too.
 */
export function intlLocale(lang = getUiLang()): string {
  return lang === 'ar' ? 'ar-u-nu-latn' : lang
}

/**
 * In RTL interfaces, isolate text params (usernames, titles) with FSI…PDI so
 * Latin text doesn't reorder surrounding punctuation — MediaWiki's `bidi()`.
 */
function isolate(value: MessageParam, rtl: boolean): string {
  const text = String(value)
  if (!rtl || typeof value === 'number' || /^[\d\s.,%+-]*$/.test(text)) return text
  return `\u2068${text}\u2069`
}

/** Interface message for `key` (`namespace.key`), with `$1`, `$2`… replaced by `params`. */
export function t(key: string, ...params: MessageParam[]): string {
  const lang = getUiLang()
  const message = lookup(key, lang)
  if (message === undefined) {
    if (import.meta.env.DEV && !warned.has(key)) {
      warned.add(key)
      console.warn(`[i18n] Missing message "${key}"`)
    }
    return key
  }
  const rtl = directionForLang(lang) === 'rtl'
  return resolvePlurals(message, lang, params).replace(/\$(\d+)/g, (match, index) => {
    const value = params[Number(index) - 1]
    return value === undefined ? match : isolate(value, rtl)
  })
}

/**
 * A message split around its `$n` placeholders, for sentences with inline
 * markup: `"Start with a few $1, then…"` → `['Start with a few ', 1, ', then…']`.
 * Strings are literal text; numbers are 1-based param slots the template
 * renders itself (a `<b>`, a link). Other params are substituted as in `t()`.
 *
 *   <template v-for="part in messageParts('impact.startWith')" :key="String(part)">
 *     <b v-if="part === 1">{{ t('impact.suggestedEdits') }}</b>
 *     <template v-else>{{ part }}</template>
 *   </template>
 */
export function messageParts(key: string, ...params: MessageParam[]): (string | number)[] {
  const resolved = t(key, ...params)
  const parts: (string | number)[] = []
  let last = 0
  for (const match of resolved.matchAll(/\$(\d+)/g)) {
    if (match.index! > last) parts.push(resolved.slice(last, match.index))
    parts.push(Number(match[1]))
    last = match.index! + match[0].length
  }
  if (last < resolved.length) parts.push(resolved.slice(last))
  return parts
}

/** True when `key` exists in the source catalog (for optional messages). */
export function hasMessage(key: string): boolean {
  return lookup(key, getUiLang()) !== undefined
}

/**
 * Object of getters, one per key — for constants imported at module load that
 * must still render in the session's language: `messageGroup('modules', ['featured'])`.
 */
export function messageGroup<K extends string>(
  namespace: string,
  keys: readonly K[],
): { readonly [P in K]: string } {
  const group = {} as { [P in K]: string }
  for (const key of keys) {
    Object.defineProperty(group, key, {
      enumerable: true,
      get: () => t(`${namespace}.${key}`),
    })
  }
  return group
}

/**
 * Codex's own strings ("(optional)", close buttons, chip announcements),
 * provided as `CdxI18nFunction` in main.ts. `cdx-label-optional-flag` reads
 * `codex.labelOptionalFlag`. English returns `undefined` so Codex keeps its
 * built-in defaults; so does any key without a translation.
 */
export function codexI18n(key: string, ...params: MessageParam[]): string | undefined {
  if (getUiLang() === DEFAULT_CONTENT_LANG || !key.startsWith('cdx-')) return undefined
  const name = key.slice(4).replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase())
  const messageKey = `codex.${name}`
  return catalogs[getUiLang()]?.[messageKey] !== undefined ? t(messageKey, ...params) : undefined
}
