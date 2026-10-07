import lightTokensRaw from '@wikimedia/codex-design-tokens/theme-wikimedia-ui.css?raw'
import darkTokensRaw from '@wikimedia/codex-design-tokens/theme-wikimedia-ui-mode-dark.css?raw'

/*
 * Resolved values from the *installed* Codex token sheets (stock or patched), for
 * places that need a specific mode's value regardless of the document's current
 * data-theme — e.g. theme-picker swatches previewing Black while the page is light.
 * `var(--token)` would resolve against the active mode instead.
 */
function tokenValue(raw: string, name: string): string {
  const match = raw.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Codex token --${name} not found`)
  return match[1].trim()
}

export const codexLight = {
  progressive: tokenValue(lightTokensRaw, 'color-progressive'),
  subtle: tokenValue(lightTokensRaw, 'color-subtle'),
  backgroundBase: tokenValue(lightTokensRaw, 'background-color-base'),
}

export const codexDark = {
  backgroundBase: tokenValue(darkTokensRaw, 'background-color-base'),
}
