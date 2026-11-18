import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

export interface Question {
  /** Sentence text before the blank. */
  before: string
  /** Sentence text after the blank. */
  after: string
  answer: string
  /** Three options (answer + two distractors), shuffled. */
  options: string[]
  /** Article the sentence came from. */
  sourceTitle: string
  /** The whole source article, for "See in context". Shared between questions. */
  article: ArticleBlock[]
  /** Where the question's sentence sits in `article`. */
  blockIndex: number
  sentenceIndex: number
}

/** A section heading, or a paragraph split into the same sentences the quiz uses. */
export interface ArticleBlock {
  type: 'heading' | 'paragraph'
  /** Heading level (2 = top-level section). Headings only. */
  level?: number
  /** Paragraph: its sentences. Heading: one entry, the heading text. */
  sentences: string[]
}

export interface ArticleSuggestion {
  /** French article title — what the quiz is built from. */
  title: string
  /** What the user sees: the English title when found via English search. */
  label: string
  description?: string
  thumbnail?: string
}

export const QUIZ_LANG = 'fr'
export const QUESTION_COUNT = 10

const MIN_QUESTIONS = 3
const RELATED_LIMIT = 10
/** Questions come from the chosen article plus this many related ones. */
const RELATED_ARTICLES = 2
const MIN_SENTENCES_PER_RELATED = 3
const MIN_WORD_LENGTH = 4

const host = wikiHostFromLang(QUIZ_LANG)
/** Article search also accepts English titles, mapped to French via langlinks. */
const SEARCH_LANG = 'en'
const searchHost = wikiHostFromLang(SEARCH_LANG)
const SUGGESTION_LIMIT = 8

async function api(params: Record<string, string>, signal: AbortSignal, apiHost = host) {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  const response = await fetch(`https://${apiHost}/w/api.php?${query.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('fill-the-blank'),
  })
  if (!response.ok) throw new Error(`Wikipedia request failed (${response.status})`)
  return response.json()
}

/**
 * Pages that aren't prose about one subject — lists, timelines and
 * disambiguation pages — make poor quizzes (and poor topics), so they're
 * skipped in search and in the related articles. Disambiguation pages are
 * caught by their `disambiguation` page prop; the title check is a backup.
 */
const NON_PROSE_TITLE =
  /^(lists? of|liste?s? (de|des|du|d['’])|chronologie|timeline of)\b|\((disambiguation|homonymie)\)$/i

function isProsePage(page: { title: string; pageprops?: { disambiguation?: string } }): boolean {
  return page.pageprops?.disambiguation === undefined && !NON_PROSE_TITLE.test(page.title)
}

interface RawSearchPage {
  title: string
  index: number
  description?: string
  thumbnail?: { source: string }
  langlinks?: { lang: string; title: string }[]
  pageprops?: { disambiguation?: string }
}

async function prefixSearch(
  prefix: string,
  apiHost: string,
  extra: Record<string, string>,
  signal: AbortSignal,
): Promise<RawSearchPage[]> {
  const data = await api(
    {
      action: 'query',
      generator: 'prefixsearch',
      gpssearch: prefix,
      // Over-fetch: lists and disambiguation pages get filtered out below.
      gpslimit: String(SUGGESTION_LIMIT * 2),
      gpsnamespace: '0',
      prop: 'description|pageimages|pageprops',
      ppprop: 'disambiguation',
      piprop: 'thumbnail',
      pithumbsize: '80',
      redirects: '1',
      ...extra,
    },
    signal,
    apiHost,
  )
  return ((data.query?.pages ?? []) as RawSearchPage[])
    .filter(isProsePage)
    .sort((a, b) => a.index - b.index)
}

/**
 * Title suggestions for the article lookup. Searches English and French
 * Wikipedia in parallel: English hits are kept only when they link to a French
 * article (and resolve to that French title); French hits fill in after, so
 * typing a French title still works. Deduped by French title.
 */
export async function searchArticles(prefix: string, signal: AbortSignal): Promise<ArticleSuggestion[]> {
  const [enPages, frPages] = await Promise.all([
    prefixSearch(
      prefix,
      searchHost,
      { prop: 'description|pageimages|pageprops|langlinks', lllang: QUIZ_LANG, lllimit: 'max' },
      signal,
    ).catch((error) => {
      if (signal.aborted) throw error
      return [] as RawSearchPage[]
    }),
    prefixSearch(prefix, host, {}, signal),
  ])

  const suggestions: ArticleSuggestion[] = []
  const seen = new Set<string>()
  const add = (s: ArticleSuggestion) => {
    if (seen.has(s.title)) return
    seen.add(s.title)
    suggestions.push(s)
  }

  for (const p of enPages) {
    const frTitle = p.langlinks?.find((l) => l.lang === QUIZ_LANG)?.title
    // The French side can still be a list even when the English title isn't.
    if (frTitle && !NON_PROSE_TITLE.test(frTitle)) add({ title: frTitle, label: p.title, description: p.description, thumbnail: p.thumbnail?.source })
  }
  for (const p of frPages) {
    add({ title: p.title, label: p.title, description: p.description, thumbnail: p.thumbnail?.source })
  }
  return suggestions.slice(0, SUGGESTION_LIMIT)
}

async function relatedTitles(seed: string, signal: AbortSignal): Promise<string[]> {
  const data = await api(
    {
      action: 'query',
      generator: 'search',
      gsrsearch: `morelike:${seed}`,
      gsrlimit: String(RELATED_LIMIT),
      gsrnamespace: '0',
      prop: 'pageprops',
      ppprop: 'disambiguation',
    },
    signal,
  )
  return ((data.query?.pages ?? []) as { title: string; index: number; pageprops?: { disambiguation?: string } }[])
    .filter(isProsePage)
    .sort((a, b) => a.index - b.index)
    .map((p) => p.title)
}

/**
 * Plain text of a whole article. Full extracts are one page per request, so we
 * only ever fetch a handful (the chosen article plus a few related candidates).
 */
async function fetchArticleText(title: string, signal: AbortSignal): Promise<string> {
  try {
    const data = await api(
      {
        action: 'query',
        prop: 'extracts',
        explaintext: '1',
        // `== Heading ==` markers, so headings can't be mistaken for paragraphs.
        exsectionformat: 'wiki',
        redirects: '1',
        titles: title,
      },
      signal,
    )
    return data.query?.pages?.[0]?.extract ?? ''
  } catch (error) {
    if (signal.aborted) throw error
    return ''
  }
}

interface Token {
  word: string
  start: number
  end: number
}

interface Candidate {
  sentence: string
  tokens: Token[]
  sourceTitle: string
  article: ArticleBlock[]
  blockIndex: number
  sentenceIndex: number
}

/**
 * Sentence boundaries: whitespace after end punctuation and before an upper-case
 * letter / quote. Needs two non-space chars before the punctuation so initials
 * like "M. Dupont" or "J. R. R." don't split.
 */
const SENTENCE_END =
  /(?<=[^\s.]{2}[.!?…])(?<!\b(?:av|apr|env|cf|vol|chap|art|éd|etc|réf|St|Ste)\.)\s+(?=[«"A-ZÀ-ÖØ-Þ])/g
const WORD = /[a-zà-öø-ÿœæ]+(?:-[a-zà-öø-ÿœæ]+)*/gi

/**
 * Editorial / wiki clutter that survives into plain-text extracts — skip any
 * sentence carrying it rather than trying to clean it up:
 * - square brackets: maintenance tags like "[réf. nécessaire]", "[Lequel ?]",
 *   "[source insuffisante]", footnote markers "[1]", "[a]"
 * - interlanguage link markers from {{Lien}}: "Kemosabe (en)", "(de)", "(ja)"
 */
const WIKI_CLUTTER = /[[\]]|\((?:[a-z]{2,3}|[a-z]{2}-[a-z]+)\)/

/** Sentences that make a good quiz question. */
function isQuizSentence(s: string): boolean {
  return (
    s.length >= 40 &&
    s.length <= 220 &&
    /[.!?…]$/.test(s) &&
    !WIKI_CLUTTER.test(s) &&
    // A fragment left by a missed abbreviation split, e.g. "J.-C., César est…"
    !/^[A-ZÀ-Þ]\./.test(s)
  )
}

const HEADING = /^(={2,6})\s*(.+?)\s*\1$/
/** End matter: references, links, bibliography — not prose, so stop there. */
const END_MATTER = /^(notes?( et références)?|références|voir aussi|bibliographie|liens externes|articles connexes|annexes)$/i

/** Parse a plain-text extract (with `== Heading ==` markers) into headings and paragraphs. */
function parseArticle(text: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const heading = line.match(HEADING)
    if (heading) {
      if (END_MATTER.test(heading[2])) break
      blocks.push({ type: 'heading', level: heading[1].length, sentences: [heading[2]] })
      continue
    }
    const sentences = line
      .split(SENTENCE_END)
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
    if (sentences.length) blocks.push({ type: 'paragraph', sentences })
  }
  // Drop headings with nothing under them (empty sections, or tables/lists the
  // extract left out): keep one only if a paragraph or a subsection follows.
  return blocks.filter((block, i) => {
    if (block.type === 'paragraph') return true
    const next = blocks[i + 1]
    return next !== undefined && (next.type === 'paragraph' || (next.level ?? 0) > (block.level ?? 0))
  })
}

/**
 * Words worth blanking: lower-case (skips proper nouns and sentence starts),
 * long enough to carry meaning, and not part of the article title.
 */
function blankableTokens(sentence: string, title: string): Token[] {
  const titleWords = new Set(title.toLowerCase().split(/[\s'’()-]+/))
  const tokens: Token[] = []
  for (const match of sentence.matchAll(WORD)) {
    const word = match[0]
    if (word.length < MIN_WORD_LENGTH) continue
    if (word !== word.toLowerCase()) continue
    if (titleWords.has(word)) continue
    tokens.push({ word, start: match.index ?? 0, end: (match.index ?? 0) + word.length })
  }
  return tokens
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Shared trailing letters — e.g. "chanteuse" / "première" share 1, "formé" / "publié" share 1. */
function sharedSuffix(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

/**
 * Wrong options that look like they could fit: prefer words with the same ending
 * (often the same part of speech / agreement in French) and a similar length.
 */
function pickDistractors(answer: string, pool: string[]): string[] {
  const score = (w: string) =>
    Math.min(sharedSuffix(w, answer), 3) * 3 - Math.abs(w.length - answer.length) + Math.random() * 2
  const ranked = shuffle(pool).sort((a, b) => score(b) - score(a))
  const seen = new Set([answer.toLowerCase()])
  const picked: string[] = []
  for (const word of ranked) {
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(word)
    if (picked.length === 2) break
  }
  return picked
}

export class QuizError extends Error {}

export async function fetchQuestions(seed: string, signal: AbortSignal): Promise<Question[]> {
  const related = (await relatedTitles(seed, signal)).filter((t) => t !== seed)
  // Fetch a few spare related articles so a stub doesn't leave us short of two.
  const titles = [seed, ...related.slice(0, RELATED_ARTICLES + 2)]
  const texts = await Promise.all(titles.map((t) => fetchArticleText(t, signal)))

  const candidatesFor = (title: string, text: string): Candidate[] => {
    const article = parseArticle(text)
    const candidates: Candidate[] = []
    article.forEach((block, blockIndex) => {
      if (block.type !== 'paragraph') return
      block.sentences.forEach((sentence, sentenceIndex) => {
        if (!isQuizSentence(sentence)) return
        const tokens = blankableTokens(sentence, title)
        if (tokens.length) candidates.push({ sentence, tokens, sourceTitle: title, article, blockIndex, sentenceIndex })
      })
    })
    return shuffle(candidates)
  }

  const seedCandidates = candidatesFor(seed, texts[0])
  const relatedCandidates = titles
    .slice(1)
    .map((title, i) => candidatesFor(title, texts[i + 1]))
    .filter((list) => list.length >= MIN_SENTENCES_PER_RELATED)
    .slice(0, RELATED_ARTICLES)
  const perArticle = [seedCandidates, ...relatedCandidates].filter((list) => list.length)

  // Round-robin across articles (chosen article first) so the quiz spans the topic.
  const chosen: Candidate[] = []
  for (let round = 0; chosen.length < QUESTION_COUNT; round++) {
    let added = false
    for (const list of perArticle) {
      if (list[round] && chosen.length < QUESTION_COUNT) {
        chosen.push(list[round])
        added = true
      }
    }
    if (!added) break
  }

  const wordPool = perArticle.flat().flatMap((c) => c.tokens.map((t) => t.word))
  const questions = chosen
    .map((c): Question | null => {
      const token = c.tokens[Math.floor(Math.random() * c.tokens.length)]
      const distractors = pickDistractors(token.word, wordPool)
      if (distractors.length < 2) return null
      return {
        before: c.sentence.slice(0, token.start),
        after: c.sentence.slice(token.end),
        answer: token.word,
        options: shuffle([token.word, ...distractors]),
        sourceTitle: c.sourceTitle,
        article: c.article,
        blockIndex: c.blockIndex,
        sentenceIndex: c.sentenceIndex,
      }
    })
    .filter((q): q is Question => q !== null)

  if (questions.length < MIN_QUESTIONS) {
    throw new QuizError(`Couldn’t find enough French sentences about “${seed}”. Try another article.`)
  }
  return shuffle(questions)
}

export function articleUrl(title: string): string {
  return `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}
