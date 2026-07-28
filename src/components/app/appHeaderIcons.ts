import * as CodexIcons from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'

/** Codex icon name in kebab-case (e.g. `arrow-previous`) — see `codex-icons` skill. */
export type AppHeaderIconName = string

function iconNameToExportKey(name: string): string {
  if (name.startsWith('cdxIcon')) return name
  const pascal = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `cdxIcon${pascal}`
}

export function resolveAppHeaderIcon(name: AppHeaderIconName): Icon | undefined {
  const key = iconNameToExportKey(name)
  const icon = (CodexIcons as Record<string, Icon | undefined>)[key]
  if (!icon && import.meta.env.DEV) {
    console.warn(`[AppChromeHeader] Unknown icon name "${name}" (expected export ${key}).`)
  }
  return icon
}
