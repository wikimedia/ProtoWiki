# Typography

> The canonical home for the 9-styles **rule** is
> [`codex-typography`](../../codex-typography/SKILL.md). This page repeats
> the rule and adds the **full token tables** behind the styles.

Codex defines **9 canonical text styles**. Every piece of text must use one
of them. **Do not invent other combinations** of font family, size, weight,
or line height — pick a whole style, never mix tokens across styles (e.g.
body size with a heading weight). Agents tend to drift here; don't.

In ProtoWiki the matching **semantic HTML element already applies the right
style**, so the simplest way to stay compliant is to write plain semantic
markup (`h1`–`h4`, `p`, `small`, `blockquote`, `cite`, `figcaption`) and add
no font CSS.

## The 9 text styles

Each style is the combination of exactly these four tokens. Source:
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

- The scale stops at **Heading 4**. There is no official Heading 5/6 style —
  restructure the content rather than nesting deeper.
- **Small**, **Figure caption**, and **Cite** share the same four tokens;
  they're distinct styles semantically (use the matching element), not
  visually.
- **Code** is separate from these prose styles: use `--font-family-monospace`
  (the `code` / `kbd` / `samp` / `pre` elements already do).

## ProtoWiki: semantic HTML applies the styles

`src/styles/global.css` maps **`h1`–`h6`**, **`p`**, **`small`**,
**`blockquote`**, **`cite`**, **`figcaption`**, **`code`/`kbd`/`samp`**,
**`pre`**, and related elements to the styles above. Prefer plain semantic
markup in prototypes — that's how you get the canonical typography for free.

Reader-style **underlines** on primary titles use **`mw-first-heading`**
(PlainWrapper, **`ArticleRenderer`**'s **`.article-content`**,
`.mw-parser-output`); that class only adds the separator — the size comes
from **`h1`** + the Heading 1 style.

## If you can't use the semantic element

When you genuinely need a class (e.g. a non-heading element that should read
as a heading), copy a **whole** style row — all four tokens — rather than
picking sizes ad hoc:

```css
.section-title {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xx-large);
}
```

## The tokens behind the styles

You should rarely reach for these directly — use a style row above. They're
listed so you can recognise them and verify a style.

### Font family

| Token | Used by |
| --- | --- |
| `--font-family-base` | Body, Small, Figure caption, Cite, Heading 3–4 |
| `--font-family-serif` | Heading 1–2, Block quote (Wikipedia-like article title + body) |
| `--font-family-monospace` | code, source-mode editor |

### Font size

| Token | Approx. px | Style |
| --- | --- | --- |
| `--font-size-x-small` | 12 | (below the prose scale — avoid for body text) |
| `--font-size-small` | 14 | Small / Figure caption / Cite |
| `--font-size-medium` | 16 | Body / Block quote |
| `--font-size-large` | 18 | Heading 4 |
| `--font-size-x-large` | 20 | Heading 3 |
| `--font-size-xx-large` | ~24–28 | Heading 2 |
| `--font-size-xxx-large` | ~28–36 | Heading 1 |

### Font weight

| Token | Style |
| --- | --- |
| `--font-weight-normal` | Headings 1–2, Body, Small, Figure caption, Block quote, Cite |
| `--font-weight-bold` | Headings 3–4, strong emphasis |

(The design system intentionally has only two weights.)

### Line height

Each style pairs its font size with the matching `--line-height-*` token
(e.g. `--font-size-xx-large` with `--line-height-xx-large`). Don't mismatch
them.

The 9-styles rule and the easiest way to follow it live in
[`codex-typography`](../../codex-typography/SKILL.md). For the residual
*design* concerns the styles don't decide — line length and dynamic text —
see [`codex-style-guide` → typography](../../codex-style-guide/references/typography.md).
