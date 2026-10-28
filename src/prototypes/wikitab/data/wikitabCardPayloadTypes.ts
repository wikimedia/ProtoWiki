import type { WikitabFeaturedSpotlightKind } from '../sections'
import type { EditorKind } from './fetchWikitabSearchActivity'
import type { CodexIconName } from './wikitabCardSupportingIcons'
export type { CodexIconName } from './wikitabCardSupportingIcons'

/**
 * Domain payloads for Wikitab cards — semantic field names. Each variant maps to
 * a component prop type via `wikitabCardPayloadMappers.ts` (`WikitabCardData`,
 * `WikitabFeaturedSpotlight`, search item records, …).
 */

export type WikitabCardPayloadKey = { key: string }

/** Wikipedia (or sister-wiki) page this card is about (URL + display title). */
export type WikitabCardPayloadArticleLink = {
  url: string
  title: string
}

/** Noticeboard thread URL (section anchor on a wiki page). */
export type WikitabCardPayloadDiscussionLink = {
  url: string
}

/** Commons or other file description page (URL only; file name is derived at map time). */
export type WikitabCardPayloadFilePageLink = {
  url: string
}

/** Snippet cards — destination URL only; the hook HTML carries the subject. */
export type WikitabCardPayloadSnippetLink = {
  url: string
}

/** Optional supporting line under the card body. */
export type WikitabCardPayloadSupportingFields = {
  supportingText?: string
  supportingIcon?: CodexIconName
  /** When set, maps to `supportingHtml` on the card (takes precedence over `supportingText`). */
  supportingHtml?: string
  /** End-aligned caption on a split supporting row. */
  supportingTextEnd?: string
}

/** Article-linked Featured kinds (`potd` uses {@link WikitabFeaturedImageCardPayload}). */
export type WikitabFeaturedArticleSpotlightKind = Exclude<WikitabFeaturedSpotlightKind, 'potd'>

export const WIKITAB_FEATURED_ARTICLE_SPOTLIGHT_KINDS = [
  'tfa',
  'tfp',
] as const satisfies readonly WikitabFeaturedArticleSpotlightKind[]

type WikitabFeaturedPayloadMeta = {
  label: string
  feedAttributionLabel?: string
}

/**
 * Article primitive — thumbnail `WikitabCard` (title, description, supporting line).
 * Module payloads (e.g. trending `pageViews`) map into this shape in mappers.
 */
export type WikitabArticleCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink & {
    description?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Trending — thumbnail variant (`WikitabCard`). */
export type WikitabFeedTrendingCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink & {
    description?: string
    thumbnailUrl?: string
    /** Page views — mapper sets supporting line + presentation supplies chart icon. */
    pageViews: number
  }

/** In the news — text snippet. */
export type WikitabFeedNewsCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadSnippetLink & {
    /** Hook / story HTML — presentation uses `descriptionFormat: 'html'`. */
    description: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Did you know — text snippet. */
export type WikitabFeedDykCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadSnippetLink & {
    /** Hook HTML — presentation uses `descriptionFormat: 'html'`. */
    description: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Active discussions. */
export type WikitabFeedDiscussionCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadDiscussionLink & {
    /** Thread subject — maps to the card’s bold title line. */
    title: string
    /** Noticeboard category label — maps to the card `description` line. */
    noticeboardTitle: string
    commentCount: number
    latestReplyTimestamp: string
  } & WikitabCardPayloadSupportingFields

/** On this day — text snippet. */
export type WikitabFeedOtdCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadSnippetLink & {
    /** Event hook HTML — presentation uses `descriptionFormat: 'html'`. */
    description: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Birthdays — thumbnail variant. */
export type WikitabFeedBirthsCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink & {
    ageYears: number
    description?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Daily reads module. */
export type WikitabFeedDailyReadsCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink & {
    seedTitle: string
    description?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Suggested edits home module (`WikitabCard`). */
export type WikitabFeedSuggestedEditsCardPayload = WikitabCardPayloadKey & {
  url: string
  title: string
  /** Edit-opportunity task id — `card.task`, save identity, and `supportingHtml` label. */
  task: string
  description?: string
  thumbnailUrl?: string
  supportingTextEnd?: string
}

/**
 * Featured module — article-linked spotlight (TFA, TFP).
 * `kind` selects layout in `WikitabFeaturedCard`; `label` is the supporting string.
 */
export type WikitabFeaturedArticleCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink &
  WikitabFeaturedPayloadMeta & {
    kind: WikitabFeaturedArticleSpotlightKind
    cardTitle?: string
    description?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Featured module — Commons / file-page spotlight (POTD). */
export type WikitabFeaturedImageCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadFilePageLink & {
    /** Caption plain text or HTML — maps to card `description` (`descriptionFormat: 'html'` when HTML). */
    caption?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Featured / saved list (`WikitabFeaturedCard`, kind `tfl`). */
export type WikitabFeaturedListCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink & {
    description?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Featured / saved quote (`WikitabFeaturedCard`, kind `qotd`). */
export type WikitabFeaturedQuoteCardPayload = WikitabCardPayloadKey & {
  url: string
  /** Quotee — mapper sets card `description` from this field. */
  name: string
  quote: string
  thumbnailUrl?: string
} & WikitabCardPayloadSupportingFields

/** Featured / saved word (`WikitabFeaturedCard`, kind `wotd`). */
export type WikitabFeaturedWordCardPayload = WikitabCardPayloadKey & {
  url: string
  word: string
  /** Wiktionary gloss HTML — maps to card `description` (`descriptionFormat: 'html'`). */
  definition: string
  thumbnailUrl?: string
} & WikitabCardPayloadSupportingFields

/** Edit / change card payload → `WikitabCard` via `searchActivityPayloadToCardData`. */
export type WikitabSearchActivityCardPayload = {
  title: string
  /** Wiki section heading from a section-level edit (optional). */
  section?: string
  /** Free-text portion of the edit summary (optional). */
  editSummary?: string
  thumbnailUrl?: string
  delta?: number
  articleUrl: string
  revisionId: number
  reverted: boolean
  highRevertRisk: boolean
  needsReview?: boolean
  isLatestRevision: boolean
  editorName: string
  editorUrl: string
  /** MediaWiki revision timestamp (ISO or `YYYY-MM-DD HH:MM:SS` UTC). */
  editedTimestamp: string
  editorKind: EditorKind
}

/** `WikitabSearchContributeCard` prop (`item`). */
export type WikitabSearchContributeCardPayload = {
  title: string
  description?: string
  thumbnailUrl?: string
  task: string
  url: string
}

/** `WikitabSearchResultCard` prop (`article`). */
export type WikitabSearchResultCardPayload = {
  title: string
  url: string
  description?: string
  /** Lead extract (plain) or full-text hit snippet (HTML with `<strong>` hits). */
  extractHtml?: string
  /** “Why am I seeing this?” dialog body (HTML). */
  rationaleHtml?: string
  thumbnailUrl?: string
  /** Supporting row — page views (chart icon). Omit to hide that signal. */
  pageViews?: number
  /** Supporting row — reference count (reference icon). Omit to hide that signal. */
  referenceCount?: number
  /** Supporting row — last revision time (ISO UTC). Omit to hide that signal. */
  lastUpdated?: string
}

/** `WikitabSearchImageCard` prop (`image`). */
export type WikitabSearchImageCardPayload = {
  thumbnailUrl: string
  url: string
  /** Plain-text license label (Commons LicenseShortName). */
  license: string
  /** Plain-text creator credit (Commons Artist metadata — photographer, author, etc.). */
  credit: string
  caption: string
}

/** Saved — article (`WikitabCard`). */
export type WikitabSavedArticleCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadArticleLink & {
    description?: string
    thumbnailUrl?: string
  } & WikitabCardPayloadSupportingFields

/** Saved — DYK hook / In the news story (`WikitabCard`), same shape as the feed card. */
export type WikitabSavedSnippetCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadSnippetLink & {
    /** Hook / story HTML — presentation uses `descriptionFormat: 'html'`. */
    description: string
    thumbnailUrl?: string
  }

/** Saved — suggestion (`WikitabCard`). */
export type WikitabSavedSuggestionCardPayload = WikitabCardPayloadKey & {
  url: string
  title: string
  /** Edit-opportunity task id — `card.task`, save identity, and `supportingHtml` label. */
  task: string
  description?: string
  thumbnailUrl?: string
}

/** Saved — discussion (`WikitabCard`). */
export type WikitabSavedDiscussionCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadDiscussionLink & {
    title: string
    noticeboardTitle: string
    commentCount: number
    latestReplyRelativeLabel: string
  } & WikitabCardPayloadSupportingFields

/** Saved — image (`WikitabCard`). */
export type WikitabSavedImageCardPayload = WikitabCardPayloadKey &
  WikitabCardPayloadFilePageLink & {
    thumbnailUrl: string
    /** Plain caption or HTML — maps to card `description`; presentation picks saved-image variant. */
    caption?: string
    attributionPlainText?: string
  } & WikitabCardPayloadSupportingFields
