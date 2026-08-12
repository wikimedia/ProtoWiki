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
| `src/prototypes/wikita-lite.help-wanted.configure/index.vue` | Suggested edits module configure |
| `src/prototypes/wikita-lite.configure.interests/index.vue` | Fullscreen interest picker |
| `src/prototypes/wikita-lite/composables/useWikitaLiteSuggestionPreferences.ts` | Shared prefs + interests version signals |
| `src/prototypes/wikita-lite/composables/useWikitaLiteModuleSuggestionPreferences.ts` | Per-module suggestion overrides |

Subpages use `WikitaLiteShell` + `MobileSubpageHeader` + a module with
`standalone`. Configure flows use `WikitaLiteFullscreenShell` (no chrome).

## Configure + interests

Home / Explore / Contribute tabs are on `/wikita-lite`; a **configure** icon
(`cdxIconConfigure`) sits in the title row beside the greeting. Routes:

- `/wikita-lite/configure` — toggles for saved-page, editing-history, and
  interest-based suggestions; **Add interest** opens the picker.
- `/wikita-lite/configure/interests` — search + chips + related preview;
  **Done** persists; close (X) discards.

Preferences persist in `localStorage`:

| Key | File |
| --- | --- |
| `wikita-lite-suggestion-prefs` | `musical-group/data/suggestionPreferences.ts` |
| `wikita-lite-module-suggestion-prefs` | `wikita-lite/data/moduleSuggestionPreferences.ts` |
| `wikita-lite-interests` | `musical-group/data/interests.ts` |
| `wikita-lite-dismissed-modules` | `wikita-lite/data/moduleDismissals.ts` |

Suggestion feeds (Further reading, Mentions) honor global toggles via
`getSuggestionSeeds()` and `suggestionFeedsKey()`. **Suggested edits**
uses module-effective prefs from `useWikitaLiteModuleSuggestionPreferences`
and `helpWantedFeedsKey()` — it may diverge from global configure when the
module override is active. Seeds can come from saved pages, the active user's
`editedPages` list (ProtoWiki config / real-user impact sync), and/or chosen
interests. When all three toggles are off and there are no bookmarks,
Contribute still falls back to random seeds per the rules below.
**Mentions** require the saved-pages toggle and at least one bookmark.

Users with no bookmarks but editing-history and/or interests enabled see
Further reading and Suggested edits when seeds exist. Home tab
Suggested edits previews follow `suggestedEditsModuleSeedsAvailable` (module
override or global defaults); Further reading still follows global
`suggestionSeedsAvailable`.

### Module dismiss (overflow menus)

When **Module overflow menus** are enabled (chrome hamburger menu), each
module's overflow menu includes **Dismiss**. **Suggested edits** also includes
**Configure**, which opens `/wikita-lite/help-wanted/configure` — the same
three suggestion-source toggles as global configure, prefixed by **Use my
default settings**. When that master toggle is on, the module inherits global
prefs and the underlying options are read-only; when off, overrides apply to
Suggested edits only (Further reading and Mentions stay on global prefs).
Interests remain **module-scoped when overrides are active** — stored in
`wikita-lite-module-suggestion-prefs` alongside module toggles. **Add interest**
on the module configure page opens `/wikita-lite/help-wanted/configure/interests`,
which edits the module list only. When **Use my default settings** is on, the
module inherits global prefs and global interests. Dismissals are **global** — a dismissed module is hidden on every tab where it appears. Dismissed modules
hide immediately and **reappear at 3:00 AM local time**. Users can
**Restore** early from **Configure** (`/wikita-lite/configure`). State
persists in `wikita-lite-dismissed-modules` via
`useWikitaLiteDismissedModules`. Dismissing also clears that module's pin
on every tab.

When overflow menus are enabled, modules that normally navigate via the
clickable title show a footer **Show more …** link instead (Active
discussions, Trending, Further reading, Saved, Mentions). Modules that
already always show a footer CTA (Suggested edits, Translate articles,
Review changes) are unchanged.

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

When there are **no bookmarks** and **no suggestion seeds** (all configure
toggles off, or a toggle on with an empty source list), the **Contribute**
tab (not Home) still shows **Suggested edits** and **Review changes** seeded
from random English Wikipedia articles — unless Suggested edits has module
overrides with available seeds (`suggestedEditsModuleSeedsAvailable`). The
Home tab shows Suggested edits when `suggestedEditsModuleSeedsAvailable` is
true (module override or global configure). Still no save prompts — the
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
