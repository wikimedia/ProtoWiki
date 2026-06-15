# Token inventory

The fastest complete reference is **right here in this skill**:

- [`../assets/tokens.css`](../assets/tokens.css) — a vendored snapshot of
  the Codex token CSS (light theme + the `skin-theme-clientpref-night` dark
  block), kept up to date when we bump `@wikimedia/codex-design-tokens`.
  Grep it for any token name **and its actual value** without opening
  `node_modules`:

  ```bash
  rg -o '^\s*(--[a-z0-9-]+):' .agents/skills/codex-tokens/assets/tokens.css | sort -u
  ```

It's local, complete, and shows both light and dark values in one place.
The only reason to look elsewhere is if you suspect the snapshot is stale —
then the canonical source of truth is the
[Codex design tokens docs](https://doc.wikimedia.org/codex/latest/design-tokens/overview.html)
(and the update process in
[`protowiki-update-codex`](../../protowiki-update-codex/SKILL.md) refreshes
the snapshot).

## Common categories you'll see

- Color: `--color-…`, `--background-color-…`, `--border-color-…`,
  `--box-shadow-color-…`, `--filter-…`.
- Spacing: `--spacing-…`.
- Sizing: `--size-…`, `--max-width-…`, `--min-size-…`.
- Typography: `--font-family-…`, `--font-size-…`, `--font-weight-…`,
  `--line-height-…`, `--letter-spacing-…`.
- Border: `--border-width-…`, `--border-style-…`, `--border-radius-…`.
- Shadow: `--box-shadow-…`.
- Transition: `--transition-property-…`, `--transition-duration-…`,
  `--transition-timing-function-…`.
- Z-index: `--z-index-…`.
- Opacity: `--opacity-…`.
- Outline: `--outline-color-progressive--focus`.

When in doubt, find the closest match in `tokens.css` (or upstream) and use
that name. The runtime injection takes care of theming for free.
