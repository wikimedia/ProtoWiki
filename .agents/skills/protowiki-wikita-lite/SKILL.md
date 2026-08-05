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

| Path | Role |
| --- | --- |
| `src/prototypes/wikita-lite/index.vue` | Route entry; provides save feedback |
| `src/prototypes/wikita-lite/WikitaLiteHome.vue` | Tabbed home (Home / Explore / Contribute) |
| `src/prototypes/wikita-lite/modules/` | Feed modules (`FeaturedModule`, `TrendingModule`, …) |
| `src/prototypes/wikita-lite/composables/useWikitaLiteHome.ts` | Thin wrapper over `useMusicalGroupHome` |
| `src/prototypes/wikita-lite/routes.ts` | Paths, tab labels, module titles |
| `src/prototypes/wikita-lite.*/index.vue` | Standalone subpages (one module each) |

| `src/prototypes/wikita-lite.configure/index.vue` | Fullscreen configure (suggestion toggles) |
| `src/prototypes/wikita-lite.configure.interests/index.vue` | Fullscreen interest picker |
| `src/prototypes/wikita-lite/composables/useWikitaLiteSuggestionPreferences.ts` | Shared prefs + interests version signals |

Subpages use `WikitaLiteShell` + `MobileSubpageHeader` + a module with
`standalone`. Configure flows use `WikitaLiteFullscreenShell` (no chrome).

## Configure + interests

Home / Explore / Contribute tabs are on `/wikita-lite`; a **configure** icon
(`cdxIconConfigure`) sits in the title row beside the greeting. Routes:

- `/wikita-lite/configure` — toggles for saved-page and interest-based
  suggestions; **Edit interests** opens the picker.
- `/wikita-lite/configure/interests` — search + chips + related preview;
  **Done** persists; close (X) discards.

Preferences persist in `localStorage`:

| Key | File |
| --- | --- |
| `wikita-lite-suggestion-prefs` | `musical-group/data/suggestionPreferences.ts` |
| `wikita-lite-interests` | `musical-group/data/interests.ts` |

Suggestion feeds (Further reading, Suggested edits, Mentions) honor the
toggles via `getSuggestionSeeds()` and `suggestionFeedsKey()`. When both
toggles are off and there are no bookmarks, Contribute still falls back to
random seeds per the rules below. **Mentions** require the saved-pages
toggle and at least one bookmark.

Interest-only users (no bookmarks, interests toggle on) see Further reading
and Suggested edits when seeds exist; Home tab suggested-edit previews
follow `suggestionSeedsAvailable`, not raw bookmark count.

## UX rules (mandatory)

### One loading bar per surface

- **Home, Explore, and Contribute tabs** — loading UX is driven by
  `useWikitaLiteTabLoading.ts` in `WikitaLiteHome.vue`:
  - **Empty module** — one bar at the first pending slot in that tab's visual
    module order; bar under the module title.
  - **Refresh with preview cards** — stale cards stay visible; bar in each
    updating module's `#after-cards` slot (above any CTA); multiple modules may
    each show a bar while refreshing.
  - **Hidden shells** — omit a module unless it has preview content or is
    showing its loading bar.
  - No aggregate footer loaders below static sections (e.g. Learn).
- **Standalone subpages** — one `CdxProgressBar` per module, including
  pagination / infinite scroll (OR initial + load-more into one bar).
- **Home preview mode** (`standalone=false`) — modules must **not**
  render their own progress bars; the home panel owns loading.

### Saved empty state (Explore + Saved subpage only)

The **Explore** tab and **`/wikita-lite/saved`** subpage may show an
empty Saved section with instructional copy and an inline bookmark icon
(`SavedModule` — "Use the save icon … on any page to add items.").

Do **not** add similar save-nudging copy elsewhere:

- No CTAs like "Save pages to see…" on Home, Contribute, or other modules.
- Other personalized sections simply **omit** when there is nothing to show.

Save/bookmark **actions on cards** (bookmark icon, "Saved" label) and
post-save toasts are fine.

### Contribute tab without saved pages or suggestion seeds

When there are **no bookmarks** and **no suggestion seeds** (both configure
toggles off, or interests toggle on with an empty interest list), the
**Contribute** tab (not Home) still shows **Suggested edits** and **Review
changes** seeded from random English Wikipedia articles
(`fetchRandomPageItems` in the `musical-group` data layer). The Home tab
does not show those modules until `suggestionSeedsAvailable` is true (saved
pages and/or interests per configure toggles). Still no save prompts — the
modules simply appear when data exists.

Preview results for both modules cache under `contributeRandomCacheKey()`
(daily). Fullscreen subpages restore from that cache so the first card
matches the Contribute tab preview:

- **Suggested edits** — `fetchRandomEditSuggestions` /
  `useWikitaLiteHelpWantedPage`
- **Review changes** — `fetchRandomRecentChanges` /
  `useWikitaLiteRecentActivityPage` (latest revision only per random
  page; no revision-history pagination)

When the user has saved pages, the Review changes subpage keeps
`useActivityFeed` full mode (revision history on saved pages).

**Active discussions** — always fetched; shown on the **Contribute**
tab (and its subpage) even with no saved pages. The **Home** tab still
requires saved pages and visible recent activity before showing the
module.

## Adding a module

1. Create `modules/MyModule.vue` — accept `standalone`, `items`,
   `loading`, `previewLimit`; use `useWikitaLiteCardListClasses`.
2. Add route constant + title in `routes.ts`.
3. Wire preview into `WikitaLiteHome.vue` inside the relevant tab.
4. Optional subpage: `src/prototypes/wikita-lite.my-module/index.vue`.

Follow [`codex-usage`](../codex-usage/SKILL.md) for components and tokens.
