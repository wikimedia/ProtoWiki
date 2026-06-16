# Colour tokens

Which token to reach for. For *what colour means* and the
never-colour-alone / contrast rules, see
[`codex-style-guide` → colour usage](../../codex-style-guide/references/colors.md).

## Text

| Token | Use |
| --- | --- |
| `--color-base` | body text, headlines |
| `--color-subtle` | secondary text, captions, helper text |
| `--color-placeholder` | input placeholders |
| `--color-disabled` | disabled controls |
| `--color-emphasized` | strong emphasis on a neutral background |
| `--color-progressive` | links, primary action labels |
| `--color-progressive--hover` | link hover |
| `--color-progressive--active` | link active |
| `--color-destructive` | destructive action labels |
| `--color-destructive--hover` / `--color-destructive--active` | hover/active states |
| `--color-visited` | visited links |
| `--color-error` | error text in messages |
| `--color-warning` | warning text in messages |
| `--color-success` | success text |
| `--color-notice` | informational text |
| `--color-inverted` | text on inverted backgrounds (overlays, toasts) |

## Background

| Token | Use |
| --- | --- |
| `--background-color-base` | page background |
| `--background-color-neutral` | cards, panels |
| `--background-color-neutral-subtle` | toolbars, footers, secondary surfaces |
| `--background-color-progressive-subtle` | informational containers |
| `--background-color-error-subtle` | error containers |
| `--background-color-warning-subtle` | warning containers |
| `--background-color-success-subtle` | success containers |
| `--background-color-notice-subtle` | notice containers |
| `--background-color-disabled` | disabled controls |
| `--background-color-disabled-subtle` | disabled containers |
| `--background-color-button-quiet--hover` | quiet button hover |

## Border

| Token | Use |
| --- | --- |
| `--border-color-subtle` | hairline divider, lightest border |
| `--border-color-base` | default form border |
| `--border-color-emphasized` | hover border on inputs |
| `--border-color-progressive` | progressive accents (active inputs) |
| `--border-color-destructive` | destructive accents |
| `--border-color-error` | error inputs / messages |
| `--border-color-warning` | warning inputs / messages |
| `--border-color-success` | success inputs / messages |
| `--border-color-notice` | notice inputs / messages |
| `--border-color-inverted-fixed` | borders that stay visible regardless of theme |

## Colour options (presentational)

Codex also ships a set of **"colour option"** tokens for purely
presentational use — labelling, charts, categories — rather than semantic
meaning. They come in nine hues, each as a text, background, and border
token, and are designed to be combined hue-for-hue:

| Family | Tokens |
| --- | --- |
| Red | `--color-option-red` / `--background-color-option-red` / `--border-color-option-red` |
| Orange | `--color-option-orange` / `--background-color-option-orange` / `--border-color-option-orange` |
| Yellow | `--color-option-yellow` / `--background-color-option-yellow` / `--border-color-option-yellow` |
| Lime | `--color-option-lime` / `--background-color-option-lime` / `--border-color-option-lime` |
| Green | `--color-option-green` / `--background-color-option-green` / `--border-color-option-green` |
| Blue | `--color-option-blue` / `--background-color-option-blue` / `--border-color-option-blue` |
| Purple | `--color-option-purple` / `--background-color-option-purple` / `--border-color-option-purple` |
| Pink | `--color-option-pink` / `--background-color-option-pink` / `--border-color-option-pink` |
| Maroon | `--color-option-maroon` / `--background-color-option-maroon` / `--border-color-option-maroon` |

Pair the matching hue (e.g. `--color-option-pink` text on
`--background-color-option-pink`) rather than mixing families. Link text
stays WCAG AA-legible on any of these backgrounds. These are for
decoration only — keep using the semantic families above for status,
actions, and links. See
[Codex/Design/Color](https://www.mediawiki.org/wiki/Codex/Design/Color).

## Tips

- `*-subtle` always means "low-contrast variant of the same family". Pair
  `--background-color-error-subtle` with `--color-error` for an error
  notice.
- For "tinted" full-bleed surfaces (banners), use the `*-subtle`
  background plus the matching base text colour.
- The `--color-inverted` token is for white-on-dark text (e.g., toasts,
  overlays) and stays correct in dark mode (it inverts the other way).
