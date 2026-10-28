/**
 * Compile-time checks that payload mappers produce component prop types.
 * Import this module from nowhere — it exists only for `vue-tsc`.
 */
import type { WikitabCardData, WikitabFeaturedSpotlight } from '../sections'
import type { WikitabSearchActivityItem } from './fetchWikitabSearchActivity'
import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import type { WikitabSearchArticle } from './fetchWikitabSearchArticles'
import type { WikitabSearchImage } from './fetchWikitabSearchImages'
import {
  articleCardPayloadToCardData,
  featuredArticlePayloadToSpotlight,
  featuredImagePayloadToSpotlight,
  featuredListPayloadToSpotlight,
  featuredQuotePayloadToSpotlight,
  featuredWordPayloadToSpotlight,
  feedBirthsPayloadToCardData,
  feedDailyReadsPayloadToCardData,
  feedDiscussionPayloadToCardData,
  feedDykPayloadToCardData,
  feedNewsPayloadToCardData,
  feedOtdPayloadToCardData,
  feedSuggestedEditsPayloadToCardData,
  feedTrendingPayloadToCardData,
  savedArticlePayloadToCardData,
  savedDiscussionPayloadToCardData,
  savedImagePayloadToCardData,
  savedSnippetPayloadToCardData,
  savedSuggestionPayloadToCardData,
  searchActivityCardPayloadToItem,
  searchActivityItemToCardPayload,
  searchContributeCardPayloadToItem,
  searchContributeItemToCardPayload,
  searchArticleToResultCardPayload,
  searchImageCardPayloadToImage,
  searchImageToCardPayload,
  searchResultCardPayloadToArticle,
} from './wikitabCardPayloadMappers'
import type {
  WikitabSearchActivityCardPayload,
  WikitabSearchContributeCardPayload,
  WikitabSearchImageCardPayload,
  WikitabSearchResultCardPayload,
} from './wikitabCardPayloadTypes'

type _Card = WikitabCardData
type _Spotlight = WikitabFeaturedSpotlight

type _ArticlePrimitiveOut = ReturnType<typeof articleCardPayloadToCardData> extends _Card ? true : never
type _FeedTrendingOut = ReturnType<typeof feedTrendingPayloadToCardData> extends _Card ? true : never
type _FeedNewsOut = ReturnType<typeof feedNewsPayloadToCardData> extends _Card ? true : never
type _FeedDykOut = ReturnType<typeof feedDykPayloadToCardData> extends _Card ? true : never
type _FeedDiscussionsOut = ReturnType<typeof feedDiscussionPayloadToCardData> extends _Card ? true : never
type _FeedOtdOut = ReturnType<typeof feedOtdPayloadToCardData> extends _Card ? true : never
type _FeedBirthsOut = ReturnType<typeof feedBirthsPayloadToCardData> extends _Card ? true : never
type _FeedDailyReadsOut = ReturnType<typeof feedDailyReadsPayloadToCardData> extends _Card ? true : never
type _FeedSuggestedOut = ReturnType<typeof feedSuggestedEditsPayloadToCardData> extends _Card
  ? true
  : never

type _FeaturedArticleOut = ReturnType<typeof featuredArticlePayloadToSpotlight> extends _Spotlight
  ? true
  : never
type _FeaturedImageOut = ReturnType<typeof featuredImagePayloadToSpotlight> extends _Spotlight
  ? true
  : never
type _FeaturedListOut = ReturnType<typeof featuredListPayloadToSpotlight> extends _Spotlight
  ? true
  : never
type _FeaturedQuoteOut = ReturnType<typeof featuredQuotePayloadToSpotlight> extends _Spotlight
  ? true
  : never
type _FeaturedWordOut = ReturnType<typeof featuredWordPayloadToSpotlight> extends _Spotlight
  ? true
  : never

type _ActivityOut = ReturnType<typeof searchActivityCardPayloadToItem> extends WikitabSearchActivityItem
  ? true
  : never
type _ContributeOut = ReturnType<typeof searchContributeCardPayloadToItem> extends WikitabSearchContributeItem
  ? true
  : never
type _ResultOut = ReturnType<typeof searchResultCardPayloadToArticle> extends WikitabSearchArticle
  ? true
  : never
type _ImageOut = ReturnType<typeof searchImageCardPayloadToImage> extends WikitabSearchImage ? true : never

type _ActivityRoundTrip = ReturnType<
  typeof searchActivityItemToCardPayload
> extends WikitabSearchActivityCardPayload
  ? true
  : never
type _ContributeRoundTrip = ReturnType<
  typeof searchContributeItemToCardPayload
> extends WikitabSearchContributeCardPayload
  ? true
  : never
type _ResultRoundTrip = ReturnType<
  typeof searchArticleToResultCardPayload
> extends WikitabSearchResultCardPayload
  ? true
  : never
type _ImageRoundTrip = ReturnType<
  typeof searchImageToCardPayload
> extends WikitabSearchImageCardPayload
  ? true
  : never

type _SavedArticleOut = ReturnType<typeof savedArticlePayloadToCardData> extends _Card ? true : never
type _SavedSuggestionOut = ReturnType<typeof savedSuggestionPayloadToCardData> extends _Card ? true : never
type _SavedSnippetOut = ReturnType<typeof savedSnippetPayloadToCardData> extends _Card ? true : never
type _SavedDiscussionOut = ReturnType<typeof savedDiscussionPayloadToCardData> extends _Card ? true : never
type _SavedImageOut = ReturnType<typeof savedImagePayloadToCardData> extends _Card ? true : never
