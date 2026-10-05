# Spacing tokens

Codex spacing is a small, semantic 4px-based scale. Pick the rung, not a
pixel value.

| Token | Approx. value | Typical use |
| --- | --- | --- |
| `--spacing-0` | 0 | reset |
| `--spacing-12` | 1px | hairline |
| `--spacing-25` | 2px | tightly stacked icons / chips |
| `--spacing-30` | 3px | between dense form elements |
| `--spacing-35` | 5px | toolbar gaps |
| `--spacing-50` | 8px | between related elements (icon + label) |
| `--spacing-65` | 12px | between sibling fields |
| `--spacing-75` | 12px | (legacy alias) |
| `--spacing-100` | 16px | between groups inside a section, body padding |
| `--spacing-125` | 20px | header padding |
| `--spacing-150` | 24px | between sections |
| `--spacing-200` | 32px | between major sections |
| `--spacing-300` | 48px | page padding |
| `--spacing-400` | 64px | full-bleed hero spacing |

## How to choose

1. Closely related elements (an icon + its label): `--spacing-50` or
   `--spacing-65`.
2. Form fields next to each other in a row: `--spacing-100`.
3. Stacked sections within a card: `--spacing-150`.
4. Two distinct page sections: `--spacing-200` or `--spacing-300`.

## Container scope

**`ArticleWrapper`**'s **`<article>`** owns horizontal **`--spacing-100`** and shares vertical padding with nested **`ArticleRenderer`** **`.article-content`**; you don't
need to add page-level padding inside it for the article column. Use spacing tokens for
*intra-component* gaps.

## Tip

When a Figma layer says "Spacing/100", it really is `--spacing-100`. The
names line up exactly.
