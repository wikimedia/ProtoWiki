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

## WIKITAB wordmark

Hero wordmark: `WikitabWordmark.vue` — static **`wikitab-wordmark`** SVG from
`public/images/wikitab-wordmark.svg` (108×46 viewBox). Update that file when the
Figma export changes.

## The section registry is the source of truth

`sections.ts` holds one `WikitabSectionSpec` per section, and it drives both the
loading contract and the pagination. Change a card size or page size **there**,
never in a component:

| Field           | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `initialCount`  | Slots shown before any paging (4). Desktop renders these 2×2.         |
| `pageSize`      | How many more one reveal adds (6).                                    |
| `primitive`     | Which card primitive the section's cards are (`article`, `snippet`, `discussion`, …). All layout comes from that primitive — see [Card presentation](#card-presentation). |
| `cardHeight`    | Placeholder slot height (px) and row floor — the primitive's row in `wikitabCardSlotHeights.ts`. Real cards grow taller when content needs it; rows equalize via `useEqualRowHeights`. |
| `supportingIcon` | Optional editable glyph the section sets on its primitive (Trending `cdxIconChartLine`, Birthdays `cdxIconCalendar`, Daily reads `cdxIconLink`). Only on primitives that don't pin one. |

`cardHeight` and the primitive's `thumbnailSize` are coupled: a 96px thumbnail needs a 122px card
(96 + 12px padding either side + 1px border), and a 40px one fits a 98px card.
Change one without the other and the thumbnail either clips or floats in space.
Trending and Birthdays use 122/96 thumbnail cards; On this day, Did you know, and In the news use the same 122/96 text-card layout (thumbnail only when one resolves). Active discussions uses a 98px text card with no thumbnail column.

## The no-jump loading contract

This is the point of the prototype, so treat it as load-bearing.

The heading and `…` button paint immediately. Each section then reserves exactly
`initialCount` slots at exactly `cardHeight` — flat
`background-color-neutral-subtle` blocks with **no border** — and "Show more"
renders in `color-disabled`. Each slot then paints **as soon as its own data is
known**, field by field (see [Loading states](#loading-states)).

Four details make it actually not jump. Breaking any one of them reintroduces
shift:

1. **Loading placeholders use exact `cardHeight`,** not `min-height`. Real
   cards use `min-height: cardHeight` and grow with content; `useEqualRowHeights`
   keeps cards in the same row matched to the tallest. Clamped sections
   (Trending, Birthdays) line-clamp title/description; sections without
   `descriptionLineClamp` (On this day, Did you know, In the news) show the full hook.
2. **Optional-thumbnail cards stay whole skeletons until it is known whether they
   have an image** — a thumbnail column appearing after the text painted would
   reflow it. Forced-thumbnail cards paint text immediately and skeleton only the
   (already reserved) image column.
3. **The error state keeps the reserved height** rather than collapsing.
4. **The "Show more" row is always rendered,** even when a section is exhausted
   and the control inside it is gone. Otherwise the sections below shift up the
   moment a short section finishes loading.

`useSectionReveal.ts` expresses the contract per slot:

- `reserved` — how many slots are on screen. Raised **immediately** on reveal.
- `slotLoading(i)` — `true` while slot `i` has no item, `{ thumbnail: true }`
  while its DYK-style thumbnail lookup (`resolveDykThumbnails.ts`, resolved per
  card) is in flight, `false` once complete.
- `slotCard(i)` — the item, carrying any looked-up thumbnail.

There is no page-level "ready" gate: thumbnail **decode** is tracked per card by
`WikitabCard` itself (`useThumbnailSlotReady.ts`, 1.5s cap).

### Loading states

`WikitabCard`'s `loading` prop (`WikitabCardLoading` in `sections.ts`) is the
**only** way to show a skeleton for a `WikitabCard` — there is no separate
skeleton component for it.

| `loading` | Renders |
| --------- | ------- |
| `true` (or no `card` yet) | The flat borderless reserved block at `loadingHeight` (`wikitabCardSlotHeights.ts`; `wikitabCardBindProps` fills it in). |
| `{ description: true }` | The real card; only the description is skeleton lines (`descriptionLineClamp` lines, default 2). |
| `{ title, description, supporting, supportingEnd, thumbnail, chips }` | Any mix — each flagged field is skeletoned, everything else renders from `card`. `supporting` covers the whole supporting row; `supportingEnd` only its trailing `supportingTextEnd`. Description is always two skeleton lines (whatever the clamp); chips are one bar. Menu and overlay link hide while `title` loads. |
| `false` / omitted | The real card. The thumbnail column still skeletons on its own while the image decodes. |

Pass a field flag whenever that field arrives in a **separate fetch** — e.g.
search Activity passes `{ thumbnail: true }` until `prefetchMetadata` patches
thumbnails in. Get as granular as the data allows.

Home modules do this per card. Each keeps its pending fields beside the items
(a `Map` / record replaced on every change so it stays reactive, and listed in
`useEqualRowHeights` `watchKeys`); the section resolves a slot's `loading` from it
and shows the menu whenever `loading !== true`.

| Module | Card appears after | Still loading (flag) |
| ------ | ------------------ | -------------------- |
| Featured | Shells for every kind at once (`featuredSpotlightShell`) | TFA / TFL `{ title, description, thumbnail }`, Word / Quote `{ title, description }`, others `true` (`featuredSpotlightInitialLoading`) until that kind's own fetch lands (`onSpotlight` in `fetchWikitabFeatured`); TFL then keeps `{ description }` for its summary |
| Saved | The snapshot, immediately (`savedModuleDisplayItems`) | Article saves needing a summary: `{ description?, thumbnail? }` (`savedModuleItemPendingLoading`) until `enrichSavedModuleItems` patches that item |
| Daily reads | The morelike hit (no summary wait) | `{ description?, thumbnail? }` while the summary backfill runs (`pendingByKey`) |
| Suggested edits | Quality-check + summary (the summary supplies the `pageid` the key needs) | `{ thumbnail }` during the post-append thumbnail backfill |
| Review changes | The revision row | `{ supporting }` while the editor-kind lookup runs (`editorKindPending`); the **Latest** chip pops in when `prefetchMetadata` lands |

Chips that may not exist (Latest, high revert risk) **pop in** rather than
skeleton. Modules still load **in series**, top to bottom
(`refreshHomeModulesInOrder`): API etiquette asks for serial requests, and
`fetchWikimedia` caps each host at two in flight — granular loading paints
sooner without adding parallel requests.

The strict rule for `thumbnailType: 'optional'`: when `loading.thumbnail` is set
and the card has no `thumbnailUrl` yet, the **whole card** stays a skeleton
(rule 2 above). This lives in `WikitabCard.vue` (`showFullLoading`) — sections
just say what is still loading. **Do not** branch on section id in components;
pick a different `primitive` for the section instead.

| `thumbnailType` (resolved) | Meaning |
| ---------------------- | ------- |
| `force` | Always reserve the column; sets CdxCard `forceThumbnail`. |
| `optional` | Column only when `card.thumbnailUrl` is set. Empty URL ⇒ no column. |
| `none` | Never show a column. |

DYK lookups use `wikitabCardMenuArticleTitle` in `resolveDykThumbnails.ts` when
the hook has no feed thumbnail.

### Feed cards use `CdxCard`

`WikitabCard.vue` is a thin adapter around Codex's `CdxCard` — not a hand-built
border shell. Variant wiring:

| Layout | `CdxCard` props | Link behaviour |
| ------ | --------------- | -------------- |
| Thumbnail + text | `thumbnail`, `force-thumbnail` — never `url` | Full-card overlay `<a class="wikitab-card__link">` to `card.url` so hook HTML can include nested anchors. |
| Text / hook | Same — no `url` on `CdxCard` | Same overlay link when `card.url` is set. |

Stock Codex 2.7 has no `CdxCard` `thumbnailSize` / `thumbnailPosition` props
(and the Gerrit card patch removes them again) — large (96px) thumbnails and
text-variant end placement are layout CSS in `WikitabCard.vue`, keyed off
the primitive's `thumbnailSize`. **Never set `display: block` on the card root** — it overrides
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

When adding a section: pick its `primitive` in `sections.ts` and set only that
primitive's editable fields (e.g. `supportingIcon`). Loading UI follows
automatically.

### Card presentation

**Presentations are primitives only.** Every `WikitabCard` is an instance of one
of the primitives in `data/wikitabCardPrimitiveCatalog.json` — `article`,
`snippet`, `discussion`, `suggestion`, `image`, `word`, `quote`, `list`, `edit`.
`data/wikitabCardPresentation.json` has exactly one row per primitive, keyed by
primitive id, and nothing else. There are no context rows: "Trending",
"Featured quote", "Saved image" or "Search contribute" are not presentations, they
are contexts that *use* a primitive.

| Context | Primitive |
| ------- | --------- |
| Trending, Birthdays, Daily reads, Saved articles, Featured TFA | `article` |
| In the news, Did you know, On this day, unavailable Featured spotlights | `snippet` |
| Active discussions, saved discussions | `discussion` |
| Suggested edits, search Contribute, saved suggestions | `suggestion` |
| Featured TFP / POTD, saved images, search images (playground) | `image` |
| Word of the day, saved words | `word` |
| Quote of the day, saved quotes | `quote` |
| Featured TFL, saved lists | `list` |
| Search Activity, Review changes, saved changes | `edit` |

The mappings live in code: `sections.ts` (`primitive` on each section / module
spec), `featuredPrimitiveForSpotlightKind()` in `wikitabFeaturedSpotlightCard.ts`,
`wikitabSavedItemPrimitive()` in `wikitabSavedItems.ts`, and `primitiveId` on
each `wikitabCardTypeCatalog.json` entry (playground).

#### Field tiers

A primitive splits every `WikitabCard` field into three tiers:

1. **Hardcoded** — fixed by the primitive's presentation row; no context can
   change them.
   - `descriptionFormat`, `titleLineClamp`, `descriptionLineClamp`,
     `thumbnailType`, `thumbnailSize`, `thumbnailLayout` (inline-start = leading
     thumb, inline-end = hook then trailing thumb, block-start = portrait).
   - `supportingIcon` when the row pins one (`discussion` → speech bubbles,
     `suggestion` → lightbulb).
   - Bind props the primitive pins empty: `icon` on `article` / `snippet`,
     `chips` on everything except `edit`.
2. **Inferred** — derived by the primitive's mapper or by the surface; also not
   editable.
   - Discussion supporting row (comment count + latest reply time).
   - Suggestion supporting line (from `task`).
   - Edit editor + time.
   - `menu`, which comes from the surface (feed, saved, search).
3. **Editable** — left open on purpose. Any context (feed section, Featured,
   saved, search, playground) may set these.
   - Payload fields: title, description, url, thumbnail, supporting text / HTML
     when not derived.
   - `supportingIcon` when the row doesn't pin one (Trending's chart line,
     the edit primitive's editor-kind icon).
   - `icon` on `word` / `quote`; `chips` on `edit`; `loading`.

Where each tier is enforced:

- **Hardcoded:** the JSON row. `wikitabCardBindProps(primitive, options)` in
  `data/wikitabCardPresentation.ts` spreads the presentation last so it always
  wins, and in dev **throws** if `options` carries a hardcoded presentation field
  or a `supportingIcon` on a primitive that pins one. To change how a context
  looks, change the primitive (for everyone) or pick a different primitive.
- **Inferred:** the mappers in `wikitabCardPayloadMappers.ts`; the playground
  lists mapper-derived supporting fields in
  `PLAYGROUND_MAPPER_DERIVED_SUPPORTING_FIELD_NAMES` (`wikitabCardTypePlayground.ts`).
- **Editable:** passed through `wikitabCardBindProps` options / payload fields.
  The playground shows them as editable rows; hardcoded and inferred rows are
  read-only.

Production feed sections, Featured, saved slots, search and the **Wikitab card
playground** (`/example-wikitab-card-types`) all bind through
`wikitabCardBindProps()`. Do not add component defaults or duplicate layout
numbers in Vue files. `WikitabCard` requires an explicit `thumbnailLayout` on
every instance.

**Heights are not presentation:** resolved cards hug content; loading
placeholders use exact px heights per primitive from
`data/wikitabCardSlotHeights.ts` (`wikitabReservedSlotHeight(primitive)`, wired
through `sections.ts` `cardHeight` + `useEqualRowHeights` row stretch). Feed
section paging (`initialCount`, headings) stays in `sections.ts`.

### Card data — no hidden behavior

`WikitabCard.vue` renders what it is given: `card`, `supportingIcon`, `icon`,
layout props from `wikitabCardBindProps()`, and nothing else. Do **not** infer
labels, icons, or copy inside the component (no “if this looks like a quote,
default to …”).

- **Payload → card:** `wikitabCardPayloadMappers.ts` maps declared payload fields
  only. Do not inject feed marketing strings (`Quote of the day`, module titles,
  etc.) when a field is empty — fetchers, saved items, and the card playground
  must set `supportingText` / `supportingHtml` explicitly when a row should show.
  Derived supporting lines from other payload fields (e.g. page views, seed title,
  task HTML) are fine; static copy fallbacks are not.
- **Layout / icons:** the primitive's `wikitabCardPresentation.json` row +
  `wikitabCardBindProps()` (e.g. `supportingIcon: cdxIconLightbulb` pinned on the
  `suggestion` primitive); editable icons come from the context (`sections.ts`).
- **Featured feed:** `fetchWikitabFeatured.ts` (and similar) owns module labels
  on the spotlight/card data it builds; mappers stay dumb.
- **Discussion cards:** supporting row is always derived in
  `feedDiscussionPayloadToCardData` / `savedDiscussionPayloadToCardData` from
  `commentCount` (+ `latestReplyTimestamp` or saved relative label). The card
  playground omits editable `supportingText` / `supportingHtml` / `supportingIcon`
  / `supportingTextEnd` on discussion catalogs; speech-bubble icon is pinned by
  the `discussion` primitive in `wikitabCardPresentation.json`.
- **Supporting fields are editable unless derived:** every payload with
  `WikitabCardPayloadSupportingFields` (`supportingText`, `supportingIcon`,
  `supportingHtml`, `supportingTextEnd`) passes them straight through its mapper.
  There is no per-catalog “no supporting row” list. A supporting field is only
  non-editable in the playground when the mapper derives it (discussion: text /
  html / end from comment count + time; suggestion: text / html from `task`; edit:
  editor + time) or presentation pins the icon. Record derived fields in
  `PLAYGROUND_MAPPER_DERIVED_SUPPORTING_FIELD_NAMES` in
  `wikitabCardTypePlayground.ts` when adding one.
- **Playground defaults:** supporting fields default to empty for every catalog.

## Codex-agnostic styling

Wikitab must look identical on stock Codex and follow Codex automatically when
a Codex patch is installed. The general rules, tooling and worked examples
(several from Wikitab) live in
[`protowiki-codex-patching`](../protowiki-codex-patching/SKILL.md). This section
records how Wikitab applies them:

1. **Codex classes before copied visuals.** A hand-built card wears
   `cdx-card cdx-card--is-link` on its root, so Codex's own stylesheet draws
   border, radius, padding, background, hover and active — whatever version is
   installed. The component keeps layout only (`flex-direction`,
   `align-items: stretch`, gap). Used by `WikitabSearchContributeCard`,
   `WikitabSearchImageCard` (which resets
   `padding: 0` and a transparent background). This only works when the card
   root is an ancestor of whatever the pointer hits.
2. **Tokens, never literals that equal a token.** Radius, transition duration,
   touch size (`--min-size-interactive-touch`), 2px spacing (`--spacing-12`),
   border widths and styles — and no hex fallbacks in `var()`. The Default /
   White / Gray / Black / POTD (dark + light) colour-theme swatches read Codex
   token values at build time from `data/codexTokenValues.ts`, so neutral themes
   follow patched neutrals. Both POTD variants share the same featured-feed photo
   layer; ids are `picture-of-the-day` and `picture-of-the-day-light` in
   `data/wikitabColorThemes.ts`.
3. **Shell, not per-component copies.** `wikitab-surface.css` (imported once by
   `index.vue`, global) holds:
   - `--wikitab-card-*` aliases for **wrapper-driven** hover — `WikitabCard`
     and the POTD attribution card, where a sibling overlay link sits above the
     `CdxCard` so Codex's `:hover` never matches. Stock values mirror stock
     `CdxCard`; `html[data-codex-patched]` swaps in the patched mapping
     (progressive border + 1px outline on hover, inset on active, no
     transition). The same `--wikitab-card-transition-duration` drives card ⋯
     menu opacity fades (`--transition-property-fade` +
     `--transition-timing-function-system`). Update both blocks if a future
     patch changes `CdxCard.css`.
   - `.wikitab-surface--subtle` — keeps the historical subtle rest border on
     Contribute / Image cards (stock `CdxCard` uses base; patched uses subtle).
   - `.wikitab-panel` — the full-page overlay shell shared by Configure, Saved
     and Color theme.
   - `--wikitab-menu-font-size-*` / `--wikitab-menu-line-height-*` and
     `--wikitab-menu-color-*` — snapshotted on `.wikitab` and re-applied on every
     `.cdx-menu` and card `*__menu-button` wrapper so compact card-grid type and
     card progressive/subtle remaps do not leak into MenuButton icons or dropdown
     labels; Codex owns icon color (no per-component `.cdx-icon { color: … }` overrides).
   - Thumbnail fill — Wikitab sizes only the `.cdx-thumbnail` root (96px feed
     cards via `--wikitab-thumbnail-size`, 40px search menu). Inner borders are
     zeroed and `.cdx-thumbnail__image` alone is `position: absolute; inset: 0`
     (the placeholder stays a flex child so its icon stays centred). Why:
     [building-for-patches → Thumbnails](../protowiki-codex-patching/references/building-for-patches.md#thumbnails-size-the-root-let-codex-fill).
4. **Deliberate looks stay; structural overrides yield.** Saved filter tabs are
   framed `CdxToggleButton` with layout-only CSS (horizontal scroll,
   outline padding); toggled-on styling follows installed Codex. Themed quiet-button washes and
   themed card accents are Wikitab design and stay on stock and patched.
   Overrides that only exist to flatten stock Codex (the `box-shadow: none` on
   popovers and dialogs in `index.vue`) are gated behind
   `html:not([data-codex-patched])`. Menus always use Codex chrome (stock border
   + shadow; patched 1px outline). Search typeahead hover follows whichever
   Codex is installed (token remaps only, no added background).

Card themed accents work
in both modes because the themed progressive remaps in `index.vue` re-point
`--border-color-progressive` / `--box-shadow-color-progressive--focus`, which
the patched hover reads.

## Pagination

One engine, two triggers:

- **Desktop (finite feed sections)** — "Show more" reveals `min(pageSize,
  remaining)`. Hidden once the day's slice is exhausted; `color-disabled` while a
  page resolves. The `__more` row keeps its min-height so sections below do not
  jump.
- **Desktop (infinite home modules — Daily reads, Suggested edits)** — "Show
  more" is **never hidden** while cards are showing (hidden only on error, or
  Daily reads empty). Disabled only during load; still clickable after
  exhaustion to retry `loadMore()` (recreates the feed via `ensureActiveFeed`).
- **Mobile** — no button. `useRevealOnScrollEnd.ts` observes a sentinel at the
  end of the horizontal scroller (`root` = the scroller, `rootMargin` about one
  card wide) and reveals as it approaches. Finite sections tear down the observer
  when exhausted; infinite modules keep scrolling while cards exist.

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
**Active discussions** is the exception: its slice carries a **5-minute TTL**
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
  Trending → In the news → Did you know → Active discussions → Review changes →
  On this day → Birthdays. No thumbnails, no per-card follow-up fetches.

`data/wikitabHtml.ts` normalises feed HTML. Note the asymmetry it exists for:
`news` stories use relative `./Page_Title` hrefs, which would otherwise resolve
against our own origin, while `dyk` hooks use absolute ones.

## Saved-adjacent home modules

Four home modules sit beside the daily feed — not in `WIKITAB_SECTIONS` or
`useWikitabFeed`. Saved, Daily reads, and Suggested edits use the feed paging
contract (`initialCount` 4 / `pageSize` 6 for Saved and Daily reads; Suggested
edits uses `initialCount` 2 / `pageSize` 4). Default home order
(`WIKITAB_HOME_MODULE_ORDER` / `defaultModuleOrder()`): Trending → Daily reads →
Did you know → In the news → Saved → Suggested edits → Active discussions →
Review changes → On this day → Birthdays. All appear in Configure and support
pin / hide / drag reorder.

**Configure module order** — `WikitabConfigureModuleList.vue` (ported from
wikita-lite) renders a quiet `cdxIconDraggableVertical` handle left of each
toggle row. Pointer drag uses transform-based row sliding; keyboard
ArrowUp/ArrowDown moves one slot. Order persists in `WikitabConfig.moduleOrderIds`
via `useWikitabModuleOrder.ts` (`resolveModuleOrder`, cross-tab `storage` sync).
Home display and load order use `buildEffectiveHomeOrder(pinnedIds, resolvedOrder)`
— pinning still pulls modules to the top; custom order applies to unpinned slots.

**Saving** — typed entries in `wikitab-config-v3` (`data/wikitabConfig.ts`
→ `savedItems: WikitabSavedItem[]`). No cross-source dedup — Unsave only when
that item's own id is saved.

| Type | Sources | Stable id |
| ---- | ------- | --------- |
| **Article** | Trending, Birthdays, Search, Daily reads, Featured TFA, OTD (**linked article**) | Per-source (`search:{titleKey}`, `featured:tfa`, …) |
| **Snippet** | DYK, In the news — the hook HTML itself (`snippetHtml`), rendered with `primitive-snippet` | `snippet:{dyk\|news}:{hash of hook text}` |
| **Word** | Featured WOTD | `word:{titleKey}` |
| **Quote** | Featured QOTD | `quote:{titleKey}` |
| **List** | Featured TFL | `list:{titleKey}` |
| **Suggestion** | Suggested edits home, Contribute tab | `suggestion:{pageid}:{need}` |
| **Change** | Review changes home, Activity tab | `change:{revid}` |
| **Discussion** | Active discussions | `discussion:{threadId}` |
| **Image** | Search Images; Featured TFP/POTD (Commons `File:` when resolved) | `image:{pageid}` or `image:featured:tfp` / `image:featured:potd` |

**Seed articles** — `articleTitleKey` / `articleTitle` are identity (dedupe,
hide filter, exclusions), not "the article". A word's key is the word, an
image's is its `File:` title. What drives Daily reads, Suggested edits and
Review changes is the optional **`seedArticle`** (`{ title, titleKey, via }`,
`data/wikitabSeedArticle.ts`). It is resolved **when the card is fetched** and
set on `WikitabCardData` / `WikitabFeaturedSpotlight` / `WikitabSearchImage`.
`buildSaved*` copies it onto the saved item, so saving never fetches. Only
mainspace enwiki titles seed (`seedArticle()` returns `undefined` otherwise).

| Saved from | `seedArticle` source | `via` |
| ---------- | -------------------- | ----- |
| Trending, Birthdays, Search, Daily reads, TFA, TFL | The article / list itself | `self` |
| DYK, In the news (saved as **Snippet**), OTD (saved as Article) | Bold link (`primaryLinkTitle`) — set in `fetchDailyFeed.ts` / `fetchMainPageOtd.ts` | `hook-link` |
| Suggestion | The article | `self` |
| Change | The edited page | `edited-page` |
| TFP | Bold link in the `#mp-tfp` caption | `caption-link` |
| POTD | First enwiki link in the Commons caption (bold first), else none | `caption-link` |
| QOTD | Author's Wikiquote page → Wikidata `wbgetentities` → enwiki sitelink | `quote-author` |
| WOTD | Entry's English "Wikipedia has an article on" box (`.sister-wikipedia b[lang="en"]`), else none | `wiktionary-sister` |
| Search Images | The query's exact title match, else the nearest (`resolveWikitabSearchTitleHits`, disambiguation-filtered), else none | `search-query` |
| Discussion | Never | — |

No free-text search fallback — a wrong seed shows a nonsensical "Related to X"
card. `savedItemSeedArticle()` reads `seedArticle` on the item (backfilled on load
for old rows by `data/wikitabStorageMigration.ts`). **Saved edits never show a
thumbnail** — `WikitabSavedChangeItem` has no `thumbnailUrl` and
`WikitabSavedItemSlot` passes `showThumbnail: false`, matching the Review changes
module. `savedAt` sorts the list (most recent first) but is **not shown** on cards.
Old localStorage shapes (v1/v2 config keys, renamed fields, pre-typed snippets) are
upgraded once per load in **`wikitabStorageMigration.ts`** — the only place that
knows legacy data. Helpers: `data/savedCardHelpers.ts`, `data/wikitabSavedItems.ts`,
`data/wikitabSavedIcons.ts`; composable: `useWikitabSavedArticles.ts`.

**Saved** (`saved`) — home feed cards and the Saved overlay panel come from a
**snapshot** (`savedModuleItems` in `index.vue`), not live `savedItems`. Renders
each entry through `WikitabSavedItemSlot.vue` with per-type layout: normalized
Article / Discussion cards, Featured-style Word / Quote / List via
`WikitabFeaturedCard`, Contribute-style Suggestion, Activity-style Change,
Search-style Image (or inline-start caption layout for resolved Featured pictures).
Hidden until a refresh runs (mount, search exit,
overlay close); saving mid-session does not surface the module. Cards paint from
the snapshot at once; Article items missing a thumbnail/description get REST
summary enrichment patched in per item (skeleton fields meanwhile — see
[Loading states](#loading-states)); other types skip enrich. Unsaving every item during the session clears the snapshot immediately.

**Saved type tabs** — when the snapshot contains **two or more** saved types,
`WikitabSavedItemTabs.vue` renders below the heading on both the home Saved module
(`WikitabSavedSection.vue`) and the Saved overlay panel
(`WikitabSavedArticlesPanel.vue`). Labels: **All**, **Articles**, **Snippets**, **Words**,
**Quotes**, **Lists**, **Suggestions**, **Edits** (internal `change`),
**Discussions**, **Images** — only types present are shown, in that order. Uses
framed `CdxToggleButton` per tab (stock Codex selected state). Tab choice is
session-only; card paging (`useSectionReveal` on home, manual `reserved` in the
panel) runs on the filtered list. Helpers: `data/wikitabSavedItemTabs.ts`;
composable: `useWikitabSavedItemTabFilter.ts`.

**Featured** (`featured`) — mixed carousel of six daily **spotlight** cards from
sister wikis (not the same thing as phase-1 **`feed/featured`** in
`fetchDailyFeed.ts`, which only powers Trending / In the news / Did you know).
Module id `featured`; default home order places it after Trending. Paging:
**4 initial slots**, **+6 per reveal** (six spotlights total). Cards use
`WikitabFeaturedCard.vue` with supporting text equal to the spotlight label only
(no project prefix). Failed fetches keep a fixed slot (`unavailable: true`) so
layout does not jump. **Today's featured picture** (`#mp-tfp` on Main Page) and
**Picture of the day** (Wikifeeds `image` / same source as POTD background) are
separate image cards — slots 3–4 in catalog order (`WIKITAB_FEATURED_SPOTLIGHT_KINDS`
in `sections.ts`). By default they use **122px text + inline-start thumbnail** (thumb on the
leading edge; DYK-style inline-end is not used for TFP/POTD). `WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS = false` in
`sections.ts`). Set that flag to `true` to switch TFP/POTD to Codex block-start portrait
cards (`thumbnailLayout: block-start` in `WikitabCard.vue`, full-width **4∶3** thumb).
Sources (`data/fetchWikitabFeatured.ts`, parallel per UTC day):

| Order | Spotlight | Origin |
| ----- | --------- | ------ |
| 1 | Today's featured article | `getFeaturedPayload` → `tfa` |
| 2 | Today's featured list | Dated TFL subpage (list title + thumb); short `description` from REST page summary. If today's subpage is not ready, falls back to the **previous UTC day's** TFL subpage (same pattern as Trending). |
| 3 | Today's featured picture | Main Page `#mp-tfp` (single-row or legacy two-row table), else `Template:POTD/YYYY-MM-DD`, else previous UTC day; links to matching `Template:POTD/…`. |
| 4 | Picture of the day | `getFeaturedPayload` → `image` (Commons POTD caption HTML) |
| 5 | Quote of the day | Wikiquote dated QOTD subpage (parse) |
| 6 | Word of the day | Wiktionary dated WOTD subpage (`#WOTD-rss-description` — first non-empty `<li>`, skipping `mw-empty-elt`); gloss as HTML hook (usage labels italic via `.usage-label-sense`) |

Quote of the day cards omit `descriptionLineClamp` (no line clamp) and link to the dated
`Wikiquote:Quote of the day/{Month}_{day}` page, not the subject article.
Cached under `wikitab-featured-cache-v17` (`data/featuredCache.ts`). Composable:
`useWikitabFeatured.ts`; section: `WikitabFeaturedSection.vue`. **Color of the
day** is reserved for a future spotlight kind — no v1 source.

**Daily reads** (`daily-reads`) — morelike suggestions seeded from up to **four**
**unique seed articles** (`uniqueArticleSeedsFromSavedItems` → each save's `seedArticle`),
picked by a **deterministic daily shuffle** (UTC day + sorted titleKeys → seeded
Fisher-Yates). Hidden when the Saved-module snapshot is empty. Action API `generator=search` with
`gsrsearch=morelike:{title}` per seed (`DailyReadsFeed` in
`data/fetchWikitabDailyReads.ts`); seeds load in parallel but cards resolve **one
at a time** via `takeNext()`. Excludes disambiguation pages, duplicate `pageid`s,
and all saved `articleTitleKey`s. Cards are thumbnail variant with
`supportingText: "Related to {seed title}"`. Cached under
`wikitab-daily-reads-cache-v3` keyed by `{ utcDay, savedFingerprint }`
(`data/dailyReadsCache.ts`).

**Suggested edits** (`suggested-edits`) — edit-opportunity cards from the same
Microtask `POST /quality-check` pipeline as the search **Contribute** tab, seeded
from up to **six unique seed articles** (see [Seed articles](#saved-adjacent-home-modules))
via a separate daily shuffle salt
(`pickSavedArticleSeeds.ts` → `SuggestedEditsFeed` in
`data/fetchWikitabSuggestedEdits.ts`). Morelike expansion skips titles already in
the saved list. Same visibility rules as Daily reads. Paging: **2 initial cards**,
**+4 per reveal**. Cached under `wikitab-suggested-edits-cache-v1`
(`data/suggestedEditsCache.ts`).

**Review changes** (`review-changes`) — edit-revision cards merged from up to two
sources (section ellipsis → **Configure** → full-screen panel, same `wikitab-panel`
chrome as Modules / Color theme):

1. **Saved articles** (toggle on by default) — same Action API revision pipeline as
   the search **Activity** tab (`WikitabSearchActivityFeed`), seeded from up to **six**
   unique Article/Suggestion saves via daily shuffle salt `'review-changes'`.
2. **Recent risky edits** (toggle on by default) — main-namespace `list=recentchanges`
   with **`rcshow=oresreview|!bot|!minor`** (ORES “needs review” in SQL). Cards get
   **Needs review** (`needsReview: true`); **High revert risk** is added only when
   sequential Lift Wing lookup (≥0.9) succeeds — feed is not filtered on revert risk.

`MergedReviewChangesFeed` in `data/fetchWikitabReviewChanges.ts` leads with whichever
source has the newer head edit, then alternates (saved, RC, saved, …); each source stays ordered. Both toggles off → empty module (still visible when not hidden). **Not**
saved-gated — shows with zero saves when Recent risky is on. Settings:
`WikitabConfig.reviewChangesShowSavedEdits` / `reviewChangesShowRecentRiskyEdits`
(`useWikitabReviewChangesSettings.ts`). Paging: **2 initial**, **+4 per reveal**.
Cards via `wikitabCardPropsForSearchActivityItem`. Dismissed revids share
`dismissedActivityRevids` with Activity. Cache: `wikitab-review-changes-cache-v3`
(day + saved fingerprint + settings fingerprint). Composable:
`useWikitabReviewChanges.ts`; section: `WikitabReviewChangesSection.vue`; panel:
`WikitabReviewChangesConfigurePanel.vue`.

**Infinite-module pagination** — Daily reads, Suggested edits, and Review changes
differ from finite feed sections (`WikitabSection`): desktop "Show more" stays
visible while cards are on screen; cached `hasMore: false` only records the last
fetch state and does not remove the control. Clicks after exhaustion still call
`loadMore()`.

A render triggered on mount, search exit, or overlay close refreshes Featured
(when visible), Saved, Daily reads, Suggested edits, and Review changes from the
**same snapshot** (Featured does not use the saved snapshot). Network runs
only on cache miss (saved list or UTC day changed). A full refresh after
save/unsave waits for overlay close, search exit, or a new tab. `?nocache=1`
bypasses caches.

## State and storage

User preferences (`data/wikitabConfig.ts`), feed cache (`data/feedCache.ts`),
feed orchestration phase (`useWikitabFeed` → `feedPhase` +
`isSectionLoading`), and transient reveal counts (`useSectionReveal`) live in
separate layers.
See [references/state-and-storage.md](references/state-and-storage.md) for the
full rules, the one-step **`wikitabStorageMigration.ts`** contract, and how to
add future config fields without over-building a schema.

**Pinning** — pinned sections move to the top. State is
`WikitabConfig.pinnedSectionIds` in localStorage, wired through
`useWikitabPinned.ts` (`togglePin`, `orderSections`, cross-tab `storage`
sync). Pinned ids come first (most recently pinned at the very top), then
unpinned sections in `moduleOrderIds` order (registry default when unset).
Pinned sections show `cdxIconPushPin`
beside the heading; the ellipsis menu toggles "Pin to top" / "Unpin from top".
Pinning reorders by `spec.id` and does not affect the no-jump loading contract.

The full daily feed (featured + Active discussions + Main Page OTD + births) is
cached under a UTC-day key; ordered per-section loading reads and writes through
the same cache, with one in-session `feed/featured` request shared across
Trending / News / DYK on a cache miss. **Active discussions** refetches when its
5-minute TTL expires — other slices still hit the day cache. Stale discussions
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
  then thumbnail + title + description rows. The menu panel lives in Codex's
  `.cdx-search-input__input-wrapper` slot — **input width only**, not the end
  button (same as `CdxTypeaheadSearch`). `WikitabSearch.vue` wears
  `cdx-typeahead-search` / `cdx-typeahead-search__menu` classes and imports
  `CdxTypeaheadSearch.css`. Popover thumbnails request 120px Commons variants
  (`wikimediaThumbnailAtLeast` in `fetchWikitabSearch.ts`).   The 40×40 menu slot
  size lives in `wikitab-surface.css` (not scoped `WikitabSearch` CSS — CdxMenu
  does not carry the parent scope id). On colorful themes,
  `WikitabSearch.vue` remaps menu progressive tokens to
  `--wikitab-theme-card-progressive*` (the white search island’s `data-theme`
  would otherwise reset hover to Codex blue). Stock `--highlighted` rows keep
  Codex’s interactive-subtle wash via `--background-color-interactive-subtle--hover`;
  patched rows are text-only progressive — no extra bg. Stock: panel draws
  the frame. Patched: panel is positioning-only; menu keeps Codex's 1px outline.
  When open,
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

**Loading cards** — tabs whose results are `WikitabCard`s (Activity, Contribute)
skeleton with `WikitabCard`'s own `loading` prop (see
[Loading states](#loading-states)); bind props via
`wikitabCardBindProps(catalogId, { loading: true })`. Articles and Images use
other card components, so they keep `WikitabSearchLoadingCard.vue` — variants
`article` (96px thumbnail stub) and `image` (borderless aspect-ratio skeleton
tile). Use skeletons heavily while API work resolves — especially on Activity
and Contribute, where cards stream in one at a time.

**Articles tab** — `WikitabSearchResultCard.vue` per hit. Description, extract, and
supporting rows wear Codex card text classes (`.cdx-card__text`,
`.cdx-card__text__description`, `.cdx-card__text__supporting-text`) so body
colour follows installed `CdxCard.css` (`--color-subtle` on stock,
`--color-base` on patched) — no hardcoded subtle. Title stays a progressive
link. One flat list built in priority order from four sources (global `pageid`
dedupe — earlier slots win):

| Cap | Source | Relation |
| --- | ------ | -------- |
| 1 | REST `search/title` | `exact` |
| 1 | REST `search/title` | `near` — **only when there is no exact match** |
| 1 | Action `generator=search` `gsrsearch={query}` (unquoted) + `gsrprop=snippet` | `match` — CirrusSearch snippet (~200–300 chars, not configurable) with hits in **bold**; `…` prepended/appended when the fragment starts mid-article or ends mid-sentence |
| remainder | Action `morelike:{seed}` (top curated hit only) | `related` |

**Supporting row** (all cards) — split row from the [Attribution API](https://www.mediawiki.org/wiki/Attribution_API) via `useWikitabSearchArticleAttribution.ts` (module cache keyed by title; fetches through `fetchWikimedia`):

- **Start:** `cdxIconChartLine` + compact page-view count (`trust_and_relevance.page_views`, last 30 days) and `cdxIconReference` + reference count (`trust_and_relevance.reference_count`), 16px apart.
- **End:** relative last update (`formatWikitabRelativeTime` on `trust_and_relevance.last_updated`).
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
loading block. Never gate rendering on image decode — feed cards follow the same
rule.

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
- **Styling** — `cdx-card cdx-card--is-link` plus `.wikitab-surface--subtle`
  (see [Codex-agnostic styling](#codex-agnostic-styling)): subtle rest border,
  Codex radius and hover/active. Card root uses `border-radius:
  var(--border-radius-base)`; the photo frame clips with the **inset** radius
  `calc(var(--border-radius-base) - var(--border-width-base))` so flush media
  meets the inner edge of the card border without corner slivers. The frame
  keeps the API `width / height` as CSS `aspect-ratio` through decode so tile
  height stays stable; the img fills at `width: 100%`, `height: auto`.
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
- **Card menu** — top-right `CdxMenuButton` (`cdxIconEllipsis`, quiet) exposes
  **Save / Unsave** (`image:{pageid}` in `savedItems`) and **Hide**
  (`hiddenCommonsImagePageIds` — separate from save). License/artist overlay in
  the bottom-left uses `formatImageAttribution()` from
  `fetchWikitabSearchImages.ts` (same string as saved Image supporting text).

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

1. **Initial** — `WikitabCard` with `loading: true` while titles / the first
   revision batch resolve (`loading`, or `fillingInitial` before the first card).
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
While `metadataPending`, cards without a thumbnail get `loading: { thumbnail: true }`
— edit cards are `thumbnailType: 'optional'`, so they stay whole skeletons until
it is known whether a thumbnail column appears. Revert-risk chips are **not**
skeletoned: most edits never get one.

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
  `list=users&usprop=groups` lookup (`bot` / `temp` groups). Home Review changes
  passes `deferEditorKind` instead: the card paints with `{ supporting: true }`
  and `resolveEditorKind` patches it (one lookup at a time).
- After `prefetchMetadata`, `isLatestRevision(item)` re-patches the **Latest** chip
  on cards mapped before the latest revids arrived.
- Tab fetch starts only when Activity is selected (`enabled` ref); abort
  in-flight work when hidden or on query change, but keep resolved results in
  memory when switching tabs.

UI: resolved `WikitabCard` rows (the `edit` primitive) plus activity skeleton phases
above. Edit cards use `CdxCard` inside `WikitabCard` (chips in a full-width row above the
stock thumbnail + text row). Unlike Articles tab
cards, which are borderless. Activity skeletons (here and in home Review changes) use
`WikitabCard` loading bind props; resolved edit cards show an optional
96px inline-start thumbnail when `thumbnailUrl` is present. Description block: green **+n** / red **−n** character delta (from revision `size`
vs parent), or subtle **±0** when size is unchanged, on its own line above the edit
summary when the parent size is known. Chip row uses `CdxInfoChip` (in order): **High revert risk** (Lift Wing
`revertrisk-language-agnostic`, ≥0.9; background per card, in-memory cache by
`revid`), **Needs review** (ORES `oresreview` rows in Review changes only), else
**Latest revision** when not high-risk and not needs-review (from latest-revid
prefetch), and **Reverted** (`mw-reverted` tag). Multiple chips may appear on one card.
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
`useWikitabDismissedActivity.ts`, `data/wikitabSearchActivityWikitabCard.ts`,
`WikitabCard.vue`.

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
- **Progressive load** — same skeleton phases as Activity (`WikitabCard` with
  `loading: true`, `search-contribute` bind props): initial three skeletons → one resolved card per `takeNext()` → tail skeletons
  while filling → load-more skeletons on infinite scroll.
- **Rate-limit contract** — Wikipedia requests via `fetchWikimedia`; Microtask
  POST via `fetchWithTimeout` (not queued). **One resolved card per fetch cycle.**
  Quality-check results and built cards are cached per page as each card resolves
  (indefinite in-memory cache keyed by `pageid` / title; `'none'` for misses).
  Summary responses are cached per title in `fetchWikitabPageSummary.ts`. Tab
  fetch starts only when Contribute is selected; abort when hidden or on query
  change, but keep resolved results when switching tabs.

UI: `WikitabSearchContributeCard.vue` — bordered card (`cdx-card` classes +
`.wikitab-surface--subtle`), 96px
left thumbnail with thumbnail-slot loading, article title, task body, supporting
row with progressive task icon + label at row start and **Related to {seed}** at
row end when from morelike. Whole card links to Visual Editor
(`visualEditorUrl()` in `wikitabHtml.ts`).

Implementation: `data/fetchWikitabSearchContribute.ts`,
`data/fetchWikitabPageSummary.ts`, `data/editOpportunityCopy.ts`,
`data/editOpportunityIcons.ts`,
`useWikitabSearchContribute.ts`, `WikitabSearchContributeCard.vue`.

## What's inert

"About {section}" is inert; its menu row clears its selection without acting.

The `…` menu is a single `CdxMenuButton` — its `footer` prop renders the
separated "About …" row, and the 2px ring on the open trigger is the underlying
ToggleButton's toggled state, not hand-written CSS. Positioning is left to
Codex's floating logic, which handles desktop (start-anchored, overflowing the
column) and mobile (end-aligned to stay on screen) without per-skin CSS.
