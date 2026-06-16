# Constructing forms

Source:
<https://doc.wikimedia.org/codex/latest/style-guide/constructing-forms.html>.

The *design* rules for forms. For the form component APIs (`CdxField`,
`CdxTextInput`, `CdxSelect`, …) see
[`codex-components` → inputs & forms](../../codex-components/references/inputs-and-forms.md).

A form is at least one `CdxField`. The goal: let the user complete and
submit with comfort and confidence.

## Usability rules

- Keep fields simple; use existing components for each input need.
- **Only collect what's necessary** (don't ask for email/gender unless
  truly needed).
- Every input has a visible **label** (use `CdxField`, which renders
  one).
- **All fields are inherently required** — drop the ones that aren't.
  Mark genuinely optional ones with "(optional)" (built into `CdxLabel`).
- Don't hide a required form inside an Accordion; don't put timers on
  completion.
- Avoid disabled submit buttons — rely on validation (below).

## Layout

- Fields span the container width, or cap at **`size-4000` (640px)** when
  there's no table of contents — but all fields share one width.
- **Top labels.** Multi-column rows only for related fields ("Name" /
  "Last name"); collapse to a single column below the
  `min-width-breakpoint-tablet` (640px) breakpoint.
- **Fieldset** (`CdxField` `isFieldset`) groups related inputs (Checkbox
  / Radio groups) in a `<fieldset>` + `<legend>`.
- **Modules** (border `border-color-muted`, `border-radius-base`, or a
  `background-color-interactive-subtle`) visually separate a form or
  group related fields. Group label is **bold**; child labels regular.
- **Nested/conditional** fields indent **16px** per level; an "other"
  text input sits directly under the selected option.

## Validation

- Use **inline validation** or **on-submit** validation — not a disabled
  button (disabled is OK only on a single-input form).
- On submit with errors, show a message **above the submit button**
  summarising them; refresh it on resubmit; remove it when clean.
- Inline timing: validate **on blur** by default (clear the error once
  the user edits); validate **on input** only for strict rules (length,
  required prefix). Empty fields validate on submit.

## Readonly vs disabled (TextInput / TextArea)

- **`readonly`** — content should be seen/read/copied but not changed;
  it receives focus and **is submitted** with the form.
- **`disabled`** — content needn't be seen at all; no focus, can't be
  copied, and is **not submitted**. (Disabled has no contrast guarantee,
  so don't use it to show important values.)

## Spacing tokens

- Form ↔ other page elements / TOC / footer: `spacing-150` (24px).
- Between elements within a form (headings, fields): `spacing-100` (16px).
- Between sections: `spacing-150` (24px).
- Label ↔ its input: `spacing-25` (4px) desktop / `spacing-50` (8px)
  mobile (built into `CdxField`).
- Module padding: `spacing-150` (whole-form) or `spacing-75` (fields).
- Between options in a Checkbox/Radio group: `spacing-75` (built in).
- Between footer actions: `spacing-75` (12px). Spacing is constant at
  every breakpoint.

## Picking a field type

`TextInput` (short text/number/email/password/tel/url/time) ·
`TextArea` (long text) · `ChipInput` (multiple items) · `Combobox`
(search/select a short predetermined list) · `Lookup` (search a long
list) · `Select` (select from a list) · `Checkbox` (one or more,
< 5 items) · `Radio` (exactly one, < 5 items) · `ToggleSwitch` (immediate
binary, no submit button). **`TypeaheadSearch` is not for forms** — use
`Lookup` or `SearchInput`.
