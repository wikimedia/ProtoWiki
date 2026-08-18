---
name: protowiki-app-prototyping
description: How to prototype the Wikipedia mobile apps in ProtoWiki — declare `platform: 'app'`, wrap in AppChromeWrapper instead of ChromeWrapper, read articles with `<ArticleLive app>`, and branch iOS vs Android off the app OS preference (`?os=`, `config.appPlatform`, `data-app-platform`, `useIsIos()`). Covers which `template-app-*` starter to copy and how app prototypes differ from web ones (no Vector/Minerva skin, phone frame, bottom nav). Use when building or changing an app-style prototype, embedding an app screen, or asking "how do app prototypes work here?".
license: MIT
---

# App prototyping

ProtoWiki prototypes either a **web** experience (Wikipedia in a browser —
Vector 2022 or Minerva) or an **app** experience (the iOS / Android Wikipedia
apps). Same repo, same routing, same Codex; different chrome and a different
platform axis.

This skill is the app side end to end. The mechanics of adding _any_ prototype
live in [`protowiki-create-prototype`](../protowiki-create-prototype/SKILL.md);
component APIs live in
[`protowiki-components` → `app-chrome.md`](../protowiki-components/references/app-chrome.md).

## The 30-second version

```vue
<script setup lang="ts">
definePage({
  meta: {
    // title + description: ask the author, or omit
    category: 'prototype',
    platform: 'app',
  },
})

import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
</script>

<template>
  <AppChromeWrapper>
    <p>App body content.</p>
  </AppChromeWrapper>
</template>
```

Two things make it an app prototype:

1. **`platform: 'app'`** in `definePage` meta — the gallery groups and chips it
   as App.
2. **`AppChromeWrapper`** instead of `ChromeWrapper` — phone frame, app top bar,
   bottom icon nav.

Everything else (file-based routing, gallery copy rules, Codex discipline,
deploy) is identical to a web prototype.

## Start from a template

Copy the closest `src/prototypes/template-app-*/` folder rather than starting
blank — they're the reference implementations for the patterns below.

| Template                | What it shows                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `template-app-chrome`   | Blank-ish shell. Radio pickers for every header variant (explore / search / activity / saved / article) and bottom bar preset — the fastest way to see what the chrome can do |
| `template-app-article`  | Article reading screen: live REST content via `<ArticleLive app>` — random article, or `?article=` / `?lang=`; back + search header, platform article toolbar |
| `template-app-search`   | Live multilingual search: `AppChromeHeader` with a search field, language tabs, recent searches, navigation into the article screen |
| `template-app-saved`    | Saved articles with collection tabs, loading / progress states, and an iOS-vs-Android difference in how filtering is surfaced |

## Web vs app at a glance

|                   | Web prototype                             | App prototype                                            |
| ----------------- | ----------------------------------------- | -------------------------------------------------------- |
| Gallery meta      | `platform: 'web'` (default)               | `platform: 'app'`                                        |
| Wrapper           | `ChromeWrapper`                           | `AppChromeWrapper`                                        |
| Chrome            | Vector 2022 / Minerva header + footer     | App top bar + bottom icon nav                            |
| Platform axis     | `skin`: `desktop` / `mobile` (`data-skin`) | OS: `ios` / `android` (`data-app-platform`)              |
| Article surface   | `<ArticleLive>`                            | `<ArticleLive app>`                                       |
| Width             | Full viewport                             | Phone column via `MobileWrapper` (inside the wrapper)     |
| Theme             | `theme` prop / `data-theme`                | Same — theming is shared, see [`protowiki-theme`](../protowiki-theme/SKILL.md) |

**App chrome has no skin.** `AppChromeWrapper` never sets `data-skin` and
doesn't participate in the Vector/Minerva switch — don't reach for
`protowiki-skins` concepts inside an app prototype, and don't pass `skin` to
components there. Mobile _web_ (Minerva in a narrow viewport) is a different
thing from the native apps; see [`protowiki-skins`](../protowiki-skins/SKILL.md)
if that's actually what you want.

## iOS vs Android

One preference drives the whole app, resolved at boot and written to
`<html data-app-platform="ios|android">`:

1. **`?os=auto|ios|android`** on the URL — masks the stored preference for that
   page load without saving it (handy for sharing a link or a PR preview).
2. **Stored preference** — `config.appPlatform` (`'auto' | 'ios' | 'android'`),
   set under **App OS** in the gallery's Appearance settings, persisted in
   `localStorage`.
3. **Device detection** when the effective preference is `auto` — user-agent
   sniffing, falling back to **Android** on desktop browsers.

Read it, never write it:

```ts
import { useAppPlatform, useIsAndroid, useIsIos } from '@/composables/useAppPlatform'

const platform = useAppPlatform() // Ref<'ios' | 'android'>, read-only
const isIos = useIsIos()
const isAndroid = useIsAndroid()
```

- **Structural differences** (different nav items, a different control, a
  different order) — branch in script with `useIsIos()`.
- **Visual-only differences** — prefer CSS on `[data-app-platform="ios"]` /
  `[data-app-platform="android"]` over template branching.

The bottom nav presets in `src/components/app/appBottomNavItems.ts` are the
canonical example — pick the array, don't rebuild the bar:

```ts
const bottomNavItems = computed(() =>
  isIos.value ? IOS_ARTICLE_BOTTOM_NAV_ITEMS : ANDROID_ARTICLE_BOTTOM_NAV_ITEMS,
)
```

Presets: `{ANDROID,IOS}_MAIN_BOTTOM_NAV_ITEMS` for main screens,
`{ANDROID,IOS}_ARTICLE_BOTTOM_NAV_ITEMS` for the article toolbar. Full item
list and metadata in
[`app-chrome.md`](../protowiki-components/references/app-chrome.md#appbottommenu).

## Articles in an app

Use the same article surface as the web, with **`app`**:

```vue
<AppChromeWrapper :left="headerLeft" :right="headerRight" :bottom-nav-items="bottomNavItems">
  <ArticleLive app :article="article" :lang="lang" />
</AppChromeWrapper>
```

**`app`** gives you the apps' lead block (lead image, title, short description,
closing rule), collapsed **References** / **External links** end matter, static
body headings, **Quick facts** / **More information** table widgets, hidden
navboxes — and it pins the skin to `mobile`, so you never pass `skin`.

Omit `article` and you get a random article on each load — `source`, `langs` and
`vitalLevel` tune the draw exactly as they do on the web, and the lead block
fills in once the title resolves. `template-app-article/` reads `?article=` when
it is there and goes random otherwise.

`ArticleSnapshot` and `ArticleCustom` take the same `app` prop (plus
`description` / `leadImageUrl`, which `ArticleLive` fetches for itself) when a
committed fixture or hand-authored markup suits the prototype better.

Article content stays in **one document** — REST `page/html`, never
`page/mobile-html` / PCS — so `<Teleport>` and Codex components can reach into
the article via the `parserReady` event. The reasoning, prop tables, and
behaviour matrix live in
[`article.md`](../protowiki-components/references/article.md#in-app-articles-app).

## Common shapes

| Goal                                    | Composition                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| App shell with header + bottom nav      | `<AppChromeWrapper>…</AppChromeWrapper>` — starter: `template-app-chrome/`                     |
| In-app article reader                   | `<AppChromeWrapper><ArticleLive app article="…"/></AppChromeWrapper>` (omit `article` for a random one) — starter: `template-app-article/` |
| Screen with header but no bottom bar    | `<AppChromeWrapper :show-bottom-menu="false">` (keyboard-heavy screens like search)            |
| Fully custom app shell                  | `MobileWrapper` + `AppChromeHeader` / `AppBottomMenu` directly — see `template-app-search/`     |
| Screen title instead of a logo          | `:left="[{ type: 'title', text: 'Saved' }]"`                                                   |

## Gotchas

- **Don't pad the body yourself.** `AppChromeWrapper` already applies the 24px
  screen inset to header, main, and bottom nav. An article with `app` deliberately
  drops its own inline padding and bleeds its lead image back out through that
  gutter.
- **`middle` needs both flanks.** `AppChromeHeader` ignores `middle` unless
  `left` and `right` are both present (with a dev warning). Flanks cap at 4 items.
- **Bottom nav icons are actions, not tabs.** Nothing renders as selected; handle
  `@navigate` yourself.
- **App OS is not a theme and not a skin.** It's its own axis; light/dark still
  comes from `theme` / `data-theme`.

## Sharing an app prototype

Normal ProtoWiki deploy — plus `?os=` when the reviewer should see a specific
platform:

```text
https://<user>.github.io/protowiki/template-app-article?os=ios
https://<user>.github.io/protowiki/template-app-article?os=android
```

See [`protowiki-deploy`](../protowiki-deploy/SKILL.md).
