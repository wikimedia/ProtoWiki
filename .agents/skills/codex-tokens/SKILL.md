---
name: codex-tokens
description: The Codex CSS custom-property design tokens (color, spacing, typography, border, shadow, transition) shipped via @wikimedia/codex-design-tokens — what each token name means, how to use them in templates and CSS, and how the light / dark token sets cascade through [data-theme]. Use when picking a colour / spacing / type value, debugging a dark-mode regression, or asking "what's the token for X?".
license: MIT
---

# Codex tokens

Codex tokens are CSS custom properties (variables) defined by
`@wikimedia/codex-design-tokens`. They're the source of truth for every
visual decision in the design system. Use them everywhere.

## The big idea

```css
.my-thing {
  color: var(--color-base);
  background-color: var(--background-color-neutral-subtle);
  padding: var(--spacing-100);
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
}
```

The light and dark Codex token files both target `:root` by default.
A host environment that wants per-subtree theme switching typically
re-scopes them to attribute selectors like `[data-theme="light"]` /
`[data-theme="dark"]` so a single rule renders correctly in both
themes — and re-themes correctly inside any subtree whose `data-theme`
overrides the inherited one.

## Token families

The Codex token set is split across families. Reference each in detail:

- [`references/colors.md`](references/colors.md)
- [`references/spacing.md`](references/spacing.md)
- [`references/typography.md`](references/typography.md)
- [`assets/tokens.css`](assets/tokens.css) — a vendored snapshot of the
  Codex token CSS (light + the `skin-theme-clientpref-night` dark block) for
  quick grepping of any token **and its value** without opening
  `node_modules`. Refresh when bumping the `@wikimedia/codex-design-tokens`
  version (see header comment in the file).
- [`references/tokens.md`](references/tokens.md) — how to find the full
  inventory (points at `tokens.css` first, then upstream).

## Quick cheat-sheet

| Want                              | Token                                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| Body text colour                  | `var(--color-base)`                                                      |
| Secondary / placeholder text      | `var(--color-subtle)` / `var(--color-placeholder)`                       |
| Link colour                       | `var(--color-progressive)`                                               |
| Visited link                      | `var(--color-visited)`                                                   |
| Page background                   | `var(--background-color-base)`                                           |
| Toolbar / footer background       | `var(--background-color-neutral-subtle)`                                 |
| Card / inset background           | `var(--background-color-neutral)`                                        |
| Hairline border                   | `var(--border-color-subtle)`                                             |
| Form border                       | `var(--border-color-base)`                                               |
| Tiny / small / medium / large gap | `var(--spacing-25)` / `--spacing-50` / `--spacing-100` / `--spacing-150` |
| Section / page padding            | `var(--spacing-200)` / `var(--spacing-300)`                              |
| Small radius                      | `var(--border-radius-base)`                                              |
| Any text (size/weight/family/leading) | Use a whole style from [`references/typography.md`](references/typography.md) — never assemble font tokens ad hoc |

## Authoritative source

Codex's [design tokens documentation](https://doc.wikimedia.org/codex/latest/design-tokens/overview.html)
is the canonical reference. Use it when a name in this skill drifts from
the upstream package.

## Pitfalls

- **Don't invent names.** Tokens with `--cdx-` prefixes do exist (for
  experimental / mixin-only values); the user-facing tokens in the design
  system are unprefixed (`--color-base`, `--spacing-100`). Check the
  reference table before guessing.
- **Importing the raw `:root` token files locks you to one theme.** The
  shipped CSS targets `:root`, so importing `theme-wikimedia-ui.css`
  directly gives you always-on light, and the dark equivalent gives
  always-on dark. To get attribute-driven switching, your environment
  needs to re-scope these files (see "Inside ProtoWiki" below).
- **Token values change.** When Codex bumps a major, run a quick visual
  diff. The token _names_ are stable.

## Inside ProtoWiki

ProtoWiki bundles the Codex token files and re-scopes them at boot via
`src/lib/theming.ts` so the same `var(--…)` rule cascades through
`[data-theme="light"]` / `[data-theme="dark"]`. See
[`protowiki-theme`](../protowiki-theme/SKILL.md) for the boot-time
resolution, the per-subtree `theme` prop, and the `useTheme()` hook.
