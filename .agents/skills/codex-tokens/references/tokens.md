# Token inventory

This file points to the canonical complete reference rather than
duplicating it (it changes per Codex release).

- **Codex design tokens overview:**
  <https://doc.wikimedia.org/codex/latest/design-tokens/overview.html>
- **All component CSS variables (per-component):** every Codex component
  page on doc.wikimedia.org has a "CSS custom properties" section.
- **Source files in this repo:**
  - `node_modules/@wikimedia/codex-design-tokens/theme-wikimedia-ui.css`
  - `node_modules/@wikimedia/codex-design-tokens/theme-wikimedia-ui-mode-dark.css`
  - `node_modules/@wikimedia/codex-design-tokens/dist/types.d.ts`

To dump the complete current token list locally:

```bash
node -e "import('@wikimedia/codex-design-tokens').then(t => console.log(Object.keys(t)))"
```

Or grep the CSS:

```bash
rg -o '^\s*(--[a-z0-9-]+)' \
  node_modules/@wikimedia/codex-design-tokens/theme-wikimedia-ui.css \
  | sort -u
```

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

When in doubt, find the closest match upstream and use that name. The
runtime injection takes care of theming for free.
