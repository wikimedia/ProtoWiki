---
name: protowiki-wikitab
description: The Wikitab new-tab prototype — its section registry, the reserved-slot "no-jump" loading contract that keeps the layout perfectly still, the shared reveal-more engine (desktop Show more button vs mobile continuous scroll), the daily feed orchestrator (featured + Main Page OTD + births), and the localStorage config / feed-cache split. Use when editing src/prototypes/wikitab/, adding a section, changing card sizes, or debugging layout shift or paging there.
---

# ProtoWiki — Wikitab

Route `/wikitab`. A bare, responsive new-tab page: serif wordmark, a search
input, and five feed sections. Logged-out only, `platform: 'web'`.

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
| `variant`       | `thumbnail` (Trending, Birthdays — always shows thumbnail; thumbnail-slot loading) or `text` (On this day, DYK, news — optional thumbnail; full-card loading). See [Loading modes](#loading-modes). |
| `thumbnailSize` | Thumbnail edge in px. Must fit inside `cardHeight`.                   |
| `fullHook`      | Text variant only: no line-clamp; card grows past `cardHeight` (min). On this day, Did you know, and In the news. |

`cardHeight` and `thumbnailSize` are coupled: a 96px thumbnail needs a 122px card
(96 + 12px padding either side + 1px border), and a 40px one fits a 98px card.
Change one without the other and the thumbnail either clips or floats in space.
Trending and Birthdays use 122/96 thumbnail cards; On this day, Did you know, and In the news use the same 122/96 text-card layout (thumbnail only when one resolves).

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
| `text` | On this day, Did you know, In the news | **Only when a URL resolves** — omit the column entirely if there is no image | **Full-card loading:** the whole slot stays the borderless neutral skeleton until the page is ready. Never show an empty thumbnail column while summaries are fetched or while "no thumbnail" is still being determined. |

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
real cards.

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
Birthdays ~294 (Wikifeeds births, newest first), Did you know ~9, and
In the news ~4 (which exactly fills the initial slots, so no control ever
renders for it). Sections with zero items for the day are hidden once the feed
loads (still skeleton while loading).

## Daily feed sources

`data/fetchDailyFeed.ts` orchestrates three parallel requests, cached as one
daily blob:

- **`feed/featured/{yyyy}/{mm}/{dd}`** — Trending, DYK, In the news
- **Action API parse of `Main_Page`** — On this day event bullets (`#mp-otd > ul > li`)
- **`feed/onthisday/births/{mm}/{dd}`** — Birthdays

Featured failure fails the whole load; Main Page OTD or births failure yields an
empty section for that part only.

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
  Sort by `rank`; the list is not pre-sorted.
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
- **In the news** ← `news[]`. Each story has `links[]` of full summaries, so
  again no follow-up requests.

`data/wikitabHtml.ts` normalises feed HTML. Note the asymmetry it exists for:
`news` stories use relative `./Page_Title` hrefs, which would otherwise resolve
against our own origin, while `dyk` hooks use absolute ones.

## State and storage

User preferences (`data/wikitabConfig.ts`), feed cache (`data/feedCache.ts`),
and transient reveal counts (`useSectionReveal`) live in three separate layers.
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

`feed/featured` is cached under a UTC-day key; `?nocache=1` forces a refetch.
After the first load of the day you mostly won't see loading slots — use
`?nocache=1` when working on them.

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

**Type scale.** The design uses 16/18/28px on mobile and 14/16/26px on desktop.
Codex's type tokens are `rem`-based, so they resolve against the document root
and **cannot** be scaled by a `font-size` on the page element. Codex's defaults
already match the mobile design, so mobile needs nothing; the desktop scale is
set by shadowing the tokens themselves on `.wikitab` under
`[data-skin="desktop"]`. See [`codex-typography`](../codex-typography/SKILL.md)
for the canonical text styles those values map onto.

## Lookahead search

`WikitabSearch.vue` wraps `CdxSearchInput` + `CdxMenu` (not ProtoWiki's
`Search.vue` / `CdxTypeaheadSearch`). English Wikipedia title search via Core
REST:

`GET https://en.wikipedia.org/w/rest.php/v1/search/title?q=…&limit=6`

- **`data/fetchWikitabSearch.ts`** — fetch + map to `{ id, title, description,
  thumbnailUrl }`. Thumbnail URLs are normalised to `https:`. No `url` on menu
  items.
- **`useWikitabSearch.ts`** — debounced input (200ms), `AbortController`
  cancellation, maps results to `MenuItemData` for `CdxMenu`.
- **Panel** — first menu row is the `Search for "…"` item (custom menu slot,
  text only, no thumbnail; shows the raw input inside the quotes including
  whitespace; `&nbsp;` before the opening quote so that space cannot collapse);
  then thumbnail + title + description rows. Dropdown width matches the input
  wrapper only (not the Search button). When open,
  `.wikitab__hero:has(.wikitab-search--expanded)` gets `z-index: 10` so the
  menu covers feed card link overlays (`z-index: 2`). Keyboard handling matches
  `CdxTypeaheadSearch`: arrow keys navigate the menu, but **Space** is left to
  the input (never delegated to `CdxMenu`).
- **Navigation** — submit, the `Search for "…"` row, or a lookahead result
  pushes `?search=…` on the same `/wikitab` route (result rows use the matched
  title). Clearing the input and submitting removes `search` from the query.

## Search results (`?search=`)

When `?search=` is present, the daily feed is hidden and
`WikitabSearchPage.vue` renders below the hero (tighter desktop padding than the
home feed). The feed orchestrator is skipped while search mode is active.

**Tabs** — quiet `CdxTabs` with four labels: Articles, Images, Activity,
Contribute. **Articles** and **Activity** have content. **Images** and
**Contribute** are empty (no placeholder copy). Active tab syncs to
`?tab=` (`articles` | `images` | `activity` | `contribute`); omitted means
Articles. Tab clicks **push** browser history so Back/Forward walks tab
selections. Submitting a new search clears `tab` (lands on Articles).
`useWikitabSearchTab.ts` owns URL ↔ state sync.

**Tab cache** — Articles and Activity results stay in composable memory for
the search session. Switching tabs does not refetch or show skeletons again;
Activity aborts in-flight requests when hidden but keeps resolved slots and
feed state. Query change resets both tabs.

**Loading cards** — `WikitabSearchLoadingCard.vue` is the shared search-result
placeholder. Variants: `article` (96px thumbnail stub) and `activity` (no
thumbnail column). Use these heavily while API work resolves — especially on
Activity, where edits stream in one at a time.

**Articles tab** — `WikitabSearchResultCard.vue` per hit:

1. Resolve the query to a seed title via REST title search (`limit: 1`).
2. **Top hit** — Action API page props for the resolved title (description, lead
   extract, thumbnail). Supporting row: `cdxIconSuccess` + "Exact match" when
   the query matches the title (case-insensitive), otherwise "Nearest match"
   (`cdxIconSearch`).
3. **Related** — Action API `generator=search` with
   `gsrsearch=morelike:{seedTitle}`, paginated via `gsroffset`. Supporting row:
   `cdxIconLink` + `Related to {seedTitle}`. Seed pageid is deduped from
   related batches.

Only the **h3 title link** navigates to the English Wikipedia article page
(`articleUrl`); the card itself is not tappable. Infinite scroll uses
`useInfiniteScroll.ts` (viewport sentinel) + `useWikitabSearchResults.ts`
(`loadMore` guarded while a batch is in flight). Initial load shows
`WikitabSearchLoadingCard variant="article"` placeholders; no error/empty
placeholder text when the query resolves to nothing.

Implementation: `data/fetchWikitabSearchArticles.ts`,
`useWikitabSearchResults.ts`, `WikitabSearchPage.vue`,
`WikitabSearchResultCard.vue`.

**Activity tab** — merged edit feed scoped to the search query's **top 6
articles** (seed + related via `fetchWikitabSearchTopTitles`). Reuses those
titles from the Articles tab when already loaded. Edits from all six pages merge
into one **newest-first** list; infinite scroll pages backward through revision
history on those titles.

Rate-limit contract (mandatory):

- All requests via `fetchWikimedia` (host queue + backoff).
- **One resolved card per fetch cycle** — never dump a full parallel batch into
  the UI.
- Queue refill uses `mapWithConcurrency(…, 2)` per-title revision fetches,
  `rvlimit=5`, only when the internal merge queue is empty.
- One batch call for latest revid per title (Latest chip).
- Tab fetch starts only when Activity is selected (`enabled` ref); abort
  in-flight work when hidden or on query change, but keep resolved results in
  memory when switching tabs.

UI: slot list mixing `WikitabSearchLoadingCard variant="activity"` and
`WikitabSearchActivityCard`. Cards are borderless like Articles but **no
thumbnail**; chip row uses `CdxInfoChip` (API-derived **Latest** /
**Reverted** only). Links go to the en.wikipedia.org diff. Chips sit above the
page title; supporting row is editor + relative time.

Implementation: `data/fetchWikitabSearchActivity.ts`,
`useWikitabSearchActivity.ts`, `WikitabSearchActivityCard.vue`,
`WikitabSearchLoadingCard.vue`.

## What's inert

"About {section}" is inert; its menu row clears its selection without acting.

The `…` menu is a single `CdxMenuButton` — its `footer` prop renders the
separated "About …" row, and the 2px ring on the open trigger is the underlying
ToggleButton's toggled state, not hand-written CSS. Positioning is left to
Codex's floating logic, which handles desktop (start-anchored, overflowing the
column) and mobile (end-aligned to stay on screen) without per-skin CSS.
