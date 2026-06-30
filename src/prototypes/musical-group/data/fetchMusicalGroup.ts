import {
  commonsImageCountFromCategory,
  fetchCarouselImages,
  getCommonsCategoryCount,
  resolveCommonsCategory,
} from './commonsImages'
import { sentenceCase } from './formatLabel'
import type { FetchMusicalGroupOptions, FetchMusicalGroupResult, MusicalGroupData, CarouselImage } from './types'
import type { ParsedEntityClaims } from './wikidataApi'
import {
  fetchEditIndicator,
  fetchEntityClaims,
  isLocation,
  isMusicPerformer,
  resolveEntityLabels,
  resolveLocationTypeLabel,
  resolveMusicTypeLabel,
  websiteHost,
} from './wikidataApi'

function sparseData(id: string, claims: ParsedEntityClaims, images: CarouselImage[] = []): MusicalGroupData {
  return {
    id,
    label: claims.label,
    isMusicPerformer: false,
    isLocation: false,
    description: claims.description,
    genres: [],
    images,
    enwikiTitle: claims.enwikiTitle,
    commonsCategory: claims.commonsCategory,
    imageFilename: claims.imageFilename,
  }
}

async function fetchRichIntroData(
  id: string,
  claims: ParsedEntityClaims,
  signal?: AbortSignal,
) {
  const category = resolveCommonsCategory({
    commonsCategory: claims.commonsCategory,
    label: claims.label,
  })

  const [editIndicator, carouselResult, categoryInfo] = await Promise.all([
    fetchEditIndicator(id, signal).catch(() => undefined),
    fetchCarouselImages({
      label: claims.label,
      imageFilename: claims.imageFilename,
      commonsCategory: claims.commonsCategory,
      signal,
    }).catch(() => ({ images: [] })),
    category
      ? getCommonsCategoryCount(category, signal).catch(() => undefined)
      : Promise.resolve(undefined),
  ])

  const countMeta = categoryInfo ? commonsImageCountFromCategory(categoryInfo) : undefined

  return {
    editIndicator,
    carouselResult,
    commonsImageCount: countMeta?.count,
    commonsImageCountCapped: countMeta?.capped,
  }
}

export async function fetchMusicalGroup(
  id: string,
  options: FetchMusicalGroupOptions = {},
): Promise<FetchMusicalGroupResult> {
  const { signal } = options

  const [claims, performer, location] = await Promise.all([
    fetchEntityClaims(id, signal),
    isMusicPerformer(id, signal),
    isLocation(id, signal),
  ])

  if (!performer && !location) {
    const carouselResult = await fetchCarouselImages({
      label: claims.label,
      imageFilename: claims.imageFilename ?? null,
      commonsCategory: claims.commonsCategory ?? null,
      signal,
    }).catch(() => ({ images: [] as CarouselImage[] }))

    return { data: sparseData(id, claims, carouselResult.images) }
  }

  const { editIndicator, carouselResult, commonsImageCount, commonsImageCountCapped } =
    await fetchRichIntroData(id, claims, signal)

  const shared = {
    id,
    label: claims.label,
    description: claims.description,
    inceptionYear: claims.inceptionYear,
    yearKind: claims.yearKind,
    websiteUrl: claims.websiteUrl,
    websiteHost: claims.websiteUrl ? websiteHost(claims.websiteUrl) : undefined,
    images: carouselResult.images,
    editIndicator,
    enwikiTitle: claims.enwikiTitle,
    commonsCategory: claims.commonsCategory,
    imageFilename: claims.imageFilename,
    commonsImageCount,
    commonsImageCountCapped,
  }

  if (performer) {
    const [typeLabel, labelMap] = await Promise.all([
      resolveMusicTypeLabel(id, claims.typeIds, signal),
      resolveEntityLabels(claims.genreIds, signal).catch(() => new Map<string, string>()),
    ])

    const genres = claims.genreIds
      .map((genreId) => labelMap.get(genreId))
      .filter((label): label is string => Boolean(label))

    return {
      data: {
        ...shared,
        isMusicPerformer: true,
        isLocation: false,
        typeLabel: typeLabel ? sentenceCase(typeLabel) : undefined,
        genres,
      },
    }
  }

  const [typeLabel, countryLabel] = await Promise.all([
    resolveLocationTypeLabel(id, signal),
    claims.countryId
      ? resolveEntityLabels([claims.countryId], signal)
          .then((labels) => labels.get(claims.countryId!))
          .catch(() => undefined)
      : Promise.resolve(undefined),
  ])

  return {
    data: {
      ...shared,
      isMusicPerformer: false,
      isLocation: true,
      typeLabel: typeLabel ? sentenceCase(typeLabel) : undefined,
      description: claims.description ? sentenceCase(claims.description) : undefined,
      genres: [],
      country: countryLabel,
      population: claims.population,
    },
  }
}
