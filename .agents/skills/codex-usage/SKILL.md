---
name: codex-usage
description: How to use the Wikimedia Codex design system in any frontend — prefer Codex Vue components over custom DOM, lean on the bundled tokens / icons / base CSS, match Figma designs by reusing the same Codex assets, and know when (rarely) to write per-app CSS. Use when picking UI primitives, importing Codex, asking "should I write custom CSS?", or matching a Figma design with Codex assets.
license: MIT
---

# Codex usage

[Codex](https://doc.wikimedia.org/codex/) is the Wikimedia design
system. The right way to use it in any frontend is to **reach for it
first** — components, then tokens, then icons — and only then write
custom CSS.

## The four-line rule

For any UI surface, in this order:

1. **A Codex component if one exists.** See
   [`codex-components`](../codex-components/SKILL.md). 50+ components ship.
2. **Codex tokens.** Spacing, colour, radii: `var(--cdx-…)` /
   `var(--color-…)` / `var(--spacing-…)` etc. See
   [`codex-tokens`](../codex-tokens/SKILL.md). For **text**, don't pick
   type tokens individually — use one of the **9 canonical text styles**:
   [`codex-typography`](../codex-typography/SKILL.md).
3. **A Codex icon** for any glyph. See
   [`codex-icons`](../codex-icons/SKILL.md).
4. **Custom CSS** only when you're genuinely demonstrating a new style.

When you reach step 4, scope it via a class on your app's root and
prefer `:where(.my-app)` so specificity stays low and Codex tokens keep
cascading.

This rule is about *which primitive* to use. For *what to design and
why* — the design principles, accessibility, bidirectionality, visual
styles, layout patterns, and UI copy — see
[`codex-style-guide`](../codex-style-guide/SKILL.md).

## What ships

- `@wikimedia/codex` — the Vue component library, plus
  `dist/codex.style.css` for the component CSS.
- `@wikimedia/codex-design-tokens` — light + dark CSS custom-property
  files. Both target `:root` by default; rescope to attribute selectors
  if you want per-subtree theme switching.
- `@wikimedia/codex-icons` — import-only, no global CSS needed.

## Importing components

```ts
import { CdxButton, CdxIcon, CdxMessage, CdxField, CdxTextInput } from '@wikimedia/codex'
```

The package is fully tree-shakable — only the components you import end
up in your route's bundle.

```vue
<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconEdit } from '@wikimedia/codex-icons'
</script>

<template>
  <CdxButton action="progressive" weight="primary">
    <CdxIcon :icon="cdxIconEdit" />
    Edit
  </CdxButton>
</template>
```

## Matching Figma designs

Wikimedia design uses the same Codex assets in Figma. Fidelity comes
from **reusing the components**, not from hand-styling. When a Figma frame
has a Codex button, your code should use `CdxButton` — same colour,
same spacing, same focus ring, same dark mode. If the Figma frame uses
`Spacing/100`, use `var(--spacing-100)`.

When the design is brand new and not yet componentized, prefer to express
it in terms of Codex tokens anyway, so the dark theme follows for free.

## When to write custom CSS

Write custom CSS only when:

- You're demonstrating a custom style that doesn't yet exist in Codex
  (e.g., a brand-new component shape).
- You need a subtle layout adjustment that Codex can't express (e.g., a
  particular column ratio).

Even then:

- Use Codex tokens for colour, spacing, radius. Always.
- Scope the styles via a class on the root.
- Don't use `@media (prefers-color-scheme: dark)` if your environment
  already resolves the theme into an attribute (most do — Codex's own
  attribute-driven cascade is the standard pattern).

## Common mistakes to avoid

- **Importing `codex.style.css` more than once.** Once globally is
  enough. Doing it again per route bloats every bundle.
- **Hand-picking hex colours.** Use `var(--color-…)`. Otherwise dark
  mode won't follow.
- **Hand-assembling type** (picking your own font size / weight / family).
  Use one of the 9 canonical text styles — see
  [`codex-tokens` → `typography.md`](../codex-tokens/references/typography.md).
  In a semantic-HTML environment, the matching element already applies the
  right style.
- **Adding ad-hoc CSS for what's already a Codex component.** If a
  toolbar exists, use Codex buttons inside a `role="toolbar"` div
  instead of restyling raw `<button>`s.
- **Importing Less / Sass partials.** The Codex npm package ships plain
  CSS — preprocessor mixins from older MediaWiki bundles aren't needed.

## Wikipedia article-body styling

Codex's component CSS doesn't style `.mw-parser-output` (infoboxes,
hatnotes, navboxes, message boxes, gallery layouts, etc.) — those styles
live in MediaWiki core / skins. If you're rendering article HTML, pull
the live **Wikipedia skin CSS** via the
[`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md) `fetch_skin_css.sh`
recipe rather than hand-rolling those styles.

## References

- [`references/figma-to-codex.md`](references/figma-to-codex.md) — how to
  map Figma layers (Codex/Components, Codex/Tokens) to component imports
  and `var(--…)` references.

## Inside ProtoWiki

ProtoWiki has Codex pre-wired: `@wikimedia/codex/dist/codex.style.css`
is imported once in `src/main.ts`, and the design-token files are
re-scoped at boot to `[data-theme="light"]` / `[data-theme="dark"]` by
`src/lib/theming.ts`. You don't need to add `<link>` tags or import
token CSS yourself. See
[`protowiki-getting-started`](../protowiki-getting-started/SKILL.md) for
the bootstrap, [`protowiki-theme`](../protowiki-theme/SKILL.md) for the
theming cascade (and the `references/css-imports.md` page beside it for
the load order), and [`protowiki-components`](../protowiki-components/SKILL.md)
for the wrappers and prototype-specific components built on top.
