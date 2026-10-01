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
4. **RTL languages** (ar, he, fa, ur) also need the RTL pass, not done yet: import
   `codex.style-bidi.css`, set `<html dir>` (see `router.afterEach` in
   `src/main.ts`, which already sets `lang`), bind `dir` on MobileWrapper's
   teleport target, replace one-sided physical CSS with logical properties, fix the
   forced-left back arrows (`cdxIconArrowNext dir="rtl"`).

## Not translated (by design)

Gallery `definePage` meta (authors write it), usernames, article titles and other
API data, strings inside Codex components (Codex ships its own i18n), console
messages.
