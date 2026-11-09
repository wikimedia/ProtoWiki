/**
 * Growth-style task lookups on the Action API — Wikipedia's own "this article
 * needs…" signals: maintenance templates editors placed, and "Add a link"
 * machine recommendations. Each call also returns descriptions and thumbnails.
 */

import { wikimediaApiFetchHeaders } from '@/config'

import { ALL_TASK_TEMPLATES } from './editTaskTypes'

/* The task templates are English Wikipedia's, so the lookups are too. */
const HOST = 'en.wikipedia.org'

export interface TaskPage {
  title: string
  description?: string
  thumbnailUrl?: string
  /** Task templates on the page (names without `Template:`). */
  templates: string[]
}

interface ApiPage {
  title: string
  index?: number
  missing?: boolean
  description?: string
  thumbnail?: { source?: string }
  templates?: { title: string }[]
}

/** Action API allows 50 titles per query. */
const MAX_TITLES_PER_QUERY = 50

const PAGE_PROPS = {
  prop: 'templates|pageimages|description',
  tltemplates: ALL_TASK_TEMPLATES.map((name) => `Template:${name}`).join('|'),
  tllimit: 'max',
  piprop: 'thumbnail',
  // Large Codex card thumbnails are 96px — 2× for sharp screens.
  pithumbsize: '200',
  format: 'json',
  formatversion: '2',
  origin: '*',
}

async function query(params: Record<string, string>, signal?: AbortSignal): Promise<TaskPage[]> {
  const search = new URLSearchParams({ action: 'query', ...PAGE_PROPS, ...params })
  const response = await fetch(`https://${HOST}/w/api.php?${search.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('home-edit-tasks'),
  })
  if (!response.ok) throw new Error(`Failed to load edit tasks (HTTP ${response.status}).`)

  const data = (await response.json()) as { query?: { pages?: ApiPage[] } }
  return [...(data.query?.pages ?? [])]
    .filter((page) => !page.missing)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({
      title: page.title,
      description: page.description,
      thumbnailUrl: page.thumbnail?.source,
      templates: (page.templates ?? []).map((t) => t.title.replace(/^Template:/, '')),
    }))
}

/** Task templates, descriptions and thumbnails for known titles, in one call (≤ 50). */
export function fetchTaskPages(titles: string[], signal?: AbortSignal): Promise<TaskPage[]> {
  if (!titles.length) return Promise.resolve([])
  return query({ titles: titles.slice(0, MAX_TITLES_PER_QUERY).join('|') }, signal)
}

/** Articles mentioning `seed` that carry a task template, best match first. */
export function fetchTemplateTasksAbout(
  seed: string,
  limit: number,
  signal?: AbortSignal,
): Promise<TaskPage[]> {
  return query(
    {
      generator: 'search',
      gsrsearch: `hastemplate:"${ALL_TASK_TEMPLATES.join('|')}" "${seed.replace(/"/g, '')}"`,
      gsrnamespace: '0',
      gsrlimit: String(limit),
    },
    signal,
  )
}

/** Articles linking to `seed` that have an "Add a link" recommendation. */
export function fetchLinkRecommendations(
  seed: string,
  limit: number,
  signal?: AbortSignal,
): Promise<TaskPage[]> {
  return query(
    {
      generator: 'search',
      gsrsearch: `hasrecommendation:link linksto:"${seed.replace(/"/g, '')}"`,
      gsrnamespace: '0',
      gsrlimit: String(limit),
    },
    signal,
  )
}

/** A random sample of articles carrying any task template (Growth's pool, unpersonalised). */
export function fetchRandomTaskPages(limit: number, signal?: AbortSignal): Promise<TaskPage[]> {
  return query(
    {
      generator: 'search',
      gsrsearch: `hastemplate:"${ALL_TASK_TEMPLATES.join('|')}"`,
      gsrnamespace: '0',
      gsrsort: 'random',
      gsrlimit: String(limit),
    },
    signal,
  )
}
