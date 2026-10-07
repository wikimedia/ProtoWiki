import type { WikitabSavedItem, WikitabSavedItemType } from './wikitabSavedItems'

export type WikitabSavedItemTab = 'all' | WikitabSavedItemType

export const WIKITAB_SAVED_ITEM_TAB_ORDER: readonly WikitabSavedItemType[] = [
  'article',
  'snippet',
  'suggestion',
  'change',
  'discussion',
  'image',
]

export const WIKITAB_SAVED_ITEM_TAB_LABELS: Record<WikitabSavedItemType, string> = {
  article: 'Articles',
  snippet: 'Snippets',
  suggestion: 'Suggestions',
  change: 'Edits',
  discussion: 'Discussions',
  image: 'Images',
}

export function savedItemTypesPresent(
  items: readonly WikitabSavedItem[],
): WikitabSavedItemType[] {
  const seen = new Set<WikitabSavedItemType>()
  for (const item of items) {
    seen.add(item.type)
  }
  return WIKITAB_SAVED_ITEM_TAB_ORDER.filter((type) => seen.has(type))
}

export function filterSavedItemsByTab(
  items: readonly WikitabSavedItem[],
  tab: WikitabSavedItemTab,
): WikitabSavedItem[] {
  if (tab === 'all') return [...items]
  return items.filter((item) => item.type === tab)
}

export function buildSavedItemTabs(
  items: readonly WikitabSavedItem[],
): { name: WikitabSavedItemTab; label: string }[] {
  const presentTypes = savedItemTypesPresent(items)
  if (presentTypes.length < 2) return []

  return [
    { name: 'all', label: 'All' },
    ...presentTypes.map((type) => ({
      name: type,
      label: WIKITAB_SAVED_ITEM_TAB_LABELS[type],
    })),
  ]
}
