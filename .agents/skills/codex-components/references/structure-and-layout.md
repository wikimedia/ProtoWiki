# Structure & layout

## CdxCard

Card with title, optional description, optional thumbnail / icon, and
default body slot.

```vue
<CdxCard url="/template-chrome">
  <template #title>Example prototype</template>
  <template #description>An article view + lightweight edit demo.</template>
</CdxCard>
```

The home gallery (`src/prototypes/index.vue`) uses one `CdxCard` per prototype (`#title`, optional `#description` from route `meta`).

| Prop / slot | Use |
| --- | --- |
| `url` | Optional href; if set, the whole card renders as a link |
| `#title` | Card title (slot) |
| `#description` | Secondary text (slot) |
| `thumbnail` | `{ url, width, height }` for a thumbnail image |
| `icon` | icon descriptor (alternative to thumbnail) |
| `forceThumbnail` | render thumbnail container even without an image |

## CdxTable

A data table with sorting, pagination, and selection.

```vue
<CdxTable
  caption="Suggestions"
  :columns="columns"
  :data="rows"
  :paginate="true"
  :show-vertical-borders="false"
/>
```

`columns` is an array of `{ id, label, sortable?, width? }`. `data` is
an array of plain objects, keyed by column id.

For most prototype cases, this is overkill — use `CdxCard` lists or
plain `<ul>`/`<table>` markup styled with tokens. Reach for `CdxTable`
only when sortable / paginated / multi-column rows are explicitly part
of the design.

## CdxTabs / CdxTab

Horizontal tab strip with content panels.

```vue
<CdxTabs v-model:active="activeTab">
  <CdxTab name="article" label="Article">
    <p>Article tab content.</p>
  </CdxTab>
  <CdxTab name="talk" label="Talk">
    <p>Talk tab content.</p>
  </CdxTab>
</CdxTabs>
```

`CdxTabs` props:

- `active` — controlled via `v-model:active` (the active tab's `name`).
- `framed` — boxed look.

`CdxTab` props:

- `name` (required, unique).
- `label` (required, visible label).
- `disabled`.

## CdxBreadcrumbs

A breadcrumb trail.

```vue
<CdxBreadcrumbs
  :breadcrumbs="[
    { label: 'Home', url: '/' },
    { label: 'Africa', url: '/category/africa' },
    { label: 'Mont Blanc' },
  ]"
/>
```

## When to skip these and use CSS

For ad-hoc prototype layouts (one-off article pages, small forms),
plain HTML + Codex tokens (spacing, colour) is usually shorter than
forcing a Codex container. Use the layout components when you need
genuine table semantics, tab semantics, or breadcrumb semantics — i.e.,
when assistive tech relies on the role.

## Content overflow (style guide)

For *how to handle overflow* — wrapping vs ellipsis (+tooltip) vs a
scroll fade — see
[`codex-style-guide` → content overflow](../../codex-style-guide/references/content-overflow.md).
