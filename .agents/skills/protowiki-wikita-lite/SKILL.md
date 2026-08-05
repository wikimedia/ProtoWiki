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

Subpages use `WikitaLiteShell` + `MobileSubpageHeader` + a module with
`standalone`.

## UX rules (mandatory)

### One loading bar per surface

- **Home tab panels** — aggregate all in-flight feeds into a single
  `CdxProgressBar` per tab (`editTabLoading`, `readFeedLoading`,
  `exploreEmptyFeedLoading`, `contributeTabLoading` in `WikitaLiteHome.vue`).
  Never stack multiple progress bars while feeds resolve.
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

## Adding a module

1. Create `modules/MyModule.vue` — accept `standalone`, `items`,
   `loading`, `previewLimit`; use `useWikitaLiteCardListClasses`.
2. Add route constant + title in `routes.ts`.
3. Wire preview into `WikitaLiteHome.vue` inside the relevant tab.
4. Optional subpage: `src/prototypes/wikita-lite.my-module/index.vue`.

Follow [`codex-usage`](../codex-usage/SKILL.md) for components and tokens.
