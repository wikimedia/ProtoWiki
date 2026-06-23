import { fetchCarouselImages } from './commonsImages'
import { sentenceCase } from './formatLabel'
import type { FetchMusicalGroupOptions, MusicalGroupData, CarouselImage } from './types'
import {
  fetchEditIndicator,
  fetchEntityClaims,
  isMusicalGroup,
  resolveEntityLabels,
  resolveMusicalTypeLabel,
  websiteHost,
} from './wikidataApi'

export async function fetchMusicalGroup(
  id: string,
  options: FetchMusicalGroupOptions = {},
): Promise<MusicalGroupData> {
  const { signal } = options

  const valid = await isMusicalGroup(id, signal)
  if (!valid) {
    throw new Error('Not a musical group')
  }

  const claims = await fetchEntityClaims(id, signal)

  const [typeLabel, labelMap, editIndicator, images] = await Promise.all([
    resolveMusicalTypeLabel(id, claims.typeIds, signal),
    resolveEntityLabels(claims.genreIds, signal),
    fetchEditIndicator(id, signal).catch(() => undefined),
    fetchCarouselImages({
      label: claims.label,
      imageFilename: claims.imageFilename,
      commonsCategory: claims.commonsCategory,
      signal,
    }).catch(() => [] as CarouselImage[]),
  ])

  const genres = claims.genreIds
    .map((genreId) => labelMap.get(genreId))
    .filter((label): label is string => Boolean(label))

  return {
    id,
    label: claims.label,
    description: claims.description,
    typeLabel: typeLabel ? sentenceCase(typeLabel) : undefined,
    inceptionYear: claims.inceptionYear,
    genres,
    websiteUrl: claims.websiteUrl,
    websiteHost: claims.websiteUrl ? websiteHost(claims.websiteUrl) : undefined,
    images,
    editIndicator,
  }
}
