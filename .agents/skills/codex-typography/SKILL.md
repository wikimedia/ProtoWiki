---
name: codex-typography
description: The single most important text rule in Codex — every piece of text must use exactly ONE of the 9 canonical text styles (Heading 1–4, Body, Small, Figure caption, Block quote, Cite). Each style is a fixed combination of font-family, font-size, font-weight, and line-height; never invent font combinations or mix tokens across styles. Use whenever you add or style any text — a heading, paragraph, label, caption, or quote.
license: MIT
---

# Codex typography

**The rule:** every piece of text uses **exactly one** of **9 canonical
text styles**. Each style is a fixed combination of four tokens —
font-family, font-size, font-weight, line-height. **Pick a whole style;
never mix tokens across styles** (e.g. body size with a heading weight,
or a heading size with body line-height). Agents drift here constantly —
don't.

The easiest way to comply is to write **plain semantic HTML** (`h1`–`h4`,
`p`, `small`, `blockquote`, `cite`, `figcaption`) and add **no font
CSS** — the element already carries the right style.

## The 9 text styles

Each style is exactly these four tokens. Source:
[Codex typography → Use of styles](https://doc.wikimedia.org/codex/latest/style-guide/typography.html#use-of-styles).

| Style | HTML | Tokens (family · size · weight · line-height) |
| --- | --- | --- |
| Heading 1 | `h1` | `--font-family-serif` · `--font-size-xxx-large` · `--font-weight-normal` · `--line-height-xxx-large` |
| Heading 2 | `h2` | `--font-family-serif` · `--font-size-xx-large` · `--font-weight-normal` · `--line-height-xx-large` |
| Heading 3 | `h3` | `--font-family-base` · `--font-size-x-large` · `--font-weight-bold` · `--line-height-x-large` |
| Heading 4 | `h4` | `--font-family-base` · `--font-size-large` · `--font-weight-bold` · `--line-height-large` |
| Body | `p` | `--font-family-base` · `--font-size-medium` · `--font-weight-normal` · `--line-height-medium` |
| Small | `small` | `--font-family-base` · `--font-size-small` · `--font-weight-normal` · `--line-height-small` |
| Figure caption | `figcaption` | `--font-family-base` · `--font-size-small` · `--font-weight-normal` · `--line-height-small` |
| Block quote | `blockquote` | `--font-family-serif` · `--font-size-medium` · `--font-weight-normal` · `--line-height-medium` |
| Cite | `cite` | `--font-family-base` · `--font-size-small` · `--font-weight-normal` · `--line-height-small` |

Notes:

- The scale **stops at Heading 4**. There is no official Heading 5/6 —
  restructure the content rather than nesting deeper.
- **Small**, **Figure caption**, and **Cite** share the same four tokens;
  they're distinct *semantically* (use the matching element), not
  visually.
- **Code** is separate from these prose styles: use
  `--font-family-monospace` (the `code` / `kbd` / `samp` / `pre` elements
  already do).

## If you can't use the semantic element

When you genuinely need a class (e.g. a non-heading element that should
*read* as a heading), copy a **whole** style row — all four tokens —
rather than picking sizes ad hoc:

```css
.section-title {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xx-large);
}
```

## What the rule already gives you — and what it doesn't

Following a style means font family and line-height are handled for you
(the `--font-family-*` tokens are system-font stacks, and each size is
paired with its matching `--line-height-*`). You still control:

- **Line length** — keep prose to ~**≤ 75 characters** per line.
- **Dynamic text** — text length varies across languages; don't assume a
  fixed length (let containers expand, shrink long content, clip only
  when nothing is lost).
- **Contrast** — a colour concern, not a type one; meet 4.5:1 (see
  [`codex-style-guide` → accessibility](../codex-style-guide/references/accessibility.md)).

## Full token tables

This skill is about the **rule**. For the exhaustive token value tables
(every `--font-size-*`, `--font-weight-*`, `--line-height-*` with px
approximations) see
[`codex-tokens` → typography](../codex-tokens/references/typography.md).

## Inside ProtoWiki

`src/styles/global.css` maps **`h1`–`h6`**, **`p`**, **`small`**,
**`blockquote`**, **`cite`**, **`figcaption`**, **`code`/`kbd`/`samp`**,
**`pre`**, and related elements to the 9 styles. Prefer plain semantic
markup in prototypes — that's how you get the canonical typography for
free.

Reader-style **underlines** on primary titles use **`mw-first-heading`**
(PlainWrapper, **`ArticleRenderer`**'s **`.article-content`**,
`.mw-parser-output`); that class only adds the separator — the size comes
from **`h1`** + the Heading 1 style.
