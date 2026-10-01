import { t } from '@/i18n'

import {
  MODE_MODULE_ORDER,
  type SimplifiedModuleId,
  type WikitaLiteDashboardMode,
} from './dashboardMode'

/** Modules shown in the Configure layout dialog (Figma order tail is fixed). */
export const CONFIGURABLE_HOME_MODULE_IDS = [
  'furtherReading',
  'suggestedEdits',
  'mentor',
  'impact',
  'saved',
  'featured',
  'didYouKnow',
  'trending',
  'recentActivity',
  'activeDiscussions',
] as const

export type ConfigurableHomeModuleId = (typeof CONFIGURABLE_HOME_MODULE_IDS)[number]

/** Getters so each label reads the session's language (`?uselang=` / `?lang=`). */
export const CONFIGURABLE_HOME_MODULE_LABELS: Record<ConfigurableHomeModuleId, string> = {
  get furtherReading() {
    return t('data.layoutFurtherReading')
  },
  get suggestedEdits() {
    return t('data.layoutSuggestedEdits')
  },
  get mentor() {
    return t('data.layoutMentor')
  },
  get impact() {
    return t('data.layoutImpact')
  },
  get saved() {
    return t('data.layoutSaved')
  },
  get trending() {
    return t('data.layoutTrending')
  },
  get featured() {
    return t('data.layoutFeatured')
  },
  get didYouKnow() {
    return t('data.layoutDidYouKnow')
  },
  get recentActivity() {
    return t('data.layoutRecentActivity')
  },
  get activeDiscussions() {
    return t('data.layoutActiveDiscussions')
  },
}

const DEFAULT_OFF_MODULE_IDS: ConfigurableHomeModuleId[] = [
  'saved',
  'featured',
  'didYouKnow',
  'trending',
  'recentActivity',
  'activeDiscussions',
]

export interface HomeLayoutOverrides {
  homeOff: ConfigurableHomeModuleId[]
  homeOn: ConfigurableHomeModuleId[]
  homeOrder: ConfigurableHomeModuleId[]
}

export interface ResolvedHomeLayout {
  configureOrder: ConfigurableHomeModuleId[]
  enabledIds: Set<ConfigurableHomeModuleId>
  visibleOrder: ConfigurableHomeModuleId[]
}

export function isConfigurableHomeModuleId(id: string): id is ConfigurableHomeModuleId {
  return (CONFIGURABLE_HOME_MODULE_IDS as readonly string[]).includes(id)
}

export function isModuleEnabledByDefault(
  mode: WikitaLiteDashboardMode,
  moduleId: ConfigurableHomeModuleId,
): boolean {
  return (MODE_MODULE_ORDER[mode] as readonly string[]).includes(moduleId)
}

export function defaultConfigureListOrder(
  mode: WikitaLiteDashboardMode,
): ConfigurableHomeModuleId[] {
  const modeModules = MODE_MODULE_ORDER[mode] as ConfigurableHomeModuleId[]
  const tail = DEFAULT_OFF_MODULE_IDS.filter((id) => !modeModules.includes(id))
  return [...modeModules, ...tail]
}

function parseModuleIdList(
  raw: string,
  allowed: readonly ConfigurableHomeModuleId[],
): ConfigurableHomeModuleId[] {
  if (!raw.trim()) return []
  const ids: ConfigurableHomeModuleId[] = []
  for (const entry of raw.split(',')) {
    const id = entry.trim()
    if (!id || !allowed.includes(id as ConfigurableHomeModuleId)) continue
    if (!ids.includes(id as ConfigurableHomeModuleId)) {
      ids.push(id as ConfigurableHomeModuleId)
    }
  }
  return ids
}

export function parseHomeLayoutOverrides(query: {
  homeOff?: string
  homeOn?: string
  homeOrder?: string
}): HomeLayoutOverrides {
  const allowed = CONFIGURABLE_HOME_MODULE_IDS
  return {
    homeOff: parseModuleIdList(query.homeOff ?? '', allowed),
    homeOn: parseModuleIdList(query.homeOn ?? '', allowed),
    homeOrder: parseModuleIdList(query.homeOrder ?? '', allowed),
  }
}

export function resolveHomeLayout(
  mode: WikitaLiteDashboardMode,
  overrides: HomeLayoutOverrides,
): ResolvedHomeLayout {
  const defaultOrder = defaultConfigureListOrder(mode)
  const configureOrder =
    overrides.homeOrder.length === CONFIGURABLE_HOME_MODULE_IDS.length &&
    overrides.homeOrder.every((id) => isConfigurableHomeModuleId(id))
      ? overrides.homeOrder
      : defaultOrder

  const enabledIds = new Set<ConfigurableHomeModuleId>()
  for (const id of CONFIGURABLE_HOME_MODULE_IDS) {
    const defaultOn = isModuleEnabledByDefault(mode, id)
    const forcedOff = overrides.homeOff.includes(id)
    const forcedOn = overrides.homeOn.includes(id)
    const enabled = forcedOn || (defaultOn && !forcedOff)
    if (enabled) enabledIds.add(id)
  }

  const visibleOrder = configureOrder.filter((id) => enabledIds.has(id))

  return { configureOrder, enabledIds, visibleOrder }
}

export function serializeHomeLayoutOverrides(
  mode: WikitaLiteDashboardMode,
  overrides: HomeLayoutOverrides,
): { homeOff?: string; homeOn?: string; homeOrder?: string } {
  const next: { homeOff?: string; homeOn?: string; homeOrder?: string } = {}

  const homeOff = overrides.homeOff.filter((id) => isModuleEnabledByDefault(mode, id))
  const homeOn = overrides.homeOn.filter((id) => !isModuleEnabledByDefault(mode, id))

  const defaultOrder = defaultConfigureListOrder(mode)
  const orderDiffers =
    overrides.homeOrder.length === CONFIGURABLE_HOME_MODULE_IDS.length &&
    overrides.homeOrder.some((id, i) => id !== defaultOrder[i])

  if (homeOff.length) next.homeOff = homeOff.join(',')
  if (homeOn.length) next.homeOn = homeOn.join(',')
  if (orderDiffers) next.homeOrder = overrides.homeOrder.join(',')

  return next
}

export function toggleHomeModule(
  mode: WikitaLiteDashboardMode,
  overrides: HomeLayoutOverrides,
  moduleId: ConfigurableHomeModuleId,
  enabled: boolean,
): HomeLayoutOverrides {
  const defaultOn = isModuleEnabledByDefault(mode, moduleId)
  const homeOff = overrides.homeOff.filter((id) => id !== moduleId)
  const homeOn = overrides.homeOn.filter((id) => id !== moduleId)

  if (defaultOn) {
    if (!enabled) homeOff.push(moduleId)
  } else if (enabled) {
    homeOn.push(moduleId)
  }

  return { ...overrides, homeOff, homeOn }
}

export function reorderHomeModules(
  overrides: HomeLayoutOverrides,
  order: ConfigurableHomeModuleId[],
): HomeLayoutOverrides {
  return { ...overrides, homeOrder: order }
}

/** Map simplified module id to configurable id (identity for the 4 core modules). */
export function toConfigurableModuleId(id: SimplifiedModuleId): ConfigurableHomeModuleId {
  return id
}
