---
name: codex-icons
description: How to use the Codex icon library (@wikimedia/codex-icons) — import a `cdxIcon…` constant, render it through CdxIcon, and look up the right name in the full icon list (references/icons.md) or the upstream catalogue. Covers bidi-aware icons, the langCodeMap variants (e.g., bold-x), and accessibility. Use when adding a glyph anywhere — toolbar buttons, actions, menus, pills.
license: MIT
---

# Codex icons

The Codex icon library ships separately as `@wikimedia/codex-icons`.
**Use it instead of inline SVG, font icons, or unicode glyphs.**

## Importing

```ts
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconEdit, cdxIconBold, cdxIconLink } from '@wikimedia/codex-icons'
```

Then render through `CdxIcon`:

```vue
<CdxIcon :icon="cdxIconEdit" />
<CdxIcon :icon="cdxIconBold" size="small" />
```

Valid `size` values are `x-small`, `small`, and `medium` (the default).
There is no `large` icon size — for a bigger glyph, size the container
(e.g. a `CdxButton` or a wrapper) rather than the icon.

## Finding an icon

There are hundreds of icons — **look one up, don't guess the name.** Two
sources:

- [`references/icons.md`](references/icons.md) — the full list of
  every importable constant, generated from the installed package. Grep it
  offline instead of opening `node_modules`. It also flags which icons flip
  in RTL, have distinct LTR/RTL glyphs, or vary by `langCode`.
- <https://doc.wikimedia.org/codex/latest/icons/all-icons.html> — the
  canonical catalogue with visual previews, best for finding an icon by
  what it depicts.

To search the installed package directly:

```bash
node -e "const i = require('@wikimedia/codex-icons'); console.log(Object.keys(i).filter(n => /search/i.test(n)))"
```

Always confirm a constant exists in the full list (or the package) before
importing it.

## Naming convention

`cdxIcon` + PascalCase of the icon name. So:

| Icon name | Import |
| --- | --- |
| `edit` | `cdxIconEdit` |
| `link` | `cdxIconLink` |
| `bold` | `cdxIconBold` |
| `bold-x` | `cdxIconBoldX` (langCodeMap-aware) |
| `arrow-next` | `cdxIconArrowNext` (bidi-aware) |
| `reference` | `cdxIconReference` |

## Accessibility

`CdxIcon` doesn't make a button accessible on its own. Two patterns:

```vue
<!-- Inside a button with a label -->
<CdxButton aria-label="Edit">
  <CdxIcon :icon="cdxIconEdit" />
</CdxButton>

<!-- Decorative — paired with visible text -->
<CdxButton>
  <CdxIcon :icon="cdxIconEdit" /> Edit
</CdxButton>
```

For standalone informational icons, set `iconLabel`:

```vue
<CdxIcon :icon="cdxIconAlert" iconLabel="Warning" />
```

## Bidi-aware icons

Some icons (arrows, e.g. `cdxIconArrowNext`) automatically flip in RTL.
You can also pin direction:

```vue
<CdxIcon :icon="cdxIconArrowNext" dir="rtl" />
```

## Lang-code-aware icons

Some icons (e.g. `cdxIconBoldX`) render different glyphs depending on
language. Pass `langCode`:

```vue
<CdxIcon :icon="cdxIconBoldX" langCode="ar" />
```

## Choosing or designing an icon

This skill is the lookup (which constant, how to render). For the *design
principles* — reduce to the essential form, universal not
culturally-specific, neutral, geometric, the 20 dp canvas, RTL
mirroring — see
[`codex-style-guide` → icon design](../codex-style-guide/references/icons.md).

## Custom icons

For an icon that's not in the catalogue, define your own descriptor:

```ts
const myIcon = '<svg viewBox="0 0 20 20">…</svg>'
```

Then `<CdxIcon :icon="myIcon" />`. But — first check the catalogue.
There are hundreds of icons.

## Don't

- Don't paste `<svg>` markup directly into your template. Use `CdxIcon`.
- Don't use emoji as icons in product UI.
- Don't use font-awesome or material-icons. We have our own system.

## Inside ProtoWiki

`@wikimedia/codex-icons` is already a dependency — just import the
constants you need. See
[`protowiki-getting-started`](../protowiki-getting-started/SKILL.md)
for the wider stack.
