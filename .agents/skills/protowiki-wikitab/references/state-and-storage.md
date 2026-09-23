# State and storage

Wikitab splits persistence into three layers. Keep them separate — do not fold
feed cache into user config, and do not persist transient view state.

## Authoritative config (`wikitab-config-v*`)

User preferences for this browser profile live in
[`data/wikitabConfig.ts`](../../../../src/prototypes/wikitab/data/wikitabConfig.ts).

- Storage key: `wikitab-config-v1` (bump the suffix on breaking shape changes)
- API: `loadWikitabConfig()`, `saveWikitabConfig()`, `patchWikitabConfig()`
- Each field is normalized on read and write (unknown section ids dropped, etc.)

**Grow one field at a time.** Add a property to `WikitabConfig`, a default in
`DEFAULT_WIKITAB_CONFIG`, and a line in `normalizeConfig`. Do not pre-build a
wikita-lite-style mega schema — the old prototype's 772-line `urlStateSchema.ts`
is the anti-pattern.

Current fields:

- `pinnedSectionIds` — most recently pinned first
- `hiddenArticleTitleKeys` — normalized article titles hidden from Trending on
  the home feed (`useWikitabHiddenArticles.ts`)
- `dismissedActivityRevids` — Activity-tab revision ids permanently dismissed
  via the card ellipsis menu (`useWikitabDismissedActivity.ts`)

More options (hidden sections, layout prefs, …) land here as features need them.

## Cache-only feed storage (`wikitab-feed-cache-v*`)

[`data/feedCache.ts`](../../../../src/prototypes/wikitab/data/feedCache.ts) caches
today's `feed/featured` response under a UTC-day key. Nothing here is
authoritative — clearing it must only ever cost one refetch.

A new-tab page opens dozens of times a day; caching the daily feed is both fast
and good API etiquette. Writing today's entry evicts older days.

## Transient component state

Revealed page counts (`useSectionReveal`: `reserved` / `ready`) stay in memory
only. A new tab opens fresh every time; persisting scroll/reveal depth would add
complexity with little benefit.

## URL

Wikitab does **not** use the URL for user preferences. A browser new-tab URL is
fixed — pin state would never survive between opens if it lived in query params.

The sole Wikitab-specific URL escape hatch is **`?nocache=1`**, read inline in
`feedCache.ts` to force a feed refetch when developing against the loading
contract.

ProtoWiki-global params (`?theme=`, `?skin=`) are unrelated — they are resolved
onto `<html>` at boot by [`src/theme.ts`](../../../../src/theme.ts) and
[`protowiki-skins`](../protowiki-skins/SKILL.md).

## Legacy migration

On first load, if stored config has empty `pinnedSectionIds` and the URL still
carries `?pinned=trending,dyk`, those ids are imported into config and the param
is stripped via `history.replaceState`.

## Cross-tab sync

`useWikitabPinned.ts`, `useWikitabHiddenArticles.ts`, and
`useWikitabDismissedActivity.ts` listen for the `storage` event on
`WIKITAB_CONFIG_STORAGE_KEY` so pin / hide / dismiss changes in one tab update
open tabs.
