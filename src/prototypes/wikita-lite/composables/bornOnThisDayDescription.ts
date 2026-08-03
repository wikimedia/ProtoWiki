import type { HomeBornOnThisDay } from '../../musical-group/data/types'

/** Prefer Wikipedia short description; fall back to parsing the on-this-day blurb. */
export function bornOnThisDayDescription(item: HomeBornOnThisDay): string | undefined {
  if (item.description?.trim()) return item.description.trim()

  const text = item.text.trim()
  if (!text) return undefined

  const titlePrefix = `${item.title},`
  if (text.toLowerCase().startsWith(titlePrefix.toLowerCase())) {
    const remainder = text.slice(titlePrefix.length).trim()
    return remainder.replace(/\s*\(born\s+\d+\)\s*$/i, '').trim() || undefined
  }

  const withoutBorn = text.replace(/\s*\(born\s+\d+\)\s*$/i, '').trim()
  if (withoutBorn.toLowerCase() === item.title.toLowerCase()) return undefined
  return withoutBorn || undefined
}

export function bornOnThisDayYearLabel(year: number): string {
  const age = new Date().getFullYear() - year
  return age === 1 ? '1 year old' : `${age} years old`
}
