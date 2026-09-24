---
name: protowiki-wikitab
description: The Wikitab new-tab prototype — its section registry, the reserved-slot "no-jump" loading contract that keeps the layout perfectly still, the shared reveal-more engine (desktop Show more button vs mobile continuous scroll), the daily feed orchestrator (featured + Active discussions + Main Page OTD + births), and the localStorage config / feed-cache split. Use when editing src/prototypes/wikitab/, adding a section, changing card sizes, or debugging layout shift or paging there.
---

# ProtoWiki — Wikitab

Route `/wikitab`. A bare, responsive new-tab page: serif wordmark, a search
input, and six feed sections. Logged-out only, `platform: 'web'`.

Deliberately **not** wrapped in `ChromeWrapper` — this is a page you set as your
browser's new-tab URL, so it has no Wikipedia chrome and no fake browser chrome.
Desktop and mobile diverge on `[data-skin]`, which ProtoWiki already resolves
from `?skin=` and the viewport at boot (see
[`protowiki-skins`](../protowiki-skins/SKILL.md)).

## The section registry is the source of truth

`sections.ts` holds one `WikitabSectionSpec` per section, and it drives both the
loading contract and the pagination. Change a card size or page size **there**,
never in a component:

| Field           | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `initialCount`  | Slots shown before any paging (4). Desktop renders these 2×2.         |
| `pageSize`      | How many more one reveal adds (6).                                    |
| `cardHeight`    | Placeholder slot height (px) and row floor. Real cards grow taller when content needs it; rows equalize via `useEqualRowHeights`. |
| `variant`       | `thumbnail` (Trending, Birthdays — always shows thumbnail; thumbnail-slot loading) or `text` (Active discussions, On this day, DYK, news — optional thumbnail; full-card loading). See [Loading modes](#loading-modes). |
| `thumbnailSize` | Thumbnail edge in px. Must fit inside `cardHeight`.                   |
| `fullHook`      | Text variant only: no line-clamp; card grows past `cardHeight` (min). On this day, Did you know, and In the news. |

`cardHeight` and `thumbnailSize` are coupled: a 96px thumbnail needs a 122px card
(96 + 12px padding either side + 1px border), and a 40px one fits a 98px card.
Change one without the other and the thumbnail either clips or floats in space.
Trending and Birthdays use 122/96 thumbnail cards; On this day, Did you know, and In the news use the same 122/96 text-card layout (thumbnail only when one resolves). Active discussions uses a 98px text card with no thumbnail column.

## The no-jump loading contract

This is the point of the prototype, so treat it as load-bearing.

The heading and `…` button paint immediately. Each section then reserves exactly
`initialCount` slots at exactly `cardHeight` — flat
`background-color-neutral-subtle` blocks with **no border** — and "Show more"
renders in `color-disabled`. How a slot looks while its page resolves depends
on the section's **`variant`** in `sections.ts` (see [Loading modes](#loading-modes)).

Four details make it actually not jump. Breaking any one of them reintroduces
shift:

1. **Loading placeholders use exact `cardHeight`,** not `min-height`. Real
   cards use `min-height: cardHeight` and grow with content; `useEqualRowHeights`
   keeps cards in the same row matched to the tallest. Clamped sections
   (Trending, Birthdays) line-clamp title/description; `fullHook` sections
   (On this day, Did you know, In the news) show the full hook with no clamp.
2. **A page is only "ready" once its thumbnails have decoded** — see
   `preloadImages.ts`, which preloads via `new Image()` with a 1.5s cap so one
   dead image can't hold a slot open.
3. **The error state keeps the reserved height** rather than collapsing.
4. **The "Show more" row is always rendered,** even when a section is exhausted
   and the control inside it is gone. Otherwise the sections below shift up the
   moment a short section finishes loading.

`useSectionReveal.ts` expresses the contract as two numbers:

- `reserved` — how many slots are on screen. Raised **immediately** on reveal.
- `ready` — how many of them have fully resolved (thumbnails decoded, and for
  DYK any per-hook summary fetch finished).

A slot at index `i` is `loading` when `i >= ready`.

### Loading modes

Controlled by `WikitabCardVariant` in the section registry — **do not** branch
on section id in components; add or change a `variant` in `sections.ts` instead.

| Variant | Sections | Thumbnail column | While `loading` |
| ------- | -------- | ---------------- | --------------- |
| `thumbnail` | Trending, Birthdays | Always — every item carries a feed thumbnail (or one fetched for the lead page) | **Thumbnail-slot loading:** card shell + title/description paint as soon as feed data lands; only the image area is a flat `background-color-neutral-subtle` block at `thumbnailSize` (no Codex image icon) until decode finishes. |
| `text` | Active discussions, On this day, Did you know, In the news | **Only when a URL resolves** — omit the column entirely if there is no image | **Full-card loading:** the whole slot stays the borderless neutral skeleton until the page is ready. Never show an empty thumbnail column while summaries are fetched or while "no thumbnail" is still being determined. |

Implementation lives in `WikitabCard.vue`: `showFullLoading` for the skeleton,
`showThumbnail` (text variant checks `thumbnailUrl` only, not `thumbnailTitle`).

### Feed cards use `CdxCard`

`WikitabCard.vue` is a thin adapter around Codex's `CdxCard` — not a hand-built
border shell. Variant wiring:

| Variant | `CdxCard` props | Link behaviour |
| ------- | --------------- | -------------- |
| `thumbnail` | `url`, `thumbnail`, `force-thumbnail` | Whole card is the link via `url`. |
| `text` | No `url`; hook HTML in `#description`; thumbnail via CSS `order` at inline-end when an image resolves | Overlay `<a class="wikitab-card__link">` for the primary page — hooks carry nested anchors Codex forbids inside a linked card. |

ProtoWiki ships Codex **2.6.x**, whose `CdxCard` has no `thumbnailSize` /
`thumbnailPosition` props — large (96px) thumbnails and text-variant end
placement are layout CSS in `WikitabCard.vue`, keyed off `sections.ts`
`thumbnailSize`. **Never set `display: block` on the card root** — it overrides
`.cdx-card { display: flex }` and breaks the fixed-height slot.

**Typography:** card title, description, and supporting text use Codex's built-in
`.cdx-card__text__*` styles. Do **not** override font-size, line-height, or
font-weight on those elements via `:deep()` — layout-only rules (fixed height,
line-clamp, overflow) belong on the wrapper.

**Equal row heights:** `useEqualRowHeights.ts` runs per section. Every row
(Trending, Birthdays, On this day, etc.) equalizes to the tallest card in that
row — pairs on desktop, the whole carousel on mobile — via `ResizeObserver`.
`cardHeight` in `sections.ts` is the **placeholder floor**, not a fixed cap on
real cards. `useEqualRowHeights` sets a definite inline `height` (not just
`min-height`) on each slot so the bordered `CdxCard` can fill the row.
Supporting text is pinned to the bottom inner edge of that card with a flex
`::after` spacer on `.cdx-card__text` (so Codex’s 8px `margin-top` on the
supporting slot is preserved) and `align-items: stretch` on `.wikitab-card__cdx`
(the Codex card root — the class merges onto `.cdx-card`, not a wrapper).

When adding a section: if thumbnails are guaranteed from the feed, use
`thumbnail`. If thumbnails are optional or need a follow-up fetch, use `text`.

## Pagination

One engine, two triggers:

- **Desktop** — "Show more" reveals `min(pageSize, remaining)`. Hidden once
  exhausted, `color-disabled` while a page resolves.
- **Mobile** — no button. `useRevealOnScrollEnd.ts` observes a sentinel at the
  end of the horizontal scroller (`root` = the scroller, `rootMargin` about one
  card wide) and reveals as it approaches. Torn down when exhausted, so
  scrolling just ends.

`revealMore()` ignores calls while a page is in flight, so a fast flick can't
queue several pages.

Sections **cap** at whatever the day's feed contains rather than reaching back
into previous days. Depth varies by day, so `hasMore` always derives from the
actual list length — never hardcode it. Typically Trending has ~44 items, On this day ~5 (Main Page event bullets),
Birthdays ~294 (Wikifeeds births, newest first), Did you know ~9,
In the news ~4 (which exactly fills the initial slots, so no control ever
renders for it), and Active discussions ~20 (merged from six noticeboards).
All registered sections **always render**. While a section's slice is still
loading, skeleton slots show; once resolved with zero items, a reserved empty
state (`"Nothing to show right now."`) appears instead of removing the section.
Feed errors show the same reserved-height error row per section.

## Daily feed sources

`data/fetchDailyFeed.ts` loads the feed in **two phases** so top sections can
resolve while slower secondary APIs are still in flight. All six sections are
cached under one UTC-day blob (`wikitab-feed-cache-v*`); slices patch in via
`persistPartialFeed()` as each section resolves during ordered home load.
**Active discussions** is the exception: its slice carries a **30-minute TTL**
(`DISCUSSIONS_TTL_MS` in `feedCache.ts`) so noticeboard threads stay reasonably
fresh without refetching the whole daily feed.

**Phase 1 — featured (blocking):**

- **`feed/featured/{yyyy}/{mm}/{dd}`** — Trending, DYK, In the news

`fetchDailyFeedProgressive(onUpdate)` calls `onUpdate` with this partial feed
immediately. `useWikitabFeed` sets `feedPhase = 'featured'` and featured
sections stop being feed-loading — their `useSectionReveal` watch fires and
card pages begin resolving.

**Phase 2 — secondary (parallel, patched as each settles):**

- **Action API `discussiontoolspageinfo`** — Active discussions (six noticeboards)
- **Action API parse of `Main_Page`** — On this day event bullets (`#mp-otd > ul > li`)
- **`feed/onthisday/births/{mm}/{dd}`** — Birthdays

Each secondary request patches its slice into the feed and calls `onUpdate`
again. `feedPhase` stays `'featured'` until all three settle, then becomes
`'complete'`. Secondary sections keep skeleton slots until their slice arrives;
they no longer block Trending / In the news / Did you know above them.

Featured failure fails the whole load; Main Page OTD, births, or Active
discussions failure yields an empty section for that part only.

Every card links as a whole to the **bolded** link inside it — the page the feed
marks as the item's subject — via `primaryLinkTitle()`. For news that means
preferring the bolded link's own entry in `links[]` for the thumbnail, rather
than whichever link happens to be first.

Because hooks and stories carry their own inline links and an anchor cannot
contain another one, the card-wide link is an **absolutely-positioned overlay**
(`.wikitab-card__link`) rather than an ancestor element. It sits at `z-index: 1`
and the inline links are lifted to `z-index: 2`, so clicking hook text follows
the card and clicking a link inside it follows that link. Keep that ordering if
you touch the card's stacking.

- **Trending** ← `mostread.articles`. Already full page summaries, so read
  `description`, `thumbnail` and `views` straight off the feed. **Do not** fetch
  per-article summaries — that was the main waste in the old wikita prototype.
  Sort by `rank`; the list is not pre-sorted. When today's `mostread` is
  missing or empty (documented API behaviour, especially early in the UTC day),
  `fetchDailyFeed.ts` falls back to the **previous UTC day's** featured feed for
  Trending only. Feeds with empty Trending after that fallback are not cached,
  so a later tab open can retry.
- **On this day** ← `data/fetchMainPageOtd.ts` parses `#mp-otd` from the Main
  Page HTML (Action API). Text cards with inline links; year kept in the hook as
  linked prose (`In <year>, ….`). ~5 event bullets matching desktop Main Page
  parity. The
  `(pictured)` item uses `#mp-otd-img`; others lazy-fetch lead-page thumbnails.
  Pin with `?pinned=otd`.
- **Birthdays** ← `data/fetchBirthsOnThisDay.ts` maps
  `feed/onthisday/births/{mm}/{dd}`. Person name as title, age as
  `"{n} years old"` with `cdxIconCalendar`, lead page for link/thumbnail. Pin
  with `?pinned=births`.
- **Did you know** ← `dyk[]`. Carries only `html`, with no thumbnail and no
  `pages` array. `data/resolveDykThumbnails.ts` pulls the bolded link's title
  out of the HTML and fetches summaries for the **revealed page only**.
  On enwiki, DYK normally updates once at ~00:00 UTC; during queue backlog it
  can rotate twice per day (~00:00 and ~12:00 UTC). The Wikifeeds API serves
  the **current** main-page set for today's date — UTC-day cache is fine for
  normal days; the midday rotation is a rare edge case.
- **In the news** ← `news[]`. Each story has `links[]` of full summaries, so
  again no follow-up requests.
- **Active discussions** ← `data/fetchActiveDiscussions.ts` queries
  `discussiontoolspageinfo` with `prop=threaditemshtml` and
  `threaditemsflags=noreplies|excludesignatures|activity` on six enwiki
  noticeboards (Help desk + five Village pumps — same list as Personal
  Dashboard, T420785). Threads need `authorCount > 1` and a latest reply;
  merged newest-first with at least two per noticeboard, capped at ~20. Cards:
  discussion title, noticeboard as plain `#description`, supporting row
  `cdxIconSpeechBubbles` + `"{n} comments"` at row start, compact relative time at row end.
  Links to the
  noticeboard URL with a `#` fragment to the thread. Default registry order:
  Trending → In the news → Did you know → Active discussions → On this day →
  Birthdays. No thumbnails, no per-card follow-up fetches.

`data/wikitabHtml.ts` normalises feed HTML. Note the asymmetry it exists for:
`news` stories use relative `./Page_Title` hrefs, which would otherwise resolve
against our own origin, while `dyk` hooks use absolute ones.

## Saved-adjacent home modules

Three home modules sit beside the daily feed — not in `WIKITAB_SECTIONS` or
`useWikitabFeed`. All use the same paging contract as feed sections
(`initialCount` 4, `pageSize` 6, thumbnail cards at 122/96). Default home order
(`WIKITAB_HOME_MODULE_ORDER`): Saved → Daily reads → Suggested edits → Trending
→ remaining feed sections. All appear in Configure and support pin / hide.

**Saved** (`saved`) — home feed cards come from a **snapshot**
(`savedModuleArticles` in `index.vue`), not live `savedArticles`. The section is
hidden until a refresh runs (mount, search exit, overlay close) and only then
reflects what was saved at that moment — saving your first article mid-session
does not surface the module. Snapshot + REST summary enrichment via
`useWikitabSavedArticles.ts`, `WikitabSavedSection.vue`. Unsaving every article
during the session clears the snapshot immediately.

**Daily reads** (`daily-reads`) — morelike suggestions seeded from up to **four**
saved pages picked by a **deterministic daily shuffle** (UTC day +
sorted `titleKey`s → seeded Fisher-Yates). Hidden when the Saved-module
snapshot has no articles (so saving your first page mid-session does not
surface an empty section), and hidden again once a refresh completes with
zero suggestions. Action API `generator=search` with `gsrsearch=morelike:{title}` per
seed (`DailyReadsFeed` in `data/fetchWikitabDailyReads.ts`); seeds load in
parallel but cards resolve **one at a time** via `takeNext()` — a daily-seeded
random shuffle across all seed queues (stable for the UTC day, mixed on screen).
Each card is
enriched with REST `/page/summary/` before paint (better thumbnails than
pageimages alone); a non-blocking summary backfill runs if a thumbnail is still
missing. Cards are thumbnail variant with
`supportingText: "Related to {seed title}"`. Excludes disambiguation pages,
duplicate `pageid`s, and all saved titles. Hidden-article keys are filtered
client-side via `filterCards` in `index.vue`. Cards paint as they resolve — no
batch `preloadImages` gate (`WikitabDailyReadsSection.vue` does not use
`useSectionReveal`).

Cached under `wikitab-daily-reads-cache-v3` keyed by `{ utcDay, savedFingerprint }`
(`data/dailyReadsCache.ts`); entries store the loaded card list plus a `hasMore`
flag.

**Suggested edits** (`suggested-edits`) — edit-opportunity cards from the same
Microtask `POST /quality-check` pipeline as the search **Contribute** tab
(`fetchWikitabSearchContribute.ts`), seeded from up to **six** saved pages via a
**deterministic daily shuffle** with a separate salt from Daily reads
(`pickSavedArticleSeeds.ts` → `SuggestedEditsFeed` in
`data/fetchWikitabSuggestedEdits.ts`). Direct phase quality-checks saved seeds;
morelike expansion skips titles already in the saved list. Cards map to
`WikitabCardData` via `contributeItemToCard()` (Visual Editor link, task body,
`supportingSignals` for task icon + label, optional `Related to {seed}` end
text). Same visibility rules as Daily reads — hidden when the snapshot is empty
or when a completed fetch yields zero cards. Same composable / section pattern as
Daily reads (`useWikitabSuggestedEdits.ts`, `WikitabSuggestedEditsSection.vue` —
local `reserved` display slots, no `useSectionReveal`). Cached under
`wikitab-suggested-edits-cache-v1` (`data/suggestedEditsCache.ts`).

A render triggered on mount, search exit, or overlay close calls
`refreshHomeSavedModules()` in `index.vue`, which refreshes Saved, Daily reads,
and Suggested edits from the **same snapshot**. Network runs only on cache miss
(saved list or UTC day changed); session memory skips even localStorage when the
key matches. Only the first `initialCount` cards fetch on load — further pages
load on **Show more** (`loadMore()` in each composable), continuing the same seed
feed from refresh time (not the live saved list). A full refresh after save/unsave
waits for overlay close, search exit, or a new tab. `?nocache=1` bypasses caches.

## State and storage

User preferences (`data/wikitabConfig.ts`), feed cache (`data/feedCache.ts`),
feed orchestration phase (`useWikitabFeed` → `feedPhase` +
`isSectionLoading`), and transient reveal counts (`useSectionReveal`) live in
separate layers.
See [references/state-and-storage.md](references/state-and-storage.md) for the
full rules, migration from legacy `?pinned=`, and how to add future config
fields without over-building a schema.

**Pinning** — pinned sections move to the top. State is
`WikitabConfig.pinnedSectionIds` in localStorage, wired through
`useWikitabPinned.ts` (`togglePin`, `orderSections`, cross-tab `storage`
sync). Pinned ids come first (most recently pinned at the very top), then
unpinned sections in registry order. Pinned sections show `cdxIconPushPin`
beside the heading; the ellipsis menu toggles "Pin to top" / "Unpin from top".
Pinning reorders by `spec.id` and does not affect the no-jump loading contract.

The full daily feed (featured + Active discussions + Main Page OTD + births) is
cached under a UTC-day key; ordered per-section loading reads and writes through
the same cache, with one in-session `feed/featured` request shared across
Trending / News / DYK on a cache miss. **Active discussions** refetches when its
30-minute TTL expires — other slices still hit the day cache. Stale discussions
are stripped on hydrate so skeleton slots show until the refetch lands.
`?nocache=1` forces a refetch. After the first load of the day you mostly won't
see loading slots — use `?nocache=1` when working on them.

## Layout

Desktop (`[data-skin="desktop"]`) uses a 2-col grid and Show more from 640px, but
the column width and gutter split again at 768px:

- **Compact desktop (640–767px):** full-width column, 16px page gutter — the band
  between the mobile carousel and the centred wide-desktop column.
- **Wide desktop (768px+):** centred 640px column, 64px page gutter, cards at
  312px each.

Hero `padding-block: 128px`; 64px between sections.

Both skins carry an 80px `padding-bottom` on the page root (`64px + 16px`), so the
last section never sits flush against the bottom of the viewport.

Mobile (`[data-skin="mobile"]`): full width, 16px gutter, 48px between sections,
cards in a horizontally scrolling snap row at 320px that deliberately bleeds
past the right edge. The row cancels the page gutter with negative inline
margins and reinstates it as padding, plus
`scroll-padding-inline-start` — without that last part, snapping to a card's
start edge scrolls straight past the padding and the first card sits flush to
the viewport edge instead of lining up with the heading.

**Type scale.** Two contexts, both using Codex token shadowing on a scoped
ancestor (tokens are `rem`-based and cannot be scaled by `font-size` on the page
element):

- **Home feed cards** — compact scale on `.wikitab-section__cards` in
  `WikitabSection.vue`: 14px body / 12px small. Section headings, wordmark, and
  chrome use Codex defaults (18px / 28px).
- **Search results** — Codex defaults for tabs, hero search, and Articles /
  Images panels (16px body / 14px small). **Activity tab cards** use the home
  feed compact scale (14px body / 12px small) via token shadowing on
  `.wikitab-search-page__list--activity`.

See [`codex-typography`](../codex-typography/SKILL.md) for the canonical text
styles those values map onto.

## Lookahead search

`WikitabSearch.vue` wraps `CdxSearchInput` + `CdxMenu` (not ProtoWiki's
`Search.vue` / `CdxTypeaheadSearch`). English Wikipedia title search via Core
REST:

`GET https://en.wikipedia.org/w/rest.php/v1/search/title?q=…&limit=6`

- **`data/fetchWikitabSearch.ts`** — two-step fetch for speed:
  `fetchWikitabSearchRaw` (REST only) paints menu rows immediately;
  `filterDisambiguationResults` runs in the background via Action API
  `pageprops` (`data/filterDisambiguationPages.ts`) and patches the list when
  done (e.g. **Squash (sport)** replaces **Squash** dab page). Thumbnail URLs
  are normalised to `https:`. No `url` on menu items. Thumbnails decode
  in-place — **no preload gate** (contrast feed cards). Rows without a
  thumbnail URL use the default Codex placeholder icon.
- **`useWikitabSearch.ts`** — debounced input (200ms), `AbortController`
  cancellation, maps results to `MenuItemData` for `CdxMenu`. Stale rows stay
  visible while debouncing; `show-pending` only when the first fetch has zero
  result rows.
- **Panel** — first menu row is the `Search for "…"` item (custom menu slot,
  text only, no thumbnail; shows the raw input inside the quotes including
  whitespace; `&nbsp;` before the opening quote so that space cannot collapse);
  then thumbnail + title + description rows. Dropdown width matches the input
  wrapper only (not the Search button). When open,
  `.wikitab__hero:has(.wikitab-search--expanded)` gets `z-index: 10` so the
  menu covers feed card link overlays (`z-index: 2`). Keyboard handling matches
  `CdxTypeaheadSearch`: arrow keys navigate the menu, but **Space** is left to
  the input (never delegated to `CdxMenu`).
- **Navigation** — submit or the `Search for "…"` row pushes `?search=…` on the
  same `/wikitab` route. On the **home feed**, a lookahead result row (click or
  Enter with that row highlighted) navigates the tab to the English Wikipedia
  article via `articleUrl(title)`. On the **search results page** (`?search=`
  present), the same action pivots search — updates `?search=` to that title via
  `useWikitabSearchNavigation()` and refreshes results (current `?tab=` preserved).
  Clearing the input and submitting removes `search` from the query.

## Search results (`?search=`)

When `?search=` is present, the daily feed is hidden and
`WikitabSearchPage.vue` renders below the hero in the same centred 640px column
as the home feed (hero top padding unchanged so the search bar does not jump).
The feed orchestrator is skipped while search mode is active.

**Tabs** — quiet `CdxTabs` with four labels: Articles, Images, Activity,
Contribute. All four tabs have content. Active tab syncs to
`?tab=` (`articles` | `images` | `activity` | `contribute`); omitted means
Articles. Tab clicks **push** browser history so Back/Forward walks tab
selections. Submitting a new search keeps the current `tab`; clearing search
removes `tab` from the URL.
`useWikitabSearchTab.ts` owns URL ↔ state sync.

**Tab cache** — Articles, Images, Activity, and Contribute results stay in
composable memory for the search session. Switching tabs does not refetch or
show skeletons again; Activity, Contribute, and Images abort in-flight requests
when hidden but keep resolved results. Query change resets all four tabs.

**Loading cards** — `WikitabSearchLoadingCard.vue` is the shared search-result
placeholder. Variants: `article` (96px thumbnail stub), `activity` (no
thumbnail column), and `image` (borderless aspect-ratio skeleton tile). Use
these heavily while API work resolves — especially on Activity and Contribute,
where cards stream in one at a time. Contribute reuses the **activity** skeleton
variant (same compact list type).

**Articles tab** — `WikitabSearchResultCard.vue` per hit. One flat list built in
priority order from four sources (global `pageid` dedupe — earlier slots win):

| Cap | Source | Relation |
| --- | ------ | -------- |
| 1 | REST `search/title` | `exact` |
| 1 | REST `search/title` | `near` — **only when there is no exact match** |
| 1 | Action `generator=search` `gsrsearch={query}` (unquoted) + `gsrprop=snippet` | `match` — CirrusSearch snippet (~200–300 chars, not configurable) with hits in **bold**; `…` prepended/appended when the fragment starts mid-article or ends mid-sentence |
| remainder | Action `morelike:{seed}` (top curated hit only) | `related` |

**Supporting row** (all cards) — split row from the [Attribution API](https://www.mediawiki.org/wiki/Attribution_API) via `useWikitabSearchArticleAttribution.ts` (module cache keyed by title; fetches through `fetchWikimedia`):

- **Start:** `cdxIconChartLine` + compact page-view count (`trust_and_relevance.page_views`, last 30 days) and `cdxIconReference` + reference count (`trust_and_relevance.reference_count`), 16px apart.
- **End:** relative last update (`formatRelativeUpdate` on `trust_and_relevance.last_updated`).
- Row hidden while loading and when all three signals are null/missing. Partial rows show only available signals.

**Card menu** — each resolved card has a top-right `CdxMenuButton` (`cdxIconEllipsis`, quiet weight, subtle icon — same pattern as section headings on the home feed). One row: **Why am I seeing this?** (`cdxIconHelpNotice`). Opens a dismissable `CdxDialog` whose body explains the hit from `article.relation` via `formatSearchArticleRelationExplanation()` in `data/formatSearchArticleRelation.ts` — **exact** / **related** use `{title} …`; **near** uses `{title} is the nearest match to your query "{query}".`; **match** uses `Your query was found within the {title} article.`

Title search runs first; full-text search uses the query unquoted. Title enrichment and full-text then run **in parallel**. Morelike is seeded from
the **top curated result** only (exact, else near, else text match). Disambiguation pages
filtered from every batch via `filterDisambiguationPages`.

**Progressive load** — `useWikitabSearchResults` streams cards in priority order:
exact title → near title (when no exact) → text match → related. Each slot
paints as soon as its fetch resolves; initial skeletons hide once the first card
lands. Initial morelike uses `INITIAL_MORELIKE_BATCH_SIZE` (5), not the 20-item
pagination batch. `loadingRelated` covers the morelike tail;
tail skeletons while related resolves.

**Thumbnails** — initial `thumbnailUrl` comes from the Action API `pageimages`
pass in `fetchActionApiPages`. Any article still missing a thumbnail after that
is backfilled asynchronously via REST `/page/summary/` (`backfillArticleThumbnails`
in `fetchWikitabSearchArticles.ts`, shared cache in
`data/fetchWikitabPageSummary.ts`) — non-blocking; cards paint immediately.

**Thumbnail-slot loading** — `WikitabSearchResultCard` always reserves the 96px
thumbnail column. Title, description, and extract paint as soon as API data
lands; when a `thumbnailUrl` exists, only the image area stays a flat
borderless `background-color-neutral-subtle` block (no Codex image icon) until
decode finishes (`useThumbnailSlotReady.ts`, 1.5s cap). When no thumbnail URL
resolves, fall back to the default Codex placeholder icon — never keep the
loading block. **Do not** call `preloadImages` before rendering search cards —
unlike feed cards, which intentionally gate reveal on decode.

The **h3 title link** pivots search — updates `?search=` to that article title
via `useWikitabSearchNavigation()` (Wikipedia is not opened from the results
list); the card itself is not otherwise tappable. Infinite scroll uses
`useInfiniteScroll.ts` (viewport sentinel) + `useWikitabSearchResults.ts`
(`loadMore` guarded while a batch is in flight). No error/empty placeholder
text when the query resolves to nothing.

Implementation: `data/fetchWikitabSearchArticles.ts`,
`data/fetchWikitabPageSummary.ts`, `data/formatSearchArticleRelation.ts`,
`useWikitabSearchResults.ts`, `WikitabSearchPage.vue`,
`WikitabSearchResultCard.vue`, `useThumbnailSlotReady.ts`,
`useWikitabSearchArticleAttribution.ts`.

**Images tab** — Wikimedia Commons file search in a **responsive masonry grid**
(minimum two columns on mobile — not the home-feed horizontal carousel).
Column count grows with panel width (~320px target column width via
`useWikitabSearchImageColumns.ts`). Each tile links to the Commons file
description page.

- **Source** — Commons Action API search with **MediaSearch image-tab defaults**
  plus explicit-content `-deepcat:` exclusions:
  `generator=search`, `gsrnamespace=6`, `gsrsearch="filetype:bitmap|drawing
  -fileres:0 -deepcat:\"Pornography\" -deepcat:\"Sexual acts\"
  -deepcat:\"Explicit content\" -deepcat:\"Hentai\" {query}"`, `gsrlimit=40`,
  `prop=imageinfo` (`url|size|mime`, `iiurlwidth=640` — wider than MediaSearch's
  `iiurlheight=180` for full-bleed masonry). Same engine as
  [Special:MediaSearch](https://commons.wikimedia.org/wiki/Special:MediaSearch),
  not Articles-tab seeds / morelike. **Explicit-content filter** — CirrusSearch
  excludes files in pornography / sexual-acts / explicit-content / hentai
  category trees only; artistic and medical nudity are not excluded. Commons has
  no safe-search API — coverage is partial (CirrusSearch may apply only a subset
  of deep categories; uncategorized explicit files can still appear). Client-side
  filter: `mime.startsWith('image/')` with valid width/height. Paginate via Action
  API `continue` params (`gsroffset`, etc.).
- **Layout** — `WikitabSearchImageGrid.vue` splits results into N equal columns
  with **2px gaps** (horizontal and vertical). `useWikitabSearchImageColumns.ts`
  derives N from the image panel width (`ResizeObserver`, min 2, ~320px per
  column). Results are sorted by the API's search `index`, then distributed
  round-robin into columns so the top row is hits 1…N. Each card uses
  the API's native
  `width / height` as CSS `aspect-ratio` — images fill column width with
  **no cropping** (`height: auto`, no `object-fit: cover`). On wide desktop
  the image panel **breaks out** to the screen edge with **2px** inset on each
  side; tabs and other tab panels stay in the centred column.
- **Styling** — subtle border (`--border-color-subtle`), `--border-radius-base`.
  Hover/active borders match feed cards (`--border-color-interactive--hover` /
  `--border-color-interactive--active`). The card frame keeps the API
  `width / height` as CSS `aspect-ratio` through decode so tile height stays
  stable; the img fills at `width: 100%`, `height: auto`.
- **Loading** — `WikitabSearchImageCard` uses thumbnail-slot loading
  (`useThumbnailSlotReady.ts`, 1.5s cap): flat neutral block inside the
  aspect-ratio box until decode. Initial skeletons use
  `WikitabSearchImageSkeletonGrid` (borderless tiles, mixed aspect ratios,
  masonry-packed). Resolved cards keep the subtle border.
- **Fetch contract** — all requests via `fetchWikimedia`. Tab fetch starts only
  when Images is selected (`enabled` ref); abort when hidden or on query change,
  but keep resolved results when switching tabs. Infinite scroll: one sentinel
  per masonry column in `WikitabSearchImageGrid.vue` (`useInfiniteScrollMany.ts`
  — fires when any column tail nears the viewport; disabled while
  `loadingMore`). Load-more uses **batch-sized tail slots** per column
  (`fetchingTailSlotCountsPerColumn` in `wikitabSearchImageSkeletons.ts`):
  conservative `4/3` placeholders while the fetch is in flight, then exact
  API aspect-ratio skeleton UI for gated slots until they reveal.
- **Top-down reveal** — never paint a real card below a skeleton in the same
  column. `useWikitabSearchImageDecode.ts` tracks per-`pageid` decode;
  `WikitabSearchImageGrid.vue` reveals slots top-to-bottom only when every
  image above in that column has finished decoding (including the 1.5s cap).

Implementation: `data/fetchWikitabSearchImages.ts`,
`useWikitabSearchImages.ts`, `useWikitabSearchImageColumns.ts`,
`useWikitabSearchImageDecode.ts`, `WikitabSearchImageGrid.vue`,
`WikitabSearchImageSkeletonGrid.vue`, `WikitabSearchImageCard.vue`,
`wikitabSearchImageSkeletons.ts`.

**Activity tab** — merged edit feed scoped to the search query's **top 6
articles** (seed + related via `fetchWikitabSearchTopTitles`). Reuses those
titles from the Articles tab when already loaded; if Activity opens while
Articles is still loading, **wait** for the first six article titles rather than
duplicating the Articles fetch pipeline. Edits from all six pages merge into one
**newest-first** list; infinite scroll pages backward through revision history on
those titles.

**Progressive load** — mirrors the Articles tab skeleton phases:

1. **Initial** — `WikitabSearchLoadingCard variant="activity"` while titles /
   the first revision batch resolve (`loading`, or `fillingInitial` before the
   first card).
2. **Resolved cards** — append one at a time as `takeNext()` completes.
3. **Tail** — two activity skeletons below resolved cards while the initial
   batch is still streaming (`loadingTail`).
4. **Load more** — three skeletons at the bottom during infinite scroll
   (`loadingMore`).

Feed bootstrap is **non-blocking**: `createWikitabSearchActivityFeed` returns
after titles resolve; `feed.start()` fetches the first revision batch;
`feed.prefetchMetadata()` runs in the background for latest revids and missing
thumbnails (REST `/page/summary/` via `fetchWikitabPageSummaryThumbnails` —
same shared cache as Articles / Contribute). Cards paint immediately with
partial metadata; **Latest** chips and **40px thumbnails** patch onto already-
rendered slots when prefetch settles (`patchThumbnails` in
`useWikitabSearchActivity.ts`, same reactive pattern as revert-risk chips).

Rate-limit contract (mandatory):

- All requests via `fetchWikimedia` (host queue + backoff).
- **One resolved card per fetch cycle** — never dump a full parallel batch into
  the UI.
- Queue refill uses `mapWithConcurrency(…, 2)` per-title revision fetches,
  `rvlimit=5`, only when the internal merge queue is empty.
- Latest revid per title fetched in background (`prefetchMetadata`) for the
  **Latest** chip — not a gate before the first card paints.
- Revert risk fetched per card in the background via Lift Wing
  (`fetchRevertRiskLanguageAgnostic.ts`) — serial queue, not a gate before
  paint; indefinite in-memory cache keyed by `revid`.
- Editor kind resolved per card in `takeNext()` via cached
  `list=users&usprop=groups` lookup (`bot` / `temp` groups).
- Tab fetch starts only when Activity is selected (`enabled` ref); abort
  in-flight work when hidden or on query change, but keep resolved results in
  memory when switching tabs.

UI: resolved `WikitabSearchActivityCard` rows plus activity skeleton phases
above. Resolved cards use the standard Codex card border (`--border-color-subtle`
at rest, interactive hover/active border tokens) — unlike Articles tab cards,
which are borderless. Activity skeletons have **no thumbnail column**; resolved
cards show a 40px thumbnail when one resolves. Description block: green **+n** / red **−n** character delta (from revision `size`
vs parent), or subtle **±0** when size is unchanged, on its own line above the edit
summary when the parent size is known. Chip row uses `CdxInfoChip` (in order):
**High revert risk** (Lift Wing `revertrisk-language-agnostic`, ≥0.9 probability,
every resolved edit — not latest-only; fetched per card in the background;
indefinite in-memory cache keyed by `revid`), **Latest revision** (from
background latest-revid prefetch), and **Reverted** (from revision `mw-reverted`
tag). Multiple chips may appear on one card.
Top-right `CdxMenuButton` (`cdxIconEllipsis`, quiet) exposes **Thank** (opens
`Special:Thanks/{revid}` on en.wikipedia.org in a new tab) and **Dismiss** — persists the revision id in
`WikitabConfig.dismissedActivityRevids` and removes the card; dismissed diffs are
skipped on future loads. Card links go to the en.wikipedia.org diff. Chips sit above the entire card (above the thumbnail +
content row); supporting row is editor + relative time, with a Codex icon for
editor type — **Bot** (`cdxIconRobot`), **Temporary** (`cdxIconUserTemporary`),
**User** (`cdxIconUserAvatar`). IP edits (`userid === 0`) use the same
**Temporary** icon (`cdxIconUserTemporary`). Resolved from revision `userid`
(anonymous when 0) plus the per-card user-group lookup above.

Implementation: `data/fetchWikitabSearchActivity.ts`,
`data/fetchWikitabPageSummary.ts`, `data/fetchRevertRiskLanguageAgnostic.ts`,
`useWikitabSearchActivity.ts`,
`useWikitabDismissedActivity.ts`, `WikitabSearchActivityCard.vue`,
`WikitabSearchLoadingCard.vue`.

**Contribute tab** — edit-opportunity cards scoped to the search query's **top 6
articles** (same `knownTitles` as Activity). Reuses Articles-tab titles when
already loaded; if Contribute opens while Articles is still loading, **wait** for
the first six titles rather than duplicating the Articles fetch pipeline.

- **Source** — Microtask Generator `POST /quality-check` (`potential_needs[]` →
  task label + body via `editOpportunityCopy.ts` / `editOpportunityIcons.ts`).
  Phase A quality-checks each top-6 title in Articles order; phase B expands via
  Action API `list=search` + `srsearch=morelike:{seed}` into related articles.
  Thumbnails and descriptions from Articles-tab cache or
  `fetchWikitabPageSummary.ts` (shared with Articles / Activity).
- **Progressive load** — same skeleton phases as Activity (`variant="activity"`):
  initial three skeletons → one resolved card per `takeNext()` → tail skeletons
  while filling → load-more skeletons on infinite scroll.
- **Rate-limit contract** — Wikipedia requests via `fetchWikimedia`; Microtask
  POST via `fetchWithTimeout` (not queued). **One resolved card per fetch cycle.**
  Quality-check results and built cards are cached per page as each card resolves
  (indefinite in-memory cache keyed by `pageid` / title; `'none'` for misses).
  Summary responses are cached per title in `fetchWikitabPageSummary.ts`. Tab
  fetch starts only when Contribute is selected; abort when hidden or on query
  change, but keep resolved results when switching tabs.

UI: `WikitabSearchContributeCard.vue` — bordered card (Activity shell), 96px
left thumbnail with thumbnail-slot loading, article title, task body, supporting
row with progressive task icon + label at row start and **Related to {seed}** at
row end when from morelike. Whole card links to Visual Editor
(`visualEditorUrl()` in `wikitabHtml.ts`).

Implementation: `data/fetchWikitabSearchContribute.ts`,
`data/fetchWikitabPageSummary.ts`, `data/editOpportunityCopy.ts`,
`data/editOpportunityIcons.ts`,
`useWikitabSearchContribute.ts`, `WikitabSearchContributeCard.vue`,
`WikitabSearchLoadingCard.vue`.

## What's inert

"About {section}" is inert; its menu row clears its selection without acting.

The `…` menu is a single `CdxMenuButton` — its `footer` prop renders the
separated "About …" row, and the 2px ring on the open trigger is the underlying
ToggleButton's toggled state, not hand-written CSS. Positioning is left to
Codex's floating logic, which handles desktop (start-anchored, overflowing the
column) and mobile (end-aligned to stay on screen) without per-skin CSS.
