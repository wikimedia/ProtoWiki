export interface SavedCollectionDef {
  id: string
  name: string
  description: string
}

/** Mock user-curated collections — a real app would let the user create/name these. */
export const SAVED_COLLECTIONS: SavedCollectionDef[] = [
  { id: 'actors', name: 'actors', description: 'all the actors i like' },
  { id: 'fashion-designers', name: 'fashion designers', description: 'cool designers' },
  { id: 'random', name: 'random', description: 'random thingz' },
]
