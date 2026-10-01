---
name: protowiki-i18n
description: Translating ProtoWiki interface text — the `t()` message system in src/i18n, Banana-format catalogs per language, `?uselang=` / `?lang=`, PLURAL, inline markup with messageParts, and adding a new language (e.g. Arabic). Use when adding UI strings, translating a prototype, or switching a prototype's language.
---

# Interface translation (`src/i18n`)

ProtoWiki has a small, MediaWiki-style message system. Wikita-lite (`/wikita-lite`)
and the shared chrome it renders are fully translated; other prototypes can opt in
string by string. English output is the source and never changes.

## Two languages, two params

| Param       | Controls                                                              | Read with                          |
| ----------- | --------------------------------------------------------------------- | ---------------------------------- |
| `?lang=fr`  | **Content wiki** — every API call goes to fr.wikipedia.org            | `getContentLang()` (`@/lib/contentLang`) |
| `?uselang=` | **Interface language** — overrides; defaults to `?lang=`, then `en`   | `getUiLang()` (`@/i18n`)           |

So `?lang=fr` = French wiki + French UI; `?lang=fr&uselang=en` = French wiki,
English UI (handy for reviewing); `?uselang=fr` alone = English wiki, French UI.
Both are fixed per page load — switching language means a new URL (reload).
Wikita-lite keeps both params in its URL state across navigation.

## Catalogs

```
src/i18n/locales/
  en/<namespace>.json    English source (fallback for anything missing)
  fr/<namespace>.json    French
  es/<namespace>.json    Spanish
  ar/<namespace>.json    Arabic (right-to-left)
  qqq/<namespace>.json   Documentation for translators (never displayed)
```

Banana format (same as MediaWiki extensions / translatewiki.net): flat camelCase
keys, optional `"@metadata"`, tab-indented UTF-8. A key in code is
`<namespace>.<key>` — `t('onboarding.welcomeNamed', name)` reads `welcomeNamed`
from `locales/<lang>/onboarding.json`. All `*.json` files are picked up
automatically (`import.meta.glob`); no registration.

## API

```ts
import { t, messageParts, messageGroup, getUiLang } from '@/i18n'

t('home.savedTitle')                         // plain
t('onboarding.welcomeNamed', username)       // $1, $2 … params
t('impact.editCount', n)                     // "{{PLURAL:$1|$1 edit|$1 edits}}"
```

- **PLURAL** — `{{PLURAL:$1|one|other}}`; forms follow the language's CLDR
  categories in order `zero|one|two|few|many|other` (Arabic uses all six; French
  and Spanish one|other). Explicit `0=…` forms win. Never branch on counts in code.
- **Inline markup** — never put HTML in messages. Use `messageParts(key)`, which
  splits around `$n` slots so the template renders the `<b>` / link itself (see
  the doc comment in `src/i18n/index.ts` and `HCaptchaDisclaimer.vue`).
- **Module-level constants** — never call `t()` at module top level (the language
  comes from the URL). Use getters, `messageGroup(namespace, keys)`, or factories
  (`label: () => t('common.back')` in `withDefaults`).
- **Concatenation** — one message with params, not pieces glued together; word
  order differs by language.
- **Numbers / dates** — `src/lib/contentFormat.ts` (`formatElapsed`,
  `formatCompactNumber`, `formatShortDate`, `usesLocalizedFormat()`) uses `Intl`
  in the interface language; English keeps the existing compact strings.
- **Bidi** — in RTL interfaces `t()` wraps text params in FSI…PDI (MediaWiki's
  `bidi()`), so a Latin username doesn't scramble Arabic punctuation. Wrap
  rendered usernames in `<bdi>`; put `dir="auto"` on inputs people type into.
- **Digits** — `intlLocale()` pins Arabic to Western digits (`ar-u-nu-latn`),
  matching arwiki and the digits `$n` params insert.
- Missing keys render the key itself and warn once in dev.

## Checking coverage

```bash
npm run i18n:check          # every language: % translated, stale keys
npm run i18n:check -- fr    # one language, with the full missing list
```

It also flags `t('…')` keys used in code but absent from `en`, and `en` messages
with parameters but no `qqq` doc.

## Adding a language (e.g. Arabic)

1. Copy `locales/en/` to `locales/<lang>/` and translate (keep every `$n` and
   `{{PLURAL}}`; read `qqq` for context). Partial is fine — missing keys fall back
   to English. Run `npm run i18n:check -- <lang>`.
2. Content wiki: add a `wikiCapabilities` entry in
   `src/prototypes/musical-group/data/wikiCapabilities.ts` (featured / DYK source,
   noticeboards, help + username-policy pages, MinT fallback) and local namespace
   prefixes in `musical-group/data/enwikiTitle.ts`.
3. Wordmark/tagline images: `src/components/chrome/wikipediaWordmark.ts` (check the
   files exist on that wiki first).
4. **RTL languages** (ar, he, fa, ur…) — `directionForLang()` in `src/i18n/rtl.ts`
   already knows them. Direction is wired once for the whole app:
   - `applyDocumentDirection()` (`src/i18n/direction.ts`) sets `<html lang dir>`
     before mount (CdxIcon reads the direction once) and on every navigation, so
     teleported dialogs and menus inherit it.
   - Both Codex builds (`codex.style.css` + `codex.style-rtl.css`) and both wiki
     skin snapshots (`*.css` + `*.rtl.css`, the latter from arwiki via
     `npm run snapshot:wiki-skins -- --rtl`) are bundled. `scripts/postcss-direction-scope.mjs`
     (in `vite.config.ts`) scopes each to its `<html dir>` with `:where()`, so
     LTR pages keep exactly their old cascade. Don't use `codex.style-bidi.css`:
     its `[dir]` prefixes raise specificity and defeat local overrides.
   - Write **logical CSS** (`inset-inline-start`, `margin-inline-end`,
     `border-inline-start`, `text-align: start`); one-sided physical properties
     break in RTL. Direction-specific tweaks go under `:dir(rtl)`.
   - Use `cdxIconArrowPrevious` for back, never `cdxIconArrowNext dir="rtl"`.
   - Charts and sparklines don't mirror (Codex bidirectionality guidance): force
     `direction: ltr` on the chart block.
   - Article HTML: `useArticleHtml` returns Parsoid's `lang` / `dir`; pass them to
     `ArticleRenderer`, which adds `mw-content-rtl` for the skin's rules.

## Not translated (by design)

Gallery `definePage` meta (authors write it), usernames, article titles and other
API data, strings inside Codex components (Codex ships its own i18n), console
messages.
