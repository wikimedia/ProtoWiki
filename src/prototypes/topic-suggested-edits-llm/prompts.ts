import { DISPLAY_HEADING_BY_TYPE } from '@/lib/ve-suggestions/veDisplayHeadings'

import { formatLlmUserContextSection, type LlmUserContext, wikiProjectLabel } from './llmUserContext'
import { KNOWN_SUGGESTION_TYPES } from './suggestionTypeFilter'

function suggestionTypeCatalog(): string {
  return KNOWN_SUGGESTION_TYPES.map(
    (type) => `- ${type}: ${DISPLAY_HEADING_BY_TYPE[type] ?? type}`,
  ).join('\n')
}

export function buildInitialPageTitlesPrompt(
  interest: string,
  count: number,
  userContext: LlmUserContext,
): string {
  const wikiLabel = wikiProjectLabel(userContext.lang)
  return `You are helping find ${wikiLabel} article titles for a volunteer editor.

${formatLlmUserContextSection(userContext)}

Their request: "${interest}"

Use the volunteer context when the request is broad or personal — prefer articles related to their interests, watchlist, or reading list when appropriate. For new editors, favor approachable topics.

Use exact, disambiguated Wikipedia titles when a name could mean multiple things (e.g. "Franz Ferdinand (band)" not "Franz Ferdinand"). When listing related pages, use the same disambiguation style throughout (if most entries are bands, include "(band)" on ambiguous band names too).

Return ONLY a JSON object with:
- "pages": an array of exactly ${count} entries — each entry is either an exact ${wikiLabel} main-namespace article title string, OR an object {"title":"…"} with optional "mode" ("edit" or "read"), optional "allowSuggestionTypes":[…] or "blockSuggestionTypes":[…] for page-specific filters (never both allow and block on the same page; prefer block unless the page needs a specific activity)
- optionally "mode": "edit" or "read" (default "edit") — global default for all pages. Use "read" when the volunteer wants to learn about a topic (reading list) rather than edit. Individual pages inherit this unless they set their own "mode".
- optionally "allowSuggestionTypes" OR "blockSuggestionTypes" (never both): global suggestion-type filter for edit-mode pages. Prefer "blockSuggestionTypes" when using your own judgement — block types that do not fit the request and leave the rest available. Use "allowSuggestionTypes" only when the volunteer explicitly asks for one specific kind of edit (e.g. "add links", "add references", "fix citations").
- optionally "pageSuggestionTypeFilters": an object mapping page title strings to {"allowSuggestionTypes":[…]} or {"blockSuggestionTypes":[…]} — per-page overrides of global filters; inline filters on page objects beat map entries, which beat global lists
- optionally "pageModes": an object mapping page title strings to "edit" or "read" — per-page overrides of the global "mode"

Pages without their own allow/block lists inherit the global lists. Pages without their own "mode" inherit the global "mode" (default "edit"). Per-page settings always beat global settings — inline "mode" on a page object beats "pageModes" map entries, which beat the top-level "mode". Read-mode pages appear as "Reading list" with the article summary — no edit suggestion. Edit-mode pages get live edit suggestions.

If the request is about learning, exploring, or reading up on a topic, set global "mode" to "read". If the request is about editing or improving articles, omit "mode" or use "edit". Mix both by setting global "mode" to "read" and overriding specific pages to "edit" (or the reverse).

Suggestion-type filters: when the volunteer names a specific activity, use "allowSuggestionTypes" with the matching id(s). When they give a broad topic without naming an edit type, either omit filter keys entirely or use "blockSuggestionTypes" to rule out poor fits (e.g. block "tone" and "textMatch" for a factual topic) — do not narrow to a single type unless they asked for it.

If the request does not mention a specific edit type, omit global filter keys or use a blocklist — never use an allowlist unless the request is explicit.

Known suggestion-type ids:
${suggestionTypeCatalog()}

Examples:
{"pages":["Cat","Dog","Lion"],"allowSuggestionTypes":["suggestedLink"]}
{"pages":["Climate change","Renewable energy","Carbon capture"],"blockSuggestionTypes":["tone","textMatch","doubleBold"]}
{"mode":"read","pages":["History of jazz","Bebop","Swing music","Cool jazz","Hard bop","Modal jazz","Free jazz","Jazz fusion","Dixieland","Ragtime"]}
{"mode":"read","pages":[{"title":"Bebop","mode":"edit","allowSuggestionTypes":["suggestedLink"]},{"title":"History of jazz","mode":"read"}]}
{"pages":[{"title":"Naval warfare","allowSuggestionTypes":["addReference"]},{"title":"Arms trade","blockSuggestionTypes":["tone","textMatch"]}]}
{"pages":["Victorian architecture","Gothic Revival architecture"]}

Do not include markdown or explanations.`
}

export function buildQuickSuggestionsPrompt(userContext: LlmUserContext): string {
  const hasPersonalSignals =
    userContext.editedPages.length > 0 ||
    userContext.readingList.length > 0 ||
    userContext.watchlist.length > 0

  const personalizationNote =
    hasPersonalSignals ?
      '- You may use at most one real article or topic name from the volunteer context when it fits naturally.'
    : '- Use generic broad topics only (e.g. jazz, Ancient Rome, climate change, film). Never imply the user has saved lists or edit history.'

  return `You are suggesting starter prompts for a Wikipedia volunteer on the newcomer homepage.

${formatLlmUserContextSection(userContext)}

Return ONLY a JSON array of exactly 2 short strings. Each string is submitted verbatim as the volunteer's request when they tap the suggestion — write natural queries they would type, not meta-instructions to a model (under 10 words).

Requirements:
- Every string must include at least one of: (a) a broad topic, or (b) a common edit type volunteers recognize.
- Never return a string with neither — e.g. do not use "Improve", "Help improve articles", or "Edit Wikipedia".
- Broad edit types are fine when used alone (e.g. "Add links", "Add references", "Fix citations") — but avoid obscure or internal tasks (no "fix year links", "disambiguation", "template params").
- Topic examples: "Learn about Surrealism", "Improve pages about jazz", "Explore Ancient Rome".
- Mix edit type + topic when natural (e.g. "Add links to music articles") — but one of the two strings may be edit-type-only and the other topic-focused.
- First string: prefer a common edit type (with optional broad topic).
- Second string: prefer a topic for learning or improving (with optional generic edit verb like "Learn about…" or "Improve pages about…").
${personalizationNote}
- Do not reference reading list, watchlist, or "pages you're watching" unless a real title from the volunteer context appears in the query.

Do not include markdown or explanations.`
}

export function buildReplacementPageTitlesPrompt(
  interest: string,
  missingTitles: string[],
  userContext: LlmUserContext,
  searchHints: Array<{ missingTitle: string; searchResults: string[] }> = [],
): string {
  const wikiLabel = wikiProjectLabel(userContext.lang)
  const hintsByTitle = new Map(
    searchHints.map((hint) => [hint.missingTitle.toLowerCase(), hint.searchResults]),
  )

  const missingEntries = missingTitles.map((title) => {
    const searchResults = hintsByTitle.get(title.toLowerCase()) ?? []
    return searchResults.length ? { missing: title, searchResults } : { missing: title }
  })

  const missingJson = JSON.stringify(missingEntries)
  return `The following ${wikiLabel} article titles do not exist or could not be found.

${missingJson}

For each entry, "searchResults" (when present) lists up to 10 real Wikipedia article titles from search — prefer picking an exact title from that list. Return one replacement per missing title, in the same order as the entries above.

${formatLlmUserContextSection(userContext)}

The volunteer editor's interest is: "${interest}"

Return ONLY a JSON array of exactly ${missingTitles.length} replacement strings. Each string must be an exact ${wikiLabel} article title in the main namespace, related to the interest.

Do not include markdown or explanations.`
}
