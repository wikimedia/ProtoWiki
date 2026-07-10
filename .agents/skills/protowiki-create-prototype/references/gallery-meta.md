# Home gallery metadata

The home gallery (`/`, [`src/prototypes/index.vue`](../../../../src/prototypes/index.vue))
auto-lists every top-level prototype. Listing is driven by flat `definePage` meta on
each `src/prototypes/<name>/index.vue` — no manifest, no router config.

Only **top-level** `index.vue` files appear on the gallery. Nested routes
(e.g. `src/prototypes/template-homepage/help/index.vue`) are registered but not listed.

## Card titles

Set `meta.title` to a **short, unprefixed** name (e.g. `'Chrome'`, `'Event worklist'`).
The gallery prepends the category label automatically:

| `category` | Displayed title |
| --- | --- |
| `prototype` (default) | title as-is |
| `template` | `Template: …` |
| `example` | `Example: …` |

Do not put `Template:` / `Example:` in `meta.title` — if present, the prefix is
stripped before re-applying the label from `category`. Prototype cards use the
plain title with no prefix.

## Human-written copy (agents)

Gallery `title` and `description` are product copy. **Agents must not
AI-generate them.** Two valid paths:

1. **Ask the author** for both strings, then set their exact wording in
   `definePage` meta.
2. **Omit** them — the route still works. When `title` is omitted, the gallery
   derives one from the folder name via `deriveTitleFromPath` in
   [`src/prototype-gallery.ts`](../../../../src/prototype-gallery.ts).
   `description` stays blank until a human adds one.

| Avoid | Do instead |
| --- | --- |
| `'My feature prototype'` (AI-generated) | Ask author, or omit `title` |
| `'One-sentence pitch…'` (AI-generated description) | Ask author, or omit `description` |
| Reuse template copy after copy-paste | Ask for new copy, or omit until provided |
| Omit `title` | OK — gallery uses `deriveTitleFromPath` |

See also [`protowiki-create-prototype` → Gallery copy](../SKILL.md#gallery-copy-never-ai-generated).

## Field reference

| Field | Set on | Values / default | Effect |
| --- | --- | --- | --- |
| `title` | prototype | string | Short name; omitted titles fall back to `deriveTitleFromPath`; `template` / `example` categories get a `Template:` / `Example:` prefix on the card |
| `description` | prototype | string | Card subtitle |
| `category` | prototype | `prototype` \| `template` \| `example` (default `prototype`) | Primary block vs secondary block (below divider) |
| `order` | prototype | number (default: alphabetical) | Sort within block; lower first |
| `hidden` | prototype | boolean (default `false`) | Omit from gallery; route still works |
| `spotlight` | prototype | boolean (default `false`) | When any prototype is spotlighted, gallery shows only spotlighted entries |
| `hidePrimary` | index only | boolean | Hide the prototype block |
| `hideSecondary` | index only | boolean | Hide the template+example block |

TypeScript types are augmented in [`src/route-meta.d.ts`](../../../../src/route-meta.d.ts).
Gallery logic lives in [`src/prototype-gallery.ts`](../../../../src/prototype-gallery.ts)
and [`src/composables/usePrototypeGallery.ts`](../../../../src/composables/usePrototypeGallery.ts).

## Layout

The gallery renders two blocks:

1. **Primary** — `category: 'prototype'` (default when omitted)
2. **Divider** — horizontal rule when both blocks have visible entries
3. **Secondary** — `category: 'template'` or `category: 'example'`, with templates
   before examples, then `order`, then `title`

## Spotlight mode

Like a DAW **solo** button: when **any** visible top-level prototype has `spotlight: true`,
the gallery enters spotlight mode and shows **only** spotlighted entries. Everything else
is hidden without setting `hidden: true` on each card.

- Multiple prototypes can be spotlighted at once
- `hidden: true` still wins — hidden routes never appear, even with `spotlight: true`
- When no prototype is spotlighted, the gallery behaves normally

Use spotlight while actively iterating on one or two prototypes to shrink the gallery
to just what you're working on. Remove `spotlight` (or set `spotlight: false`) when done.

## Examples

### Template starter

```ts
definePage({
  meta: {
    title: 'Chrome',
    description: 'Template for prototypes with a Wikipedia header and footer.',
    category: 'template',
    order: 0,
  },
})
// Gallery card title: "Template: Chrome"
```

### Worked example demo

```ts
definePage({
  meta: {
    title: 'Event worklist',
    description: 'Prototype for an event worklist page, intended for mobile.',
    category: 'example',
  },
})
```

### Feature prototype (default category)

```ts
definePage({
  meta: {
    title: 'Related articles strip',
    description: 'Experiment with a related-articles module below the lead.',
  },
})
```

### Active work — spotlight

```ts
definePage({
  meta: {
    title: 'Attribution (search)',
    description: 'Using the Attribution API in a search scenario.',
    category: 'example',
    spotlight: true,
  },
})
```

### WIP — registered route, not on gallery

```ts
definePage({
  meta: {
    title: 'Attribution experiments',
    hidden: true,
  },
})
```

### Index page layout flags

```ts
// src/prototypes/index.vue
definePage({
  meta: {
    title: 'ProtoWiki',
    description: 'Prototype index',
    hideSecondary: true,
  },
})
```

## Folder naming vs gallery category

Folder names (`template-chrome`, `example-event-worklist`, `my-feature`) set the URL
path. Gallery grouping is **explicit** via `category` — folder prefix is a convention
for humans, not something the gallery infers.
