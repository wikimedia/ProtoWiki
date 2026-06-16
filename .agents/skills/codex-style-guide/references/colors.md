# Using colour

Source: <https://doc.wikimedia.org/codex/latest/style-guide/colors.html>.

This is the *design* side of colour — what colour means and how to use
it. For **which token** to reach for, see
[`codex-tokens` → colors](../../codex-tokens/references/colors.md); for
the chart palettes see
[`data-visualization.md`](data-visualization.md).

## What colour conveys

- **Gray** — textual and foundational elements (text, borders,
  surfaces).
- **Blue** — progressive elements (links, primary actions, "next step").
- **Red / yellow / green** — status (error / warning / success). Use
  them only to convey status, not decoration.

## Rules

- **Never use colour as the only signal.** Pair it with text, an icon,
  or a shape (see [`accessibility.md`](accessibility.md)).
- Every palette colour meets **level AA** contrast against white/black,
  but any other text/background pairing is yours to verify — **4.5:1**
  for standard text, **3:1** for large.
- Express all of this through **semantic tokens**
  (`--color-progressive`, `--color-error`, …) rather than raw hex, so
  light/dark themes stay correct.
