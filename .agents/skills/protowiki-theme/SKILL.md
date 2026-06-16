---
name: protowiki-theme
description: How light / dark theming works in ProtoWiki — boot-time resolution of ?theme= URL param + prefers-color-scheme into a data-theme attribute on <html>, the runtime-injected Codex token sets scoped to [data-theme], the per-component theme prop for subtree overrides (including full-route demos), and the read-only useTheme() hook. Use when adding theme-specific styles, embedding a dark snippet on a light page, debugging colour cascades, or wiring a "preview in dark" toggle.
license: MIT
---

# ProtoWiki — theme

ProtoWiki supports light and dark themes, both based on the official
Codex design tokens. Themes control colours, shadows, and a few derived
visual properties. Layout is the [skin](../protowiki-skins/SKILL.md)'s job.

## How the global theme is resolved

At boot, `src/lib/theming.ts` decides the global theme in this order:

1. `?theme=light` or `?theme=dark` URL param, if either is present.
2. Otherwise, `window.matchMedia('(prefers-color-scheme: dark)').matches`
   determines the theme.

The result is set as `data-theme="…"` on `<html>`. When the URL param is
**not** pinning the value, the boot script subscribes to a media-query
listener so the global theme updates live when the OS preference changes.

## How the Codex tokens get re-scoped

Codex ships two token files at `:root` selectors:
`@wikimedia/codex-design-tokens/theme-wikimedia-ui.css` (light) and
`theme-wikimedia-ui-mode-dark.css` (dark). Both target `:root`.

`src/lib/theming.ts` reads both files via `?raw` imports at boot,
**rewrites `:root` to `[data-theme="light"]` / `[data-theme="dark"]`**,
and injects them as `<style>` tags. After that:

- `<html data-theme="light">` matches the light token rule, applying
  `--color-base`, `--background-color-base`, etc. to the document.
- `<html data-theme="dark">` matches the dark token rule.
- A descendant with `data-theme="dark"` (set via a component's `theme`
  prop) re-applies the dark tokens to its subtree, and CSS custom-property
  inheritance does the rest.

`src/styles/dark.css` patches places where Wikipedia-shaped HTML **does not**
follow Codex tokens alone — RL rules with `color: black`, TemplateStyles with
fixed pastel backgrounds (navbox bands), etc. Most prototypes never touch this
file beyond what ships in-repo.

## Wikipedia HTML: RL night class + `dark.css`

Article bodies mix three sources: Codex tokens (via `[data-theme]`), vendored
ResourceLoader CSS (`src/styles/wiki-skins/`), and **TemplateStyles** embedded
in Parsoid HTML (`Module:Navbox/styles.css`, Module:Infobox, …). The latter often
use raw hex (`#ccf` navbox titles) plus `color: inherit`, so foreground can track
dark tokens while backgrounds stay pastel unless we intervene.

**There is no single extra Wikipedia “dark stylesheet” to fetch** that replaces
TemplateStyles — those rules ship inside each `/page/html` response.

Instead ProtoWiki uses:

1. **`skin-theme-clientpref-night` on `<html>`** when the **global** theme is dark
   (`initTheming()` keeps this in sync with `data-theme`). Vector / Minerva RL bundles
   include selectors like `html.skin-theme-clientpref-night .navbox a` for link colours,
   figure backgrounds, etc.; toggling the class activates those paths without forking
   upstream CSS.

2. **`src/styles/dark.css`** — rules scoped to `[data-theme="dark"] .mw-parser-output`
   that remap TemplateStyles surfaces (navbox row colours, infobox `color: black`
   reset, …) onto Codex design tokens.

Per-subtree dark previews (`theme="dark"` on a wrapper while `<html>` stays light)
still get (2) via `data-theme` on **`ArticleWrapper`** / **`ArticleRenderer`** /
**`ArticleLive`** / **`ArticleSnapshot`** / **`ArticleCustom`**; they do **not**
toggle the RL night class on `<html>`, so RL’s `html.skin-theme-clientpref-night …`
rules stay dormant unless you also use `?theme=dark` globally.

## Per-subtree `theme` prop

Every wrapper (and every other themable component) accepts an optional
`theme` prop. When set, it renders `data-theme="…"` on the component's
root element.

```vue
<!-- Light/dark side-by-side, no iframes needed -->
<div class="protowiki-ab">
  <ChromeWrapper theme="light">
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
  <ChromeWrapper theme="dark">
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
</div>
```

When `theme` is **unset** (the common case), nothing is rendered for the
prop and the subtree inherits from the nearest ancestor with `data-theme`
— ultimately from `<html>`.

This is what makes "show me this strip in dark mode" possible without a
page reload, an iframe, or a separate route.

For a **whole prototype route** that should read as dark (e.g.
one where you set `theme="dark"` on `ChromeWrapper`), put `theme="dark"` on the outermost wrapper
(`ChromeWrapper`, `PlainWrapper`, etc.). That subtree receives the dark
token set; chrome and article both inherit. `<body>` may still show the
global theme behind any gaps — use `?theme=dark` on the URL if you need
the document root to match for overflow / scrollbar / margins outside the
wrapper.

## `useTheme()` — read-only hook

`src/composables/useTheme.ts` exports a hook that returns a reactive
read-only `Ref<'light' | 'dark'>` reflecting the GLOBAL theme (the value
on `<html>`):

```ts
import { useTheme } from '@/composables/useTheme'

const theme = useTheme()      // Ref<'light' | 'dark'>, read-only
console.log(theme.value)      // 'light' or 'dark'
```

It does **not** mutate page state, and it does **not** reflect local
subtree overrides. A component that received a `theme` prop already knows
its effective theme; it doesn't need this hook.

Use this only when CSS attribute selectors aren't enough — e.g., a debug
overlay that displays the current global theme.

## Author guidelines

- **Use Codex tokens.** `var(--color-base)`, `var(--background-color-base)`,
  `var(--border-color-subtle)`, etc. cascade through `[data-theme]` for
  free. Hand-picking hex values reintroduces the dark-mode bug you were
  trying to avoid.
- **Don't `@media (prefers-color-scheme: dark)`.** The OS preference is
  already resolved into `data-theme` at boot. Using attribute selectors
  means a local `theme="dark"` override re-themes correctly without
  fighting the OS preference.
- **Use `dark.css` sparingly.** It's for cases where Codex tokens don't
  cover what you need (e.g., custom shadows on the chrome header). Most
  prototypes never touch this file.
- **Don't toggle `theme` from inside the same prototype that wants its
  own colour overrides.** If the prototype is genuinely demonstrating a
  custom palette, prefer scoping styles to a class on the prototype root.
  Theme overrides are for staging Wikipedia-shaped prototypes.

## Pitfalls

- **The Codex token files target `:root`.** ProtoWiki rewrites them at
  runtime into `[data-theme]` selectors. If you import the token files
  directly in a component's `<style>`, you'll get always-on light or
  always-on dark instead of attribute-driven switching.
- **`<html>` always has `data-theme`.** It's set at boot. Don't write
  styles that depend on the absence of `data-theme`.
- **`useTheme()` reflects the global state only.** If a component uses
  `useTheme()` and is also placed inside a subtree with `theme="dark"`,
  the hook returns `light` (the global value) while the component renders
  with dark tokens. That's by design: layout queries should come from the
  hook; styling should come from CSS.

## References

- [`references/css-imports.md`](references/css-imports.md) — what's
  pre-loaded in `src/main.ts`, in what order, and why it matters for the
  attribute-driven cascade.
