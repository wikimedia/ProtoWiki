---
name: protowiki-wikitab
description: The Wikitab new-tab prototype — its section registry, the reserved-slot "no-jump" loading contract that keeps the layout perfectly still, the shared reveal-more engine (desktop Show more button vs mobile continuous scroll), the single feed/featured request behind all three sections, and the URL-for-state / localStorage-for-cache rule. Use when editing src/prototypes/wikitab/, adding a section, changing card sizes, or debugging layout shift or paging there.
---

# ProtoWiki — Wikitab

Route `/wikitab`. A bare, responsive new-tab page: serif wordmark, a search
input, and three feed sections. Logged-out only, `platform: 'web'`.

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
| `cardHeight`    | Exact px height. **Placeholder and real card must match.**            |
| `variant`       | `thumbnail` (Trending — always shows thumbnail; thumbnail-slot loading) or `text` (DYK/news — optional thumbnail; full-card loading). See [Loading modes](#loading-modes). |
| `thumbnailSize` | Thumbnail edge in px. Must fit inside `cardHeight`.                   |

`cardHeight` and `thumbnailSize` are coupled: a 96px thumbnail needs a 122px card
(96 + 12px padding either side + 1px border), and a 40px one fits a 98px card.
Change one without the other and the thumbnail either clips or floats in space.
Trending, Did you know, and In the news are all 122/96 when a thumbnail is shown.

## The no-jump loading contract

This is the point of the prototype, so treat it as load-bearing.

The heading and `…` button paint immediately. Each section then reserves exactly
`initialCount` slots at exactly `cardHeight` — flat
`background-color-neutral-subtle` blocks with **no border** — and "Show more"
renders in `color-disabled`. How a slot looks while its page resolves depends
on the section's **`variant`** in `sections.ts` (see [Loading modes](#loading-modes)).

Four details make it actually not jump. Breaking any one of them reintroduces
shift:

1. **Card height is fixed, not `min-height`,** and titles / descriptions /
   hooks are line-clamped so long text cannot grow a card.
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
| `thumbnail` | Trending | Always — every article carries a feed thumbnail | **Thumbnail-slot loading:** card shell + title/description paint as soon as feed data lands; only the image area is a flat `background-color-neutral-subtle` block at `thumbnailSize` (no Codex image icon) until decode finishes. |
| `text` | Did you know, In the news | **Only when a URL resolves** — omit the column entirely if there is no image | **Full-card loading:** the whole slot stays the borderless neutral skeleton until the page is ready. Never show an empty thumbnail column while DYK summaries are fetched or while "no thumbnail" is still being determined. |

Implementation lives in `WikitabCard.vue`: `showFullLoading` for the skeleton,
`showThumbnail` (text variant checks `thumbnailUrl` only, not `thumbnailTitle`).

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
actual list length — never hardcode it. Typically Trending has ~44 items,
Did you know ~9, and In the news ~4 (which exactly fills the initial slots, so
no control ever renders for it).

## One request feeds all three sections

`data/fetchDailyFeed.ts` makes a single call to
`/api/rest_v1/feed/featured/{yyyy}/{mm}/{dd}`:

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
- **Did you know** ← `dyk[]`. Carries only `html`, with no thumbnail and no
  `pages` array. `data/resolveDykThumbnails.ts` pulls the bolded link's title
  out of the HTML and fetches summaries for the **revealed page only**.
- **In the news** ← `news[]`. Each story has `links[]` of full summaries, so
  again no follow-up requests.

`data/wikitabHtml.ts` normalises feed HTML. Note the asymmetry it exists for:
`news` stories use relative `./Page_Title` hrefs, which would otherwise resolve
against our own origin, while `dyk` hooks use absolute ones.

## State and caching

Two rules, and the prototype is built to keep them:

- **The URL holds user config and app state.** Shareable, restorable, no
  migration story. Section pinning uses `?pinned=trending,dyk` (comma-separated
  section ids — see [Pinning](#pinning)).
- **localStorage is cache only.** Nothing in `data/feedCache.ts` is
  authoritative — clearing it must only ever cost a refetch.

Resist building a URL-state schema layer before a feature needs one. The old
wikita-lite prototype had a 772-line `urlStateSchema.ts` encoding every pref up
front; the lesson kept here is the principle, not the framework. Add one param
when a feature needs it, and no earlier.

`feed/featured` is a daily resource and a new-tab page is opened dozens of times
a day, so the day's response is cached under a UTC-day key. One entry means
writing today's feed evicts every older day. `?nocache=1` forces a refetch.

Consequence worth knowing when developing: after the first load of the day you
mostly **won't see** the loading slots. Use `?nocache=1` when working on them.

## Pinning

Pinned sections move to the top of the page. State lives in the URL only — not
localStorage.

- **`pinnedUrl.ts`** — reads and writes `?pinned=` via `URLSearchParams` and
  `history.replaceState`. Unknown and duplicate ids are dropped on parse.
- **`useWikitabPinned.ts`** — reactive pin list, `togglePin()` (prepends on
  pin, removes on unpin), `orderSections()` for render order, and a `popstate`
  listener so back/forward restores pin state.

**Ordering:** pinned ids first, in URL list order (most recently pinned is
prepended, so it sits at the very top), then unpinned sections in registry
order from `sections.ts`.

**UI:** pinned sections show `cdxIconPushPin` beside the heading. The ellipsis
menu switches between "Pin to top" and "Unpin from top" using the same icon.
Pinning reorders sections keyed by `spec.id` and does not affect the no-jump
loading contract.

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
- **Panel** — first menu row is the inert `Search for "…"` item (custom menu
  slot, text only, no thumbnail; shows the raw input inside the quotes
  including whitespace; `&nbsp;` before the opening quote so that space cannot
  collapse); then thumbnail + title + description rows. Dropdown
  width matches the input wrapper only (not the Search button). When open,
  `.wikitab__hero:has(.wikitab-search--expanded)` gets `z-index: 10` so the
  menu covers feed card link overlays (`z-index: 2`). Keyboard handling matches
  `CdxTypeaheadSearch`: arrow keys navigate the menu, but **Space** is left to
  the input (never delegated to `CdxMenu`).

## What's inert

Search **shows live lookahead** but **does not navigate** — clicking a result,
pressing Enter, or clicking Search is a no-op for now. "About {section}" is also
inert; its menu row clears its selection without acting.

The `…` menu is a single `CdxMenuButton` — its `footer` prop renders the
separated "About …" row, and the 2px ring on the open trigger is the underlying
ToggleButton's toggled state, not hand-written CSS. Positioning is left to
Codex's floating logic, which handles desktop (start-anchored, overflowing the
column) and mobile (end-aligned to stay on screen) without per-skin CSS.
