# Dialogs & overlays

## CdxDialog

A modal dialog with title, body, and actions.

```vue
<CdxDialog
  v-model:open="open"
  title="Discard changes?"
  :primary-action="{ label: 'Discard', actionType: 'destructive' }"
  :default-action="{ label: 'Keep editing' }"
  @primary="discard"
  @default="open = false"
>
  All unsaved changes will be lost.
</CdxDialog>
```

| Prop               | Values                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `open`             | controlled via `v-model:open`                                       |
| `title`            | required string                                                     |
| `subtitle`         | optional                                                            |
| `hideTitle`        | hide the title visually                                             |
| `primaryAction`    | `{ label, actionType?: 'progressive' \| 'destructive', disabled? }` |
| `defaultAction`    | `{ label, disabled? }`                                              |
| `closeButtonLabel` | aria-label for ✕                                                    |
| `dismissable`      | allow esc / overlay click to close                                  |

Slots:

- default — body
- `header` — replaces title
- `footer` — replaces action row

Emits `primary`, `default`, `update:open`.

## CdxTooltip

Render a tooltip when hovering / focusing a child. Codex provides this
as a directive _and_ as a component, but the most common form is the
component:

```vue
<CdxTooltip text="Edit this section">
  <CdxButton weight="quiet">
    <CdxIcon :icon="cdxIconEdit" />
  </CdxButton>
</CdxTooltip>
```

Or as a directive:

```vue
<CdxButton v-tooltip="'Edit this section'" weight="quiet" />
```

## CdxMenu

A floating menu — typically anchored to a trigger.

```vue
<CdxMenu v-model:expanded="open" v-model:selected="selected" :menu-items="items" />
```

For most cases you want a button that opens a menu — use:

## CdxMenuButton

A trigger + menu in one component. Use for "more actions" overflow
menus, contextual actions on a row, etc.

```vue
<CdxMenuButton
  v-model:selected="selected"
  :menu-items="[
    { value: 'edit', label: 'Edit', icon: cdxIconEdit },
    { value: 'delete', label: 'Delete', icon: cdxIconTrash },
  ]"
>
  <CdxIcon :icon="cdxIconEllipsis" />
</CdxMenuButton>
```

## CdxPopover

Generic positioned overlay (not a menu). Use for rich popovers, hover
cards, etc. — anything beyond a flat list of options.

```vue
<CdxPopover v-model:open="open" :anchor="anchorRef">
  <slot />
</CdxPopover>
```

## Pattern — confirm before destructive

```vue
<CdxButton action="destructive" weight="primary" @click="confirmOpen = true">
  Delete
</CdxButton>

<CdxDialog
  v-model:open="confirmOpen"
  title="Delete this section?"
  :primary-action="{ label: 'Delete', actionType: 'destructive' }"
  :default-action="{ label: 'Cancel' }"
  @primary="onDelete"
  @default="confirmOpen = false"
>
  This will remove the section and its references.
</CdxDialog>
```

## Pattern — overflow menu

```vue
<CdxMenuButton v-model:selected="action" :menu-items="overflowItems" aria-label="More actions">
  <CdxIcon :icon="cdxIconEllipsis" />
</CdxMenuButton>
```
