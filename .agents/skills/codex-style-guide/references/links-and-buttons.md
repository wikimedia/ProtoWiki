# Using links and buttons

Source:
<https://doc.wikimedia.org/codex/latest/style-guide/using-links-and-buttons.html>.

The *design* rules for links vs buttons and button hierarchy. For the
component APIs (`CdxButton`, `CdxButtonGroup`, …) see
[`codex-components` → buttons](../../codex-components/references/buttons-and-actions.md).

## Links vs buttons

**Use a Link to navigate, a Button to perform an action.** Don't style
one as the other — keyboard and screen-reader users depend on the
semantics (a Link activates on Enter only; a Button on Enter *and*
Space). Rare exception: a navigational "Donate"/"Register" call to
action may *look* like a button while staying a semantic `<a>`.

- Quiet progressive Buttons look like Links — **don't place them next to
  Links**.
- Links are text, not icons (the one exception: an external link adds
  `cdxIconLinkExternal`). Links aren't underlined by default (only on
  hover/focus).
- A Button next to a Link/Button, or a Link next to a Link, uses
  `@spacing-75` (12px) between them.

## Button hierarchy & order

Picking the right `action` + `weight` *and order* helps users read the
available actions:

- **Primary** → one primary progressive Button per group (never two).
- **Secondary** → normal Buttons.
- **Tertiary** → quiet Buttons.
- Avoid pairing a progressive and a destructive action with no neutral
  option (don't force a polarizing choice). Destructive colour visually
  outweighs the others.
- A group is usually 2–3 Buttons; for more, use a `CdxMenuButton`. Use a
  `CdxButtonGroup` only for sibling actions on the same element.

Order:

- **Standalone group:** most important action at the **end** of the
  group; spacing `@spacing-75`.
- **Stacked (mobile):** most important at the **top**; the order does
  **not** change with LTR/RTL.
- **Forms:** footer actions align to the **leading** edge (left in LTR).
- **Dialogs:** footer actions align to the **trailing** edge (right in
  LTR).
- **Multi-step:** forward action (e.g. "Next", primary progressive) is
  outermost; "Previous" (neutral normal) sits beside it; "Skip" (quiet)
  beyond that.

## Disabled buttons

Use disabled Buttons **sparingly** — only when a single input/interaction
will enable them. **Don't** disable the submit button of a multi-field
form; use inline validation instead (see
[`constructing-forms.md`](constructing-forms.md)).
