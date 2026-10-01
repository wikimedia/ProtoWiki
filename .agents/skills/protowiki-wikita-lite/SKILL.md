---
name: protowiki-wikita-lite
description: Wikita-lite prototype — mobile dashboard UX conventions, shared musical-group data layer, module layout, loading and empty-state rules. Use when editing src/prototypes/wikita-lite/ or wikita-lite.* routes.
license: MIT
---

# Wikita-lite

Mobile newcomer dashboard prototype at `/wikita-lite`. Shares data
fetching, bookmarks, and feed logic with `musical-group` via
`useMusicalGroupHome`.

## Where things live

| Path                                                          | Role                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `src/prototypes/wikita-lite/index.vue`                        | Route entry; provides save feedback                  |
| `src/prototypes/wikita-lite/WikitaLiteHome.vue`               | Tabbed home (Home / Explore / Contribute)            |
| `src/prototypes/wikita-lite/modules/`                         | Feed modules (`FeaturedModule`, `TrendingModule`, …) |
| `src/prototypes/wikita-lite/composables/useWikitaLiteHome.ts` | Thin wrapper over `useMusicalGroupHome`              |
| `src/prototypes/wikita-lite/routes.ts`                        | Paths, tab labels, module titles                     |
| `src/prototypes/wikita-lite/components/WikitaLiteChromeHeader.vue` | Logged-in chrome (Home + shell + article page): desktop Home button, Reading lists, user menu; mobile `MinervaUserMenu`, working search, `floatingHome` (article page only); registers the article opener |
| `src/prototypes/wikita-lite.wiki.[title]/index.vue` | Logged-in article page (`/wikita-lite/wiki/Earth`) that search opens once onboarded |
| `src/prototypes/wikita-lite.*/index.vue`                      | Standalone subpages (one module each)                |

| `src/prototypes/wikita-lite.configure.suggestions/index.vue` | Legacy fullscreen suggestion toggles (not linked from Home) |
| `src/prototypes/wikita-lite.help-wanted.configure/index.vue` | Suggested edits module configure |
| `src/prototypes/wikita-lite.configure.suggestions.interests/index.vue` | Legacy global interest picker |
| `src/prototypes/wikita-lite.configure/index.vue` | Fullscreen layout configure (`/wikita-lite/configure`) |
| `src/prototypes/wikita-lite.personalization/index.vue` | Global Personalization dialog (`/wikita-lite/personalization`) |
| `src/prototypes/wikita-lite/components/WikitaLiteFullscreenDialogShell.vue` | Full-height in-frame dialog shell (onboarding-style) |
| `src/prototypes/wikita-lite/components/WikitaLitePersonalizationPanel.vue` | Personalization toggles + inline interests editor |
| `src/prototypes/wikita-lite/data/personalizedModuleIds.ts` | Module IDs that show **Configure** in overflow menus |
| `src/prototypes/wikita-lite/composables/useWikitaLiteSuggestionPreferences.ts` | Shared prefs + interests version signals |
| `src/prototypes/wikita-lite/composables/useWikitaLiteModuleSuggestionPreferences.ts` | Per-module suggestion overrides |

Subpages use `WikitaLiteShell` + `MobileSubpageHeader` + a module with
`standalone`. Configure flows use `WikitaLiteFullscreenShell` (no chrome).

## Skin and width

Nothing here pins the mobile skin any more. Every shell wraps content in
`MobileWrapper fluid` — viewport width, no phone frame — and the chrome inherits
the **global** skin, so `/wikita-lite` is Minerva below 640px and Vector at or
above it (`?skin=mobile` / `?skin=desktop` still pin it). The layout itself is
still phone-first: the desktop breakpoints are the work in progress, not a
finished design.

| `src/prototypes/wikita-lite/WikitaLiteOnboarding.vue` | First-run flow orchestrator |
| `src/prototypes/wikita-lite/onboarding/` | Onboarding screens, shell, data (ported from protowiki3 `no-distractions`) |

## URL-driven state

**All wikita-lite prototype state lives in flat URL query params** (sparse
encoding — defaults are omitted). API feed caches (`musical-group-home-cache`,
`protowiki-impact-cache-v1`, thumbnail/summary caches) stay in `localStorage`.

Central hub: `data/urlStateSchema.ts` (parse / serialize / merge) +
`composables/useWikitaLiteUrlState.ts` (hydrates in-memory `useConfig` while on
wikita-lite routes; does **not** write back to `protowiki-prototype-user-config`).

**Every navigation must preserve query params.** Use
`useWikitaLiteRoute().wikitaLiteRoute(path)` for `RouterLink :to` and
`router.push` — never bare path strings.

| Group                 | Params                                                                                 | Notes                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Navigation            | `view`, `mode`                                                                         | `view`: `read`, `contribute` (Home = omit). `mode`: `both` (omit), `read`, `edit`     |
| Home layout           | `homeOff`, `homeOn`, `homeOrder`                                                       | Toggle/reorder overrides layered on dashboard mode defaults; see `data/homeLayout.ts` |
| Onboarding            | `onboarded`, `screen`, `title`, `username`, `email`, `survey`, `interests`, `returnTo` | Article: `?screen=article&title=`; account keeps `?title=`                            |
| User / chrome         | `user`, `realUser`, `theme`, `skin`, `platform`, `langs`, `displayName`                | Mirrors `useConfig` fields                                                            |
| Content language      | `lang`                                                                                 | Content wiki (`fr` → fr.wikipedia.org); omit for English. See below                   |
| Page lists            | `saved`, `savedTs`, `edited`, `watchlist`                                              | Repeated titles; `savedTs` = epoch ms per saved entry (index-aligned with `saved`)    |
| Interests             | `interests`                                                                            | Repeated params, max 10                                                               |
| Suggestion prefs      | `prefSaved`, `prefHistory`, `prefInterests`, `prefWatchlist`                           | `1` / `0` (omit when default `1`)                                                     |
| Help-wanted overrides | `hwDefault`, `hwPrefSaved`, `hwPrefHistory`, `hwPrefInterests`, `hwInterests`          | Suggested edits module only                                                           |
| Dismissals            | `dismiss_<moduleId>`                                                                   | Restore-at epoch ms                                                                   |
| Pins                  | `pinsHome`, `pinsExplore`, `pinsContribute`                                            | Comma-separated module IDs                                                            |
| Dev chrome            | `cardRadius`, `hideBorders`, `hideTabBar`, `moduleMenus`, `bannerDismissed`, `screen`  | `screen=splash` = prototype splash overlay                                            |
| Mentor                | `mentorAssigned`, `mentorBannerDismissed`                                              | `1` / `0` (omit when mode default); banner dismiss `1`                                |
| Lists sheet           | `list`                                                                                 | Repeated `name\|QID1\|QID2` entries                                                   |

Dev menu **Reset URL state** clears params and reloads `/wikita-lite`.

### Content language (`?lang=`)

`?lang=fr` points the whole data layer (wikita-lite + the shared
`musical-group/data`) at that language's Wikipedia. `getContentLang()` /
`contentWikiHost()` in `src/lib/contentLang.ts` read the param on every call;
`enwikiTitle.ts` helpers (`wikiActionUrl`, `enwikiArticleUrl`, …) follow it.
English (no param) behaves exactly as before.

- **Per-wiki data** — `musical-group/data/wikiCapabilities.ts`: the main-page
  subpages for Featured / Did you know (the REST feed has no `tfa` / `dyk` on
  most wikis), Active discussions noticeboards, policy/help pages, and whether
  to fall back to MinT.
- **MinT fallback** — `src/lib/mint.ts` machine-translates English Wikipedia's
  featured content only when no native source works, and the UI labels it
  ("Machine translated from English Wikipedia"). Plain `fetch` only: MinT's
  CORS preflight rejects `Api-User-Agent`.
- **UI strings** — every interface string goes through `t()` from `@/i18n`
  (catalogs in `src/i18n/locales/<lang>/`); `?uselang=` overrides the interface
  language. See the [`protowiki-i18n`](../protowiki-i18n/SKILL.md) skill.
- **Caches** — `readVersionedStore` / `writeVersionedStore` and the page /
  LiftWing caches use `langScopedStorageKey()`, so languages never share
  entries.
- **Adding a language** — see `protowiki-i18n` (catalogs + `wikiCapabilities`
  entry + namespace prefixes). Supported today: en, fr, es, ar (right-to-left —
  see `protowiki-i18n` for the direction rules).

## API identity

While on any `/wikita-lite` route, `useWikitaLiteUrlState` syncs the onboarding
username (`displayName` after completion, `username` during account creation)
into `formatWikimediaApiUserAgent()` via `setPrototypeUserAgentUsername()`.
Wikimedia API requests then append
`growth-home-prototype-user/<Username>` to `Api-User-Agent` (and microtask
`User-Agent` headers). Leaving wikita-lite clears the suffix.

## Prototype splash

First visit defaults to **`?screen=splash`**. Fullscreen
**`WikitaLiteFullscreenDialogShell`** over Home or onboarding entry. Dismissal
navigates to `screen=article` (onboarding) or clears `screen` (onboarded Home).
Re-open anytime with `?screen=splash`.

### Leave-prototype dialog

Every outbound click to **production English Wikipedia** (`en.wikipedia.org`)
shows a **bottom sheet** (`CdxPopover` + `use-bottom-sheet`, same pattern as
`SavePagesSheet`) before navigation. Copy: “Leaving prototype” / “You are
leaving the prototype. Any changes you make beyond this point will affect real
wikis, and the experience you land in may not be fully integrated with the
features here.” **Continue** opens the pending URL (preserves `target="_blank"` when
set); **Stay in the prototype** (or backdrop / close) cancels. There is no
dismiss-once persistence — the sheet appears on every attempt.

Capture runs on [`WikitaLiteShell`](src/prototypes/wikita-lite/components/WikitaLiteShell.vue)
and the onboarding branch of [`index.vue`](src/prototypes/wikita-lite/index.vue).
Classification: [`isLeavePrototypeHref()`](src/prototypes/wikita-lite/composables/useWikitaLiteCardActions.ts)
in `useWikitaLiteCardActions.ts`. **Excluded:** `./…` article links hijacked
by onboarding `ReadScreen`, `#` fragments, in-app `/wikita-lite…` routes.
Optional opt-out: `data-wikita-lite-skip-leave` on an anchor.

## Onboarding (first visit)

On first visit to `/wikita-lite` (no `?onboarded=1`), **`index.vue`** shows the
onboarding flow instead of the tabbed dashboard. Query params drive the active
step (deep-linkable).

Flow: **read article** → **create account** → **welcome** → **survey** →
**interests** → **`?onboarded=1`** → **`WikitaLiteHome`**.

On completion, transient keys (`screen`, `title`, `username`, `email`, …) are
stripped; `survey`, `interests`, and `displayName` remain in the URL.

**Account setup (welcome → survey → interests)** runs in **`OnboardingShell`**,
a `CdxDialog` rendered in place. On the mobile skin it's a `fixed-height`
takeover filling the frame; on the desktop skin it's an ordinary centred modal —
Codex's own `32rem` width clamp, and one height for all three steps:
**`--size-4000` (640px)**, or the available space when the window is shorter.
Content past that scrolls the body. Same skin split as
`WikitaLiteFullscreenDialogShell`, which sizes to its content instead.

**Interests pre-fill**: the interests step pre-fills from `?title=` only (the
article the user saved or started account creation from). `?title=` persists
through account → welcome → survey → interests. `?interests=` is written only
once the user edits on that step or onboarding completes.

**Save on account creation**: when the user taps bookmark → **Create account**
on the save sheet, `?saved=` / `?savedTs=` are written to the URL immediately;
on account form submit the page is added to the in-memory `readingList` for the
new user (no toast). Not triggered from the account menu alone or **Log in** on
the save sheet.

## Dashboard modes

Home module layout is controlled by **`?mode=`** or **`?survey=`** (survey maps
1:1 to simplified mode when `mode` is omitted).

| Mode   | Source           | Home modules (order)                                      |
| ------ | ---------------- | --------------------------------------------------------- |
| `both` | Survey / default | Suggested edits → Daily reads → Your impact → Your mentor |
| `read` | Survey           | Daily reads → Suggested edits → Your impact → Your mentor |
| `edit` | Survey           | Suggested edits → Your impact → Your mentor → Daily reads |

Default enabled modules come from mode; users can turn additional modules on or
reorder via **Configure layout** (`/wikita-lite/configure`). Overrides in
`homeOff` / `homeOn` / `homeOrder`. Config in `data/dashboardMode.ts` +
`data/homeLayout.ts`; composables `useWikitaLiteDashboardMode`,
`useWikitaLiteHomeLayout`.

### Your mentor module

Home-preview only (no subpage). Two states in
`modules/MentorModule.vue` — copy in `data/mentorContent.ts`, state in
`composables/useWikitaLiteMentor.ts`:

| State      | Title              | When                                      |
| ---------- | ------------------ | ----------------------------------------- |
| Unassigned | Mentor for editing | Dashboard mode `read` (default)           |
| Assigned   | Your mentor        | Dashboard mode `both` or `edit` (default) |

URL overrides (sparse encoding):

| Param                   | Values    | Notes                                                 |
| ----------------------- | --------- | ----------------------------------------------------- |
| `mentorAssigned`        | `1` / `0` | Force assigned / unassigned; omit to use mode default |
| `mentorBannerDismissed` | `1`       | Hides the assigned-state info notice                  |

**Get a mentor** sets `mentorAssigned=1`. Assigned state shows a dismissible
`CdxMessage`, a profile card (initial avatar + serif bio), and a full-width CTA.
Module title is dynamic — passed from `useWikitaLiteMentor().moduleTitle` in
`WikitaLiteHome.vue`, not `MODULE_TITLES.mentor`.

## Configure layout

Home / Explore / Contribute tabs are on `/wikita-lite`; a **configure** icon
(`cdxIconConfigure`) sits in the title row beside the greeting. It navigates to
**Configure layout** (`/wikita-lite/configure`) — a full-height in-frame
dialog (same shell pattern as onboarding) with drag-reorder + toggle for ten
Home modules. Changes write immediately to `homeOff` / `homeOn` / `homeOrder`.
Close (X) or back returns to Home.

Legacy suggestion-source configure (not linked from Home chrome):

- `/wikita-lite/configure/suggestions` — global saved-page / editing-history /
  interest toggles + dismissed-module restore.
- `/wikita-lite/configure/suggestions/interests` — global interest picker.

Suggestion feeds (**Daily reads**, **Suggested edits**, **Review changes**,
**Mentions**) honor global Personalization toggles via `getSuggestionSeeds()`
and `suggestionFeedsKey()`. Global prefs include `useSavedPages`,
`useEditingHistory`, `useWatchlist`, and `useInterests` (URL: `prefSaved`,
`prefHistory`, `prefWatchlist`, `prefInterests`). Seeds can come from the
active user's **reading list**, **watchlist**, **`editedPages`** list
(ProtoWiki user profile / settings panel), and/or chosen interests. When all
four toggles are off and there are no saved pages, Contribute still falls back
to random seeds per the rules below. **Mentions** require the saved-pages toggle
and at least one bookmark.

Users with no bookmarks but editing-history and/or interests enabled see Daily
reads, Suggested edits, and Review changes when seeds exist. All three follow
`suggestionSeedsAvailable`. When seeds are unavailable on **Home**, one module
shell shows `WikitaLiteInterestsEmptyState` ("Add some interests to start
getting suggestions." + **Add interests** → Personalization) by survey mode:
**read** → Daily reads; **both** / **edit** → Suggested edits. The other module
omits as before.

### Module overflow menus

When **Module overflow menus** are enabled (`?moduleMenus=1`, default), each
module shell shows an overflow menu (`WikitaLiteModule.vue`):

| Item          | Who                                          | Action                                                     |
| ------------- | -------------------------------------------- | ---------------------------------------------------------- |
| **Configure** | Daily reads, Suggested edits, Review changes | Opens **Personalization** (`/wikita-lite/personalization`) |
| **About …**   | Every module                                 | No-op placeholder (`About {lowercase title}`)              |

Configure and About are separated by a Codex menu-group divider. Pin and Dismiss
are not offered in overflow menus (dismiss state / restore remain available via
legacy configure pages and URL params).

**Personalization** (`/wikita-lite/personalization`) is a full-height in-frame
dialog (`WikitaLiteFullscreenDialogShell`) that edits **global** interests and
suggestion-source toggles: interests (inline lookup + chips), saved pages,
watchlist, and contributions. Count subtitles reflect in-memory page lists
(`readingList`, `watchlist`, `editedPages` from `useConfig`). An **Advanced**
accordion (collapsed by default) exposes comma-separated text fields for
watchlist, edited pages, and override saved pages — the same lists as URL
params (`?watchlist=`, `?edited=`, `?saved=`) and the dev settings panel.
Override saved pages merge with in-app bookmark saves on the shared
`readingList`. A **Fetch editing history from English Wikipedia user** row
(username + **Fetch**) loads up to 10 recent main-namespace article titles
via Action API `usercontribs` into the edited-pages field
(`data/fetchUserEditedPages.ts`). Close (X) or back returns to the previous view.

Legacy module-scoped Suggested edits configure remains at
`/wikita-lite/help-wanted/configure` (not linked from overflow menus; no longer
affects feed seeds). Global legacy configure: `/wikita-lite/configure/suggestions`.

When overflow menus are enabled, modules that normally navigate via the
clickable title show a footer **Show more …** link instead (Active
discussions, Trending, Daily reads, Saved, Mentions). Modules that
already always show a footer CTA (Suggested edits, Translate articles,
Review changes) are unchanged.

Dismissals (`dismiss_<moduleId>=<restoreAtMs>`) still work when set in the URL;
modules hidden via `useWikitaLiteDismissedModules` can be restored from the
legacy suggestions configure page.

## UX rules (mandatory)

### One loading indicator per surface

- **Home, Explore, and Contribute tabs** — loading UX is driven by
  `useWikitaLiteTabLoading.ts` in `WikitaLiteHome.vue`, and shows as **skeleton
  cards**, not a progress bar. `showLoadingBar(id)` still decides *whether* a
  module is loading; `skeletonsFor(loading, shown, limit)` turns that into the
  number of preview slots no card fills yet, passed to the module's
  `skeletons` prop. The module renders them (`WikitaLiteCardSkeletons`) inside
  its own cards container after the real cards, so on Vector they take the
  exact 2×2 cells the cards will and cards replace them one by one. Skeletons
  are flat `background-color-neutral-subtle` blocks at the card radius
  (`border-radius-base` by default), sized by `--wikita-lite-card-skeleton-height`
  per module and skin in `wikita-lite-shell.css`. Featured holds one hero-shaped
  skeleton. **Impact** is the exception — it keeps its progress bar.
  - **Empty module** — skeletons at the first pending slot in that tab's visual
    module order, under the module title.
  - **Daily reads + Suggested edits on Home** — when suggestion seeds exist,
    both module shells render immediately (via `emptyPending`), even while
    empty. **Fetch order:** Daily reads and Suggested edits fetch **in parallel**
    (`loadPersonalizedSuggestionFeeds` in `useMusicalGroupHome.ts`), independent
    of visual `MODE_MODULE_ORDER`. Both shells may be visible at once; each
    module shows its own skeletons when its feed is loading.
  - **Daily reads home fetch** — up to 5 randomly picked seeds, one **serial**
    generator morelike call each (`fetchDailyReadsPreview` in
    `wikita-lite/data/`), global dedupe, **12 cards total** with correct
    `relatedToTitle`. Cards are **interleaved round-robin** across seeds (A, B,
    C, A, B, C, …) so the first preview page mixes interests rather than
    showing one seed's whole block; fewer seeds means more cards per seed. Thumbnails
    come from Action API `pageimages` first; when missing, REST `/page/summary`
    is used as fallback. Cards append progressively via `onEach`. No blocking
    `fetchReadingListSummaries` on the home reload path; synthetic saved items
    from `readingListToSavedItems`. Preview caches under `dailyReadsPreview` in
    `homeTabCache` (separate from the paginated related-feed state used by the
    fullscreen subpage). Cache key is `dailyReadsPreviewCacheKey()` (versioned + UTC calendar
    day only) — at most one home preview fetch per UTC day, even when Personalization
    toggles or source lists change mid-day. Not cleared by `clearCachedSuggestionFeeds`.
  - **Saved module metadata** — non-blocking enrichment via
    `ensureReadingListSummaries` whenever the reading list has items: on Home
    (when the Saved module is layout-enabled), Explore (`view=read`), and
    `/wikita-lite/saved`. `fetchReadingListSummaries` uses REST `/page/summary`
    first, then Action API `pageimages` when the summary has no thumbnail
    (`fetchEnwikiPageMetadata`); resolved URLs are also written to
    `itemThumbnailCache` so synthetic saved items pick up thumbnails before the
    full `savedSummaries` cache merges. Cached summaries restore thumbnails
    immediately (`resolveReadingListSavedItems`); missing metadata refetches in
    the background (with `bypassFailureCache` when refilling). Separate from
    Daily reads load order — never blocks `loadPersonalizedSuggestionFeeds`.
  - **Refresh / partial preview** — cards already in hand stay visible; the
    remaining preview slots show skeletons until they fill. A full preview
    shows none. Multiple modules may each show skeletons at once.
  - **Hidden shells** — omit a module unless it has preview content or is
    loading (Daily reads and Suggested edits excepted — see
    above). On **Home**, one of Daily reads / Suggested edits may stay visible
    with `WikitaLiteInterestsEmptyState` when layout-enabled but seeds are
    unavailable — which module depends on survey mode (see Configure layout).
    Explore / Contribute unchanged.
  - No aggregate footer loaders below static sections (e.g. Learn).
- **Standalone subpages** — one `CdxProgressBar` per module, including
  pagination / infinite scroll (OR initial + load-more into one bar).
  **Suggested edits fullscreen** (`/wikita-lite/help-wanted`) seeds from the
  home `helpWanted` preview cache via `useContributeSuggestionsFeed` (interests-only
  users use the same path as reading-list users); only the Contribute random fallback
  uses `contributeRandomCacheKey`.
- **Home preview mode** (`standalone=false`) — modules must **not**
  render their own progress bars; the home panel owns loading and passes
  `skeletons`.

### Saved empty state (Explore + Saved subpage only)

The **Explore** tab and **`/wikita-lite/saved`** subpage may show an
empty Saved section with instructional copy and an inline bookmark icon
(`SavedModule` — "Use the save icon … on any page to add items.").

Do **not** add similar save-nudging copy elsewhere:

- No CTAs like "Save pages to see…" on Home, Contribute, or other modules.
- Other personalized sections simply **omit** when there is nothing to show,
  except **Home** — survey mode picks one of Daily reads (**read**) or
  Suggested edits (**both** / **edit**) to show `WikitaLiteInterestsEmptyState`
  when seeds are unavailable (interests CTA, not save nudging).

Saving a page in wikita-lite updates **`readingList`** + **`readingListSavedAt`**
(in-memory `useConfig`; synced to **`?saved=`** / **`?savedTs=`** when URL sync
runs). Not the separate `musical-group-bookmarks` store used by the musical-group
prototype. Saved cards show relative time from epoch-ms `savedAt` on each
`HomeSavedItem` — never sort-rank integers.

Save/bookmark **actions on cards** (bookmark icon, "Saved" label) and
post-save toasts are fine.

### Contribute tab without saved pages or suggestion seeds

When there are **no bookmarks** and **no suggestion seeds** (all configure
toggles off, or a toggle on with an empty source list), the **Contribute**
tab (not Home) still shows **Suggested edits** and **Review changes** seeded
from random English Wikipedia articles. On **Home**, layout-enabled Daily reads
and Suggested edits show cards when seeds exist; when they do not, survey mode
shows `WikitaLiteInterestsEmptyState` on Daily reads (**read**) or Suggested
edits (**both** / **edit**) only. Still no save prompts on Home.

Preview results for both modules cache under `contributeRandomCacheKey()`
(daily). Fullscreen subpages restore from that cache so the first card
matches the Contribute tab preview:

- **Suggested edits** — `fetchRandomEditSuggestions` /
  `useWikitaLiteHelpWantedPage`
- **Review changes** — `fetchRandomRecentChanges` /
  `useWikitaLiteRecentActivityPage` (latest revision only per random
  page; no revision-history pagination)

When global personalization seeds exist, the Review changes subpage uses
`useActivityFeed` full mode (paginated revision history on seed pages). When
there are no seeds, it falls back to `fetchRandomRecentChanges` (latest revision
only per random page; no revision-history pagination).

**Active discussions** — always fetched; shown on the **Contribute**
tab (and its subpage) even with no saved pages.

## Adding a module

1. Create `modules/MyModule.vue` — accept `standalone`, `items`,
   `loading`, `previewLimit`; use `useWikitaLiteCardListClasses`.
2. Add route constant + title in `routes.ts`.
3. Wire preview into `WikitaLiteHome.vue` inside the relevant tab.
4. Optional subpage: `src/prototypes/wikita-lite.my-module/index.vue`.

Follow [`codex-usage`](../codex-usage/SKILL.md) for components and tokens.
