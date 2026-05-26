import type { SuggestionCardData } from './veSuggestionCards'

function pickRandomItem<T>(items: T[]): T | null {
  if (!items.length) return null
  return items[Math.floor(Math.random() * items.length)] ?? null
}

export function pickRandomSuggestion(cards: SuggestionCardData[]): SuggestionCardData | null {
  if (!cards.length) return null

  const types = [...new Set(cards.map((card) => card.suggestionType))]
  const randomType = pickRandomItem(types)
  if (!randomType) return null

  const cardsOfType = cards.filter((card) => card.suggestionType === randomType)
  return pickRandomItem(cardsOfType)
}
