# Inputs & forms

Canonical docs: <https://doc.wikimedia.org/codex/latest/components/overview.html>

## CdxField

Wraps a form control with a label, optional description, and validation
messages. **Use it around every form control.**

```vue
<CdxField :status="status" :messages="messages">
  <template #label>Article title</template>
  <template #description>Short, capitalised, e.g. "Mont Blanc".</template>
  <CdxTextInput v-model="title" />
  <template #help-text>Avoid disambiguation suffixes.</template>
</CdxField>
```

`status` is `default` / `error` / `warning` / `success`. `messages` is a
keyed map of message text per status.

## CdxLabel

Standalone label component. You usually don't need this directly because
`CdxField` renders one.

## CdxTextInput

Single-line text input.

```vue
<CdxTextInput v-model="value" :placeholder="'Search'" />
```

| Prop | Values | Default |
| --- | --- | --- |
| `inputType` | `text` / `search` / `number` / `email` / `password` / `tel` / `url` / `week` / `month` / `date` / `datetime-local` / `time` / `color` | `text` |
| `disabled`, `readonly` | boolean | `false` |
| `clearable` | boolean — show ✕ to clear | `false` |
| `startIcon`, `endIcon` | icon descriptor | — |

## CdxTextArea

Multiline text input. Accepts the same `disabled`, `readonly`,
`placeholder`, `rows` you'd expect.

```vue
<CdxTextArea v-model="body" :rows="6" />
```

## CdxCheckbox

```vue
<CdxCheckbox v-model="confirmed">I'm sure</CdxCheckbox>
```

For multiple checkboxes, bind `v-model` to an array and give each a
unique `inputValue`.

## CdxRadio

```vue
<CdxRadio v-model="status" inputValue="published">Published</CdxRadio>
<CdxRadio v-model="status" inputValue="draft">Draft</CdxRadio>
```

## CdxSelect

A styled dropdown.

```vue
<CdxSelect
  v-model:selected="value"
  :menu-items="[
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]"
  default-label="Choose one"
/>
```

For free-form input + suggestions, use `CdxCombobox` or `CdxLookup`
instead.

## CdxCombobox

Free-form input with a fixed list of suggestions. Value can be the user's
free text or a chosen suggestion.

```vue
<CdxCombobox
  v-model:selected="value"
  :menu-items="suggestions"
/>
```

## CdxLookup

Free-form input with a *dynamic* list of suggestions, typically fetched
from an API.

```vue
<CdxLookup
  v-model:selected="value"
  v-model:input-value="inputValue"
  :menu-items="results"
  @input="onInput"
/>
```

Use this for "pick a Wikipedia article", "pick a category", "pick a
user". Pair it with the [`wiki-apis`](../../wiki-apis/SKILL.md) skill.

`CdxLookup` exposes a `focus()` method via a template ref, so you can
programmatically focus the input (e.g. after clearing a selection).

## CdxSearchInput

A text input with a leading magnifying-glass icon. For full typeahead
search behaviour, use `CdxTypeaheadSearch`.

## CdxTypeaheadSearch

Search bar with typeahead suggestion list and submit handling. The
typical wiring is to debounce keystrokes (150–250ms), call the
Wikipedia `?action=opensearch` endpoint with an `AbortController`, and
feed the returned titles into the suggestion slot. ProtoWiki ships a
`Search` component that already does all of this — see
[`protowiki-components`](../../protowiki-components/SKILL.md).

## CdxAccordion

Collapsible section — title + body.

```vue
<CdxAccordion>
  <template #title>References</template>
  <template #description>12 sources</template>
  <ol>…</ol>
</CdxAccordion>
```

## v-model conventions

Codex uses `v-model:open` (dialogs), `v-model:selected` (selects /
combobox / lookup), `v-model:input-value` (free-text portion of
lookup). Pay attention to which target you bind.

## Designing the form (style guide)

For *how to construct a form well* — usability rules, layout & width,
fieldsets/modules, validation timing, readonly vs disabled, spacing
tokens, and which field type to pick — see
[`codex-style-guide` → constructing forms](../../codex-style-guide/references/constructing-forms.md).
