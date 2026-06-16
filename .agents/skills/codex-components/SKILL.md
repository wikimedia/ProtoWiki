---
name: codex-components
description: Catalogue of every Codex Vue component shipped via @wikimedia/codex — what each component is for, the most common props/slots/events, and which ones to reach for in typical Wikipedia UI patterns. Use when you need a button, input, dialog, menu, message, card, tabs, lookup, etc., or when you're picking between similar components ("Lookup vs TypeaheadSearch?").
license: MIT
---

# Codex components

Codex ships 50+ Vue components. They're the building blocks for every
Wikimedia UI. **Use a Codex component before writing any custom one.**

```ts
import { CdxButton, CdxField, CdxTextInput, CdxIcon, CdxMessage } from '@wikimedia/codex'
```

The package is fully tree-shakable — only the components you import end
up in your route bundle.

## Structure of this skill

This SKILL.md is the index. The full per-component prop / slot / event
reference is split across the pages below to keep this page short:

- [`references/buttons-and-actions.md`](references/buttons-and-actions.md)
  — `CdxButton`, `CdxButtonGroup`, `CdxToggleButton`,
  `CdxToggleButtonGroup`, `CdxToggleSwitch`, `CdxIcon`, `CdxInfoChip`,
  `CdxThumbnail`.
- [`references/inputs-and-forms.md`](references/inputs-and-forms.md) —
  `CdxField`, `CdxLabel`, `CdxTextInput`, `CdxTextArea`, `CdxCheckbox`,
  `CdxRadio`, `CdxSelect`, `CdxCombobox`, `CdxLookup`, `CdxSearchInput`,
  `CdxTypeaheadSearch`, `CdxAccordion`.
- [`references/feedback-and-status.md`](references/feedback-and-status.md)
  — `CdxMessage`, `CdxProgressBar`, `CdxProgressIndicator`, `CdxToast`,
  `CdxToastContainer`.
- [`references/dialogs-and-overlays.md`](references/dialogs-and-overlays.md)
  — `CdxDialog`, `CdxTooltip`, `CdxMenu`, `CdxMenuItem`,
  `CdxMenuButton`, `CdxPopover`.
- [`references/structure-and-layout.md`](references/structure-and-layout.md)
  — `CdxCard`, `CdxTable`, `CdxTabs`, `CdxTab`, `CdxBreadcrumbs`.

When in doubt, the canonical docs are at
<https://doc.wikimedia.org/codex/>.

## Pick-the-right-component cheat sheet

| You want | Use |
| --- | --- |
| A button | `CdxButton` |
| A label + helper text + form control | `CdxField` wrapping the control |
| A single-line text input | `CdxTextInput` (or wrap in `CdxField`) |
| A multiline text area | `CdxTextArea` |
| A `<select>` with custom styling | `CdxSelect` |
| Free-form input + suggestions list | `CdxCombobox` |
| Free-form input + suggestions, value can be free text | `CdxLookup` |
| A page-wide search bar with typeahead | `CdxTypeaheadSearch` |
| A toggle ("dark mode on/off") | `CdxToggleSwitch` |
| A pill / segmented selector | `CdxToggleButtonGroup` |
| An informational banner | `CdxMessage` (`type="notice"`) |
| Inline validation message | `CdxMessage` (`type="warning"` / `error`) |
| A loading bar | `CdxProgressBar` (`inline` for thin) |
| A spinning indicator inside a button | `CdxProgressIndicator` |
| A modal | `CdxDialog` |
| A small contextual menu | `CdxMenu` (or `CdxMenuButton` for a trigger + menu) |
| A keyboard-focusable popover | `CdxPopover` |
| A row of tabs | `CdxTabs` + `CdxTab` |
| A card with title + content | `CdxCard` |
| A table | `CdxTable` |
| A breadcrumb trail | `CdxBreadcrumbs` |
| An icon | `CdxIcon` with a `cdxIcon…` from `@wikimedia/codex-icons` |
| Small status pill | `CdxInfoChip` |
| A user avatar / image thumbnail | `CdxThumbnail` |

## Composition patterns

### Form field

```vue
<CdxField>
  <template #label>Article title</template>
  <template #description>What you'd like to suggest.</template>
  <CdxTextInput v-model="title" />
</CdxField>
```

### Action with progress

```vue
<CdxButton :disabled="loading" action="progressive" weight="primary" @click="submit">
  <CdxProgressIndicator v-if="loading" inline />
  Publish
</CdxButton>
```

### Notice + dismiss

```vue
<CdxMessage type="warning" :allow-user-dismiss="true" @user-dismissed="hide">
  This is a draft. Changes haven't been saved.
</CdxMessage>
```

### Modal

```vue
<CdxDialog
  v-model:open="showModal"
  title="Discard changes?"
  :primary-action="{ label: 'Discard', actionType: 'destructive' }"
  :default-action="{ label: 'Keep editing' }"
  @primary="discard"
  @default="showModal = false"
>
  All unsaved changes will be lost.
</CdxDialog>
```

## Common pitfalls

- **Forgetting `CdxField`.** A bare `CdxTextInput` has no label — wrap it.
- **Confusing `CdxLookup` and `CdxTypeaheadSearch`.** Lookup is for *form
  values* (you must pick from suggestions); TypeaheadSearch is for *search
  navigation* (you can submit free text, like the wiki search bar).
- **Re-importing Codex CSS.** It's already global. Don't.
- **Wrapping an icon in a button manually.** Use `<CdxButton>` with a
  child `<CdxIcon>` — focus styles, hover, sizing all come for free.

## See also

- [`codex-icons`](../codex-icons/SKILL.md) for the icon catalogue.
- [`codex-tokens`](../codex-tokens/SKILL.md) for the design tokens that
  drive every component's appearance.
- [`codex-style-guide`](../codex-style-guide/SKILL.md) for the **why** —
  the design rules for links vs buttons, forms, overflow, and the rest.

## Inside ProtoWiki

ProtoWiki composes these primitives into wrappers (`ChromeWrapper`,
`SpecialPageWrapper`, `PlainWrapper`) and reader surfaces (`ArticleWrapper`,
`ArticleRenderer`, `ArticleLive`, `ArticleSnapshot`, `ArticleCustom`, …; **`Search`** wraps `CdxTypeaheadSearch`). See
[`protowiki-components`](../protowiki-components/SKILL.md).
