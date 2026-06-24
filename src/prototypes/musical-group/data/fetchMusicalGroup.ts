import { fetchCarouselImages } from './commonsImages'
import { sentenceCase } from './formatLabel'
import type { FetchMusicalGroupOptions, FetchMusicalGroupResult } from './types'
import {
  fetchEditIndicator,
  fetchEntityClaims,
  resolveEntityLabels,
  resolveMusicalTypeLabel,
  websiteHost,
} from './wikidataApi'

export async function fetchMusicalGroup(
  id: string,
  options: FetchMusicalGroupOptions = {},
): Promise<FetchMusicalGroupResult> {
  const { signal } = options

  const claims = await fetchEntityClaims(id, signal)

  // `resolveMusicalTypeLabel` doubles as validation: a successful query with no
  // musical-group subclass means this entity is not a musical group. A network
  // failure throws instead, so it surfaces as a load error rather than a
  // "not a musical group" rejection.
  const [typeLabel, labelMap, editIndicator, carouselResult] = await Promise.all([
    resolveMusicalTypeLabel(id, claims.typeIds, signal),
    resolveEntityLabels(claims.genreIds, signal).catch(() => new Map<string, string>()),
    fetchEditIndicator(id, signal).catch(() => undefined),
    fetchCarouselImages({
      label: claims.label,
      imageFilename: claims.imageFilename,
      commonsCategory: claims.commonsCategory,
      signal,
    }).catch(() => ({ images: [] })),
  ])

  if (!typeLabel) {
    throw new Error('Not a musical group')
  }

  const genres = claims.genreIds
    .map((genreId) => labelMap.get(genreId))
    .filter((label): label is string => Boolean(label))

  return {
    data: {
      id,
      label: claims.label,
      description: claims.description,
      typeLabel: sentenceCase(typeLabel),
      inceptionYear: claims.inceptionYear,
      genres,
      websiteUrl: claims.websiteUrl,
      websiteHost: claims.websiteUrl ? websiteHost(claims.websiteUrl) : undefined,
      images: carouselResult.images,
      editIndicator,
      enwikiTitle: claims.enwikiTitle,
      commonsCategory: claims.commonsCategory,
    },
  }
}
