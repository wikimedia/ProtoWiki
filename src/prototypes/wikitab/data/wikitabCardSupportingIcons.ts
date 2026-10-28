import * as CodexIcons from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'

/** `cdxIcon…` export name from `@wikimedia/codex-icons` (serializable in payloads). */
export type CodexIconName = Extract<keyof typeof CodexIcons, `cdxIcon${string}`>

/** Sorted list for selects and validation. */
export const CODEX_ICON_NAMES = (Object.keys(CodexIcons) as CodexIconName[])
  .filter((name) => name.startsWith('cdxIcon'))
  .sort()

export function resolveCodexIcon(name: CodexIconName): Icon {
  return CodexIcons[name] as Icon
}

export function isCodexIconName(value: string): value is CodexIconName {
  return (CODEX_ICON_NAMES as readonly string[]).includes(value)
}

/** `cdxIconChartLine` → `chartLine` for display labels. */
export function codexIconExportLabel(exportName: CodexIconName): string {
  const rest = exportName.slice('cdxIcon'.length)
  return rest.charAt(0).toLowerCase() + rest.slice(1)
}

/** Resolve a runtime `Icon` reference back to its `cdxIcon…` export name. */
export function codexIconExportNameFromIcon(icon: Icon): CodexIconName | undefined {
  for (const name of CODEX_ICON_NAMES) {
    if (CodexIcons[name] === icon) return name
  }
  return undefined
}
