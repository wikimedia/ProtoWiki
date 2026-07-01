import {
  commonsImageCountFromCategory,
  fetchCarouselImages,
  getCommonsCategoryCount,
  resolveCommonsCategory,
} from './commonsImages'
import { sentenceCase } from './formatLabel'
import type {
  CarouselImage,
  EditIndicator,
  FetchMusicalGroupOptions,
  FetchMusicalGroupResult,
  MusicalGroupData,
} from './types'
import type { EntityClassification, ParsedEntityClaims } from './wikidataApi'
import {
  classifyEntity,
  fetchEditIndicator,
  fetchEntityClaims,
  resolveEntityLabels,
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

interface RichExtras {
  images?: CarouselImage[]
  editIndicator?: EditIndicator
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}

/** Fields shared by performer + location records, given whatever enrichment is ready. */
function richSharedData(id: string, claims: ParsedEntityClaims, extras: RichExtras = {}) {
  return {
    id,
    label: claims.label,
    description: claims.description,
    inceptionYear: claims.inceptionYear,
    yearKind: claims.yearKind,
    websiteUrl: claims.websiteUrl,
    websiteHost: claims.websiteUrl ? websiteHost(claims.websiteUrl) : undefined,
    images: extras.images ?? [],
    editIndicator: extras.editIndicator,
    enwikiTitle: claims.enwikiTitle,
    commonsCategory: claims.commonsCategory,
    imageFilename: claims.imageFilename,
    commonsImageCount: extras.commonsImageCount,
    commonsImageCountCapped: extras.commonsImageCountCapped,
  }
}

interface IntroMedia {
  editIndicator?: EditIndicator
  images: CarouselImage[]
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}

/** Commons carousel + image count (+ optional edit indicator) — all non-SPARQL. */
async function fetchIntroMedia(
  id: string,
  claims: ParsedEntityClaims,
  options: { editIndicator: boolean; signal?: AbortSignal },
): Promise<IntroMedia> {
  const { signal } = options
  const category = resolveCommonsCategory({
    commonsCategory: claims.commonsCategory,
    label: claims.label,
  })

  const [editIndicator, carouselResult, categoryInfo] = await Promise.all([
    options.editIndicator
      ? fetchEditIndicator(id, signal).catch(() => undefined)
      : Promise.resolve(undefined),
    fetchCarouselImages({
      label: claims.label,
      imageFilename: claims.imageFilename ?? null,
      commonsCategory: claims.commonsCategory ?? null,
      signal,
    }).catch(() => ({ images: [] as CarouselImage[] })),
    category
      ? getCommonsCategoryCount(category, signal).catch(() => undefined)
      : Promise.resolve(undefined),
  ])

  const countMeta = categoryInfo ? commonsImageCountFromCategory(categoryInfo) : undefined

  return {
    editIndicator,
    images: carouselResult.images,
    commonsImageCount: countMeta?.count,
    commonsImageCountCapped: countMeta?.capped,
  }
}

function classificationTypeLabel(classification: EntityClassification): string | undefined {
  const raw = classification.isMusicPerformer
    ? classification.musicTypeLabel
    : classification.isLocation
      ? classification.locationTypeLabel
      : undefined
  return raw ? sentenceCase(raw) : undefined
}

export async function fetchMusicalGroup(
  id: string,
  options: FetchMusicalGroupOptions = {},
): Promise<FetchMusicalGroupResult> {
  const { signal, onPartial } = options

  // Stage 0: entity claims (fast Action API) and classification (a single WDQS
  // query) run in parallel. Everything shown in the title + facts is known once
  // both resolve — no further SPARQL on the critical path.
  const [claims, classification] = await Promise.all([
    fetchEntityClaims(id, signal),
    classifyEntity(id, signal),
  ])

  const performer = classification.isMusicPerformer
  const location = classification.isLocation
  const typeLabel = classificationTypeLabel(classification)

  // Emit a partial record so the UI can paint the title + facts immediately
  // while Stage 1 (images, genres, country, edit indicator) streams in.
  if (onPartial) {
    if (performer || location) {
      onPartial({
        ...richSharedData(id, claims),
        isMusicPerformer: performer,
        isLocation: location,
        typeLabel,
        genres: [],
        ...(location ? { population: claims.population } : {}),
      })
    } else {
      onPartial(sparseData(id, claims))
    }
  }

  // Stage 1: Commons media + label lookups — all Action / Commons API.
  if (!performer && !location) {
    const media = await fetchIntroMedia(id, claims, { editIndicator: false, signal })
    return {
      data: {
        ...sparseData(id, claims, media.images),
        commonsImageCount: media.commonsImageCount,
        commonsImageCountCapped: media.commonsImageCountCapped,
      },
    }
  }

  if (performer) {
    const [media, labelMap] = await Promise.all([
      fetchIntroMedia(id, claims, { editIndicator: true, signal }),
      resolveEntityLabels(claims.genreIds, signal).catch(() => new Map<string, string>()),
    ])

    const genres = claims.genreIds
      .map((genreId) => labelMap.get(genreId))
      .filter((label): label is string => Boolean(label))

    return {
      data: {
        ...richSharedData(id, claims, media),
        isMusicPerformer: true,
        isLocation: false,
        typeLabel,
        genres,
      },
    }
  }

  const countryId =
    claims.countryId && claims.countryId !== id ? claims.countryId : undefined

  const [media, countryLabel] = await Promise.all([
    fetchIntroMedia(id, claims, { editIndicator: true, signal }),
    countryId
      ? resolveEntityLabels([countryId], signal)
          .then((labels) => labels.get(countryId))
          .catch(() => undefined)
      : Promise.resolve(undefined),
  ])

  return {
    data: {
      ...richSharedData(id, claims, media),
      isMusicPerformer: false,
      isLocation: true,
      typeLabel,
      genres: [],
      country: countryLabel,
      population: claims.population,
    },
  }
}
