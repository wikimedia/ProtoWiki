import { WIKITAB_SECTIONS, type WikitabSectionId } from './sections'

const VALID_IDS = new Set<WikitabSectionId>(WIKITAB_SECTIONS.map((section) => section.id))

function isSectionId(value: string): value is WikitabSectionId {
  return VALID_IDS.has(value as WikitabSectionId)
}

/** Read `?pinned=trending,dyk` — unknown and duplicate ids are dropped. */
export function readPinnedFromUrl(): WikitabSectionId[] {
  if (typeof window === 'undefined') return []

  const raw = new URLSearchParams(window.location.search).get('pinned')
  if (!raw) return []

  const seen = new Set<WikitabSectionId>()
  const ids: WikitabSectionId[] = []

  for (const part of raw.split(',')) {
    const id = part.trim()
    if (!id || !isSectionId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  return ids
}

/** Write pin state to the URL without disturbing other query params. */
export function writePinnedToUrl(ids: WikitabSectionId[]): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  if (ids.length) {
    url.searchParams.set('pinned', ids.join(','))
  } else {
    url.searchParams.delete('pinned')
  }

  window.history.replaceState(window.history.state, '', url)
}
