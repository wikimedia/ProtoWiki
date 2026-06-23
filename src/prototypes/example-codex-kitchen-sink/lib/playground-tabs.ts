import { buttonsSubTabs, contentDataSubTabs, feedbackSubTabs, formElementsSubTabs, iconsSubTabs, mediaSubTabs, navigationSubTabs, searchSubTabs } from './component-tabs'
import {
  colorSubTabs,
  tokenSectionTabs,
  typographySubTabs,
  type TokenSection,
} from './parse-tokens'

export const mainTabIds = [
  'typography',
  'color',
  'tokens-layout',
  'tokens-appearance',
  'tokens-animation',
  'icons',
  'components-buttons',
  'components-form-elements',
  'components-feedback',
  'components-content-data',
  'components-media',
  'components-navigation',
  'components-search',
] as const

export type MainTabId = (typeof mainTabIds)[number]

export const tokenMainTabBySection: Record<TokenSection, MainTabId> = {
  layout: 'tokens-layout',
  appearance: 'tokens-appearance',
  animation: 'tokens-animation',
}

const subTabIdsByMain: Partial<Record<MainTabId, readonly string[]>> = {
  typography: typographySubTabs.map((tab) => tab.id),
  color: colorSubTabs.map((tab) => tab.id),
  icons: iconsSubTabs.map((tab) => tab.id),
  'components-buttons': buttonsSubTabs.map((tab) => tab.id),
  'components-form-elements': formElementsSubTabs.map((tab) => tab.id),
  'components-content-data': contentDataSubTabs.map((tab) => tab.id),
  'components-feedback': feedbackSubTabs.map((tab) => tab.id),
  'components-media': mediaSubTabs.map((tab) => tab.id),
  'components-navigation': navigationSubTabs.map((tab) => tab.id),
  'components-search': searchSubTabs.map((tab) => tab.id),
  'tokens-layout': tokenSectionTabs.find((entry) => entry.id === 'layout')!.subTabs.map((tab) => tab.id),
  'tokens-appearance': tokenSectionTabs
    .find((entry) => entry.id === 'appearance')!
    .subTabs.map((tab) => tab.id),
  'tokens-animation': tokenSectionTabs
    .find((entry) => entry.id === 'animation')!
    .subTabs.map((tab) => tab.id),
}

export const defaultLeafTab = 'typography/style'

function isMainTabId(value: string): value is MainTabId {
  return (mainTabIds as readonly string[]).includes(value)
}

export function getDefaultLeafTab(main: MainTabId): string {
  const subTabs = subTabIdsByMain[main]
  return subTabs ? `${main}/${subTabs[0]}` : main
}

export function parseLeafTab(raw: string): { main: MainTabId; sub?: string } | null {
  const slash = raw.indexOf('/')
  if (slash === -1) {
    if (!isMainTabId(raw)) return null
    if (subTabIdsByMain[raw]) return null
    return { main: raw }
  }

  const main = raw.slice(0, slash)
  const sub = raw.slice(slash + 1)
  if (!isMainTabId(main)) return null

  const subTabs = subTabIdsByMain[main]
  if (!subTabs || !subTabs.includes(sub)) return null

  return { main, sub }
}

export function isValidLeafTab(value: string): boolean {
  return parseLeafTab(value) !== null
}

export function resolveLeafTab(raw: string | undefined): string {
  if (raw && isValidLeafTab(raw)) return raw

  if (raw && isMainTabId(raw) && subTabIdsByMain[raw]) {
    return getDefaultLeafTab(raw)
  }

  return defaultLeafTab
}

export function getSubTabForMain(
  mainTabId: MainTabId,
  subTabMemory: Partial<Record<MainTabId, string>>,
): string {
  const remembered = subTabMemory[mainTabId]
  const subTabs = subTabIdsByMain[mainTabId]
  if (remembered && subTabs?.includes(remembered)) return remembered
  return subTabs?.[0] ?? ''
}

export function getRememberedLeafTab(
  main: MainTabId,
  subTabMemory: Partial<Record<MainTabId, string>>,
): string {
  const subTabs = subTabIdsByMain[main]
  return subTabs ? `${main}/${getSubTabForMain(main, subTabMemory)}` : main
}

export function subTabForMain(
  leafTab: string,
  mainTabId: MainTabId,
  subTabMemory: Partial<Record<MainTabId, string>> = {},
): string {
  const parsed = parseLeafTab(leafTab)
  if (parsed?.main === mainTabId && parsed.sub) return parsed.sub
  return getSubTabForMain(mainTabId, subTabMemory)
}

export function rememberSubTabForMain(
  subTabMemory: Partial<Record<MainTabId, string>>,
  mainTabId: MainTabId,
  subTabId: string,
): void {
  if (subTabIdsByMain[mainTabId]?.includes(subTabId)) {
    subTabMemory[mainTabId] = subTabId
  }
}
