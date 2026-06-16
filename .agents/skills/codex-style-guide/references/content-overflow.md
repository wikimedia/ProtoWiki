# Content overflow

Source:
<https://doc.wikimedia.org/codex/latest/style-guide/content-overflow.html>.

When text or elements exceed their space, pick the right remedy:

- **Wrapping — the default.** Let text flow onto multiple lines when the
  component's height isn't fixed. Don't wrap where uniform height matters
  (e.g. a `Select` next to other controls).
- **Ellipsis truncation.** Use when height must stay consistent (chips,
  button groups, a Select label). Pair it with a **tooltip** so the full
  text is reachable. Cards/Menus can also cap descriptions at N lines
  (no tooltip needed there). In RTL the ellipsis sits on the left.
  Don't truncate things like article titles where the full text matters.
- **Fade.** Reserve fade *only* to signal that a **group of elements can
  be scrolled** (e.g. a tab strip). Never use a fade to truncate text —
  use an ellipsis.
