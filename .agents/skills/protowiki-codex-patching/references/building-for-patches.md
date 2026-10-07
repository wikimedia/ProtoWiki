# Building for patches — worked examples

Each example is a production-verified pattern, generalized below. The general
rules are in [`../SKILL.md`](../SKILL.md).

## Where patch-aware CSS lives

Rules that target **Codex child component roots** (e.g. sizing a `CdxMenu`
thumbnail slot) or **define stock/patched alias tokens** belong in an unscoped
surface stylesheet beside the prototype:

```
src/prototypes/my-prototype/
  index.vue                 # import './my-prototype-surface.css'
  my-prototype-surface.css  # selectors under .my-prototype …
  MyCard.vue                # overlay-link hover uses :deep(.cdx-card) + aliases
```

In `index.vue`:

```vue
<script setup lang="ts">
import './my-prototype-surface.css'
</script>

<template>
  <div class="my-prototype">…</div>
</template>
```

Per-component layout and `:deep()` rules that target **direct child** Codex
nodes in the same SFC (e.g. filter tabs) can stay scoped. See saved tabs below.

---

## Saved filter tabs: lookalike → real component

**Before.** `CdxTabs framed`, plus ~150 lines of scoped CSS recreating framed
small `CdxToggleButton` state by state. A patch changed toggle-button styling;
the tabs did not follow.

**After.** One `CdxToggleButton size="small"` per tab inside a
`role="tablist"` row. Layout and the toggled-on remap stay in **scoped** CSS
(`:deep` reaches buttons rendered in the same SFC):

```css
.my-filter-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--spacing-25);
  overflow-x: auto;
  scrollbar-width: none;
  /* Room for hover/focus outline at scrollport edge */
  padding: var(--border-width-base);
}

.my-filter-tabs :deep(.cdx-toggle-button) {
  flex: 0 0 auto;
  font-weight: var(--font-weight-normal);
}

/* Codex uses --toggled-on / --framed, not a generic --is-on class */
.my-filter-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled) {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  border-color: var(--border-color-transparent);
  box-shadow: none;
}

.my-filter-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled:hover),
.my-filter-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled:focus-visible),
.my-filter-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled:active) {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  border-color: var(--border-color-transparent);
}
```

Unselected rest, hover, active, and disabled come from installed Codex.
**Test:** delete the toggled-on block; you should get plain Codex toggle buttons.

---

## Thumbnails: size the root, stretch inners in the surface file

**Symptom.** Cards size `.cdx-thumbnail` to 96px, but photos letterbox or borders
look wrong when trialling a Gerrit change.

**Cause.** Codex fixes inner `__image` / `__placeholder` at 2.5rem (3rem on card
thumbnails) while the prototype sizes the root larger.

**Policy.** Do not patch this in `patches/codex/` while trialling — accept frame
quirks or report on Gerrit.

**Layout** (verified pattern — surface file, not scoped):

```css
.my-prototype .cdx-card__thumbnail.cdx-thumbnail,
.my-prototype .my-search-menu .cdx-menu-item__thumbnail.cdx-thumbnail {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 96px card slot — set on the contexts you use */
.my-prototype .cdx-card__thumbnail.cdx-thumbnail {
  width: 96px;
  height: 96px;
}

/* 40px search-menu slot */
.my-prototype .my-search-menu .cdx-menu-item__thumbnail.cdx-thumbnail {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
}

.my-prototype :is(
  .cdx-card__thumbnail.cdx-thumbnail,
  .my-search-menu .cdx-menu-item__thumbnail.cdx-thumbnail
) :is(.cdx-thumbnail__placeholder, .cdx-thumbnail__image) {
  width: 100%;
  height: 100%;
}

.my-prototype :is(
  .cdx-card__thumbnail.cdx-thumbnail,
  .my-search-menu .cdx-menu-item__thumbnail.cdx-thumbnail
) .cdx-thumbnail__image {
  position: absolute;
  inset: 0;
  object-fit: cover;
}

/* Stock only — patched Codex may change inner border model */
html:not([data-codex-patched]) .my-prototype :is(
  .cdx-card__thumbnail.cdx-thumbnail,
  .my-search-menu .cdx-menu-item__thumbnail.cdx-thumbnail
) :is(.cdx-thumbnail__placeholder, .cdx-thumbnail__image) {
  border: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
  border-radius: var(--border-radius-base);
}
```

Rule 5: size the `.cdx-thumbnail` root; stretch inners — never only the inners.

---

## Search menu hover: remap tokens inside the theme island

**Symptom.** Typeahead hover was Codex blue on a themed page. Adding
`background-color` on highlighted rows would fight a patch that removed the
hover wash.

**Fix.** The search subtree has its own `data-theme`, so page-level remaps do
not reach it. Re-point progressive tokens on the menu wrapper (surface file or
`:global()` in the search SFC when a theme class gates remaps):

```css
.my-prototype__search .my-prototype__search-menu {
  --color-progressive: var(--my-accent);
  --color-progressive--hover: var(--my-accent-hover);
  --color-progressive--active: var(--my-accent-active);
  --background-color-progressive-subtle: var(--my-accent-subtle);
  --background-color-progressive-subtle--hover: var(--my-accent-subtle-hover);
  --background-color-progressive-subtle--active: var(--my-accent-subtle-active);
}

/* Stock: CdxMenuItem --highlighted uses interactive-subtle hover wash */
html:not([data-codex-patched]) .my-prototype__search .my-prototype__search-menu {
  --background-color-interactive-subtle--hover: var(--my-accent-subtle-hover);
}
```

No `background-color` on `.cdx-menu-item`. Patched Codex tints label text;
stock Codex paints the wash — each via its own tokens.

---

## Card hover through an overlay link: aliases + wrapper `:hover`

When hooks carry nested anchors, omit `CdxCard`'s `url` and cover the card with
a sibling overlay `<a>`. The pointer never hits `.cdx-card--is-link`, so hover
must be driven from the **wrapper** (not `:has(.overlay-link:hover)` on a
distant ancestor).

**1. Alias tokens** — surface file, stock block + patched block:

```css
.my-prototype {
  --my-card-border-color: var(--border-color-base);
  --my-card-transition-duration: var(--transition-duration-base);
  --my-card-border-color--hover: var(--border-color-interactive--hover);
  --my-card-box-shadow--hover: none;
  --my-card-border-color--active: var(--border-color-interactive--active);
  --my-card-box-shadow--active: none;
}

html[data-codex-patched] .my-prototype {
  --my-card-border-color: var(--border-color-subtle);
  --my-card-transition-duration: 0s;
  --my-card-border-color--hover: var(--border-color-progressive);
  --my-card-box-shadow--hover: 0 0 0 1px var(--box-shadow-color-progressive--focus);
  --my-card-border-color--active: var(--border-color-progressive);
  --my-card-box-shadow--active: inset 0 0 0 1px var(--box-shadow-color-progressive--focus);
}
```

**2. Wrapper hover** — scoped in the card component; `:deep(.cdx-card)` reads
the aliases (exclude ⋯ menu hover so the card shell stays at rest):

```css
.my-card :deep(.cdx-card) {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: var(--my-card-transition-duration);
}

.my-card:hover:not(:has(.my-card__menu:hover)):not(:has(.my-card__menu:focus-within))
  :deep(.cdx-card) {
  border-color: var(--my-card-border-color--hover);
  box-shadow: var(--my-card-box-shadow--hover);
}

.my-card:active:not(:has(.my-card__menu :active)) :deep(.cdx-card) {
  border-color: var(--my-card-border-color--active);
  box-shadow: var(--my-card-box-shadow--active);
}
```

When `CdxCard.css` changes after a patch, diff the patched alias block against
`node_modules/@wikimedia/codex/dist/…/CdxCard.css` under `npm run codex:use-patch`.

Hand-built cards that **do** wear `cdx-card cdx-card--is-link` with no overlay
skip this entirely — Codex paints hover itself (rule 2 in the main skill).

---

## Scoped rules that never matched

**Before (broken):**

```vue
<style scoped>
.my-search :deep(.cdx-menu-item__thumbnail) {
  width: 40px;
  height: 40px;
}
</style>
```

`.my-search` sits on a parent element, but `CdxMenu`'s root is a **child
component** — it does not carry the parent's scope id, so the rule never applied.

**After:** move the slot rule to `my-prototype-surface.css` (see thumbnails).
Scoped `:deep()` **does** work when the Codex node is a direct child in your
template (saved filter tabs above).
