# Building for patches — worked examples

Each example is a real case from Wikitab where a prototype failed to follow a
Codex patch, with the fix. The general rules are in [`../SKILL.md`](../SKILL.md).

## Saved filter tabs: lookalike → real component

**Before.** `CdxTabs framed`, plus ~150 lines of scoped CSS recreating framed
small `CdxToggleButton` (padding, border, hover outline, active inset, focus
ring) state by state. The patch changed toggle-button styling, and the tabs
didn't follow.

**After.** One `CdxToggleButton size="small"` per tab inside a
`role="tablist"` row. Wikitab CSS keeps:

- layout (flex row, gap, horizontal scroll, 1px padding so focus outlines
  aren't clipped);
- `font-weight: normal` (the design wants regular weight; Codex buttons are bold);
- the toggled-on colour remapped from progressive blue to
  `--background-color-inverted` / `--color-inverted`, including its hover,
  focus and active states.

Everything else — unselected rest, hover, active, disabled — comes from
whatever Codex is installed. The test: deleting the override block should give
you plain Codex toggle buttons, not broken markup.

## Thumbnails: known upstream gap (deferred)

**Symptom.** Wikitab feed cards size `.cdx-thumbnail` to 96px, but on the current
Gerrit trial the photo can letterbox and the border can look wrong (side bands,
missing edge).

**Cause.** Codex fixes inner `__image` / `__placeholder` at 2.5rem (3rem on card
thumbnails) while Wikitab sizes the root larger. The Gerrit change's transparent
inner-border model does not fully solve fill at non-default sizes.

**Policy.** Do not patch this in `patches/codex/` while trialling the change —
accept border/frame quirks or report on Gerrit. A future local-Codex overlay
workflow may carry ProtoWiki-specific fixes on stock or patched installs.

**Layout (not a patch fix):** Wikitab sets thumbnail *slot* sizes (96px cards,
40px search menu) and `wikitab-surface.css` stretches inners so photos fill
those slots on stock and patched Codex. That fill is normal layout CSS, not a
workaround baked into `patches/codex/`.

## Search menu hover: remap the token, don't add a background

**Symptom.** Typeahead hover was Codex blue on a purple theme. The obvious fix
— a themed `background-color` on highlighted rows — would add a hover wash
that patched Codex deliberately removed.

**Fix.**

- The search island has its own `data-theme`, so page-level remaps don't reach
  it. `WikitabSearch.vue` re-points `--color-progressive*` and
  `--background-color-progressive-subtle*` on `.wikitab-search__menu`.
- Stock `CdxMenuItem` paints highlighted rows with
  `--background-color-interactive-subtle--hover`, so that token is remapped
  under `html:not([data-codex-patched])` only.
- No `background-color` rule exists anywhere. Patched Codex (text tint, no wash)
  and stock Codex (wash) each render their own design in the theme colour.

**Lesson.** "Should this have a hover background?" is answered by the
installed Codex, not the prototype.

## Card hover through an overlay link: the one place gates are needed

`WikitabCard` puts a sibling `<a>` over the `CdxCard` (hooks contain nested
links, which Codex forbids inside a linked card). The pointer is over the
overlay, so Codex's own `.cdx-card:hover` never matches, and the hover must be
reproduced from the wrapper.

`wikitab-surface.css` defines `--wikitab-card-*` aliases: one block mirrors stock
`CdxCard`, and an `html[data-codex-patched]` block mirrors the patched mapping
(progressive border, 1px outline, inset on active, no transition). This is a
copy, so when a patch changes `CdxCard.css`, update the patched block. Prefer
restructuring markup so Codex's own selectors match (rule 2: wear Codex classes
on an ancestor of whatever the pointer hits) whenever that's possible.

## Scoped rules that never matched

A scoped rule `.wikitab-search__menu :deep(.cdx-menu-item__thumbnail)` sized
search thumbnails. It never applied: `.wikitab-search__menu` is the class on
`CdxMenu`'s root, and a child component's root doesn't get the parent's scope
id. The 40px slot rule lives in `wikitab-surface.css` under `.wikitab`.
