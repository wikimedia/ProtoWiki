# Buttons & action elements

Canonical docs: <https://doc.wikimedia.org/codex/latest/components/demos/button.html>

## CdxButton

The button. Almost every action surface uses one.

```vue
<CdxButton action="progressive" weight="primary" @click="onClick">
  <CdxIcon :icon="cdxIconEdit" />
  Edit
</CdxButton>
```

| Prop | Values | Default |
| --- | --- | --- |
| `action` | `default` / `progressive` / `destructive` | `default` |
| `weight` | `normal` / `primary` / `quiet` | `normal` |
| `size` | `medium` / `large` | `medium` |
| `disabled` | boolean | `false` |
| `type` | `button` / `submit` / `reset` | `button` |

Picking action / weight:

- `default` `normal` — neutral (Cancel, secondary).
- `progressive` `primary` — main forward action (Publish, Save).
- `destructive` `primary` — destructive (Delete, Discard).
- `quiet` `normal` — toolbar buttons, icon-only buttons.
- `progressive` `quiet` — link-style action button.

Slot: default (label + optional `<CdxIcon>`).

## CdxButtonGroup

A horizontal group of related buttons. Pass an array of button descriptors.

```vue
<CdxButtonGroup
  :buttons="[
    { value: 'cancel', label: 'Cancel' },
    { value: 'save', label: 'Save', action: 'progressive' },
  ]"
  @click="(v) => handle(v)"
/>
```

Use this for tightly grouped, mutually exclusive actions.

## CdxToggleButton

A button that toggles between pressed / unpressed.

```vue
<CdxToggleButton v-model="isBold">
  <CdxIcon :icon="cdxIconBold" />
</CdxToggleButton>
```

## CdxToggleButtonGroup

Like a segmented control — radio-style group of toggle buttons.

```vue
<CdxToggleButtonGroup
  v-model="alignment"
  :buttons="[
    { value: 'left', icon: cdxIconAlignLeft },
    { value: 'center', icon: cdxIconAlignCenter },
    { value: 'right', icon: cdxIconAlignRight },
  ]"
/>
```

## CdxToggleSwitch

For "on/off" boolean state.

```vue
<CdxToggleSwitch v-model="darkMode">
  Dark mode
</CdxToggleSwitch>
```

## CdxIcon

Render an SVG icon from `@wikimedia/codex-icons` (or a custom icon
descriptor).

```vue
<CdxIcon :icon="cdxIconSearch" :size="'medium'" />
```

| Prop | Values |
| --- | --- |
| `icon` | required: an icon import or icon descriptor |
| `size` | `xx-small` / `x-small` / `small` / `medium` (default) |
| `iconLabel` | accessible label when used standalone |
| `dir` | `ltr` / `rtl` (auto-flips bidi-aware icons) |
| `langCode` | for langCodeMap-aware icons (e.g., bold-x icons) |

## CdxInfoChip

A small status pill.

```vue
<CdxInfoChip status="warning" :icon="cdxIconAlert">Pending</CdxInfoChip>
```

| Prop | Values | Default |
| --- | --- | --- |
| `status` | `notice` / `warning` / `error` / `success` | `notice` |
| `icon` | optional icon descriptor | (status default) |

## CdxThumbnail

Circular / square image with placeholder fallback.

```vue
<CdxThumbnail :thumbnail="{ url: '…', width: 80, height: 80 }" :placeholder-icon="cdxIconImage" />
```

## When to *not* use CdxButton

- For a navigation link, use `<a>` (or `<RouterLink>`) styled with
  Codex tokens. Buttons aren't links — accessibility tools rely on the
  difference.
- For an "in-text link", just use a regular `<a>`. The base CSS already
  styles links with `--color-progressive`.

For the *design* rules — links vs buttons, button hierarchy/order/
spacing, when to use a disabled button — see
[`codex-style-guide` → links and buttons](../../codex-style-guide/references/links-and-buttons.md).
