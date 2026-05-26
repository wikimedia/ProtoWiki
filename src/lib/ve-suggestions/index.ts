export { VE_METHOD_COUNT, VE_METHODS, type VeMethodDescriptor } from './veMethods'
export {
  DISPLAY_HEADING_BY_TYPE,
  formatSuggestionType,
  headingForSuggestionType,
} from './veDisplayHeadings'
export {
  applySnippetHtmlFromCache,
  buildFallbackCard,
  buildSectionRanges,
  buildSectionTitleMap,
  buildSuggestionCard,
  hydrateCardsFromSnippetCache,
  isEligibleSuggestion,
  isEligibleSuggestionCard,
  isTransformedSnippetHtml,
  shouldShowSnippet,
  sortCards,
  editUrlForSuggestionCard,
  hydrateCardDescriptionParts,
  type SectionRange,
  type SuggestionCardData,
  type SuggestionDescriptionPart,
} from './veSuggestionCards'
export {
  clearCachedRun,
  getCachedRun,
  loadUiState,
  normalizePageTitle,
  saveUiState,
  setCachedRun,
  type CachedMethodResult,
  type CachedVeSuggestionsRun,
  type VeSuggestionsUiState,
} from './veSuggestionsCache'
export { pickRandomSuggestion } from './pickRandomSuggestion'
export {
  CHANGE_SIZE_BY_SUGGESTION_TYPE,
  CHANGE_SIZE_COLORS,
  changeSizeForSuggestionType,
  type SuggestionChangeSize,
} from './veSuggestionDifficulty'
export { stripLinksFromSnippetHtml, stripLinksFromWikitext } from './snippetLinkStrip'
export {
  cardsFromCachedRun,
  cardsFromMethodResults,
  createVeSuggestionsWiki,
  methodErrorsFromResults,
  runVeSuggestionsPipeline,
  type RunVeSuggestionsPipelineOptions,
  type VeSuggestionsPipelineProgress,
  type VeSuggestionsPipelineResult,
} from './runVeSuggestionsPipeline'
