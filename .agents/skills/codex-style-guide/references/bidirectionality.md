# Bidirectionality (LTR / RTL)

Source: <https://doc.wikimedia.org/codex/latest/style-guide/bidirectionality.html>

Mirroring reflects a layout for right-to-left languages (Arabic,
Hebrew, …). Not everything flips — mirroring the wrong things breaks
meaning.

## Mirror

- Text alignment in RTL languages.
- Icons with horizontal orientation (e.g. `cdxIconArrowNext`,
  `cdxIconArrowPrevious`).
- Elements within components and pages; buttons and button groups.
- Sliders, toggle switches, control elements, rating selectors.
- Pagination and navigation items.
- Progress elements **that indicate a sequence/steps**.

## Don't mirror

- Icons lacking clear directionality; icons for time, containing
  check marks, or designed for right-hand use.
- Phone numbers, postal/ZIP codes, and numerals.
- URLs and email addresses (keep structure intact; only align them).
- Components representing time; clock/calendar icons.
- Charts/graphs where mirroring would change interpretation.
- Currency symbols.
- Media controls (play/pause/rewind).
- Images and illustrations themselves — mirror their **captions** only.
- Progress elements tied to **time** (e.g. a video timeline).

## Per-element notes

- **Paragraphs** — align to the language direction of the browser or
  the article. Don't mix alignments in one paragraph.
- **Phone numbers** — always LTR, prefix kept in place; works for both
  Western (123) and Eastern Arabic (١٢٣) numerals.
- **Addresses** — mirror word alignment; leave numbers (ZIP) unmirrored.
  Splitting letters and numbers into separate inputs reduces errors.
- **Date & time** — element order follows reading direction, but
  numerals and time icons do not mirror.
- **Lists** — align every row to the language direction; keep it
  consistent, with correct `lang`/`dir` per item.
- **Stacked buttons / steppers** — order does **not** change with
  direction; keep the most important action's position.
- **Icons** — mirror directional ones; reuse the same glyph when it has
  no directionality; some glyphs (e.g. a question mark) differ between
  Arabic and Hebrew. The icon list flags which icons mirror.

## In code

`CdxIcon` auto-flips bidi-aware icons and accepts an explicit `dir`
prop; see [`codex-icons`](../../codex-icons/SKILL.md).
