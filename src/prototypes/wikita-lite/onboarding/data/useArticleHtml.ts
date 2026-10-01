import { onScopeDispose, ref, watch, type Ref } from 'vue'

import { wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'
import { directionForLang, type TextDirection } from '@/i18n/direction'
import { getContentLang } from '@/lib/contentLang'

/**
 * Minimal live-article body fetch for the read screen. Mirrors `ArticleLive`'s
 * REST call (`GET /api/rest_v1/page/html/{title}`) and parser-body extraction,
 * but exposes the raw HTML so the screen can compose its own `ArticleHeader`
 * (which forwards the bookmark click `ArticleLive`/`ArticleWrapper` swallow).
 */

interface ParsedArticle {
  html: string
  lang: string
  dir: TextDirection
}

const bodyCache = new Map<string, ParsedArticle>()

/** Parser body plus the `lang` / `dir` Parsoid puts on `<body>`. */
function extractParserOutput(raw: string, fallbackLang: string): ParsedArticle {
  const bodyMatch = raw.match(/<body([^>]*)>([\s\S]*?)<\/body>/i)
  const attrs = bodyMatch?.[1] ?? ''
  const lang = attrs.match(/\blang="([^"]+)"/i)?.[1] ?? fallbackLang
  const dir = attrs.match(/\bdir="(ltr|rtl)"/i)?.[1] as TextDirection | undefined
  return {
    html: bodyMatch ? bodyMatch[2] : raw,
    lang,
    dir: dir ?? directionForLang(lang),
  }
}

export interface UseArticleHtml {
  html: Ref<string | null>
  /** Content language / direction for `ArticleRenderer` (`mw-content-rtl` on arwiki). */
  lang: Ref<string>
  dir: Ref<TextDirection>
  loading: Ref<boolean>
  error: Ref<string | null>
}

export function useArticleHtml(title: Ref<string>, lang = getContentLang()): UseArticleHtml {
  const html = ref<string | null>(null)
  const articleLang = ref(lang)
  const articleDir = ref<TextDirection>(directionForLang(lang))
  const loading = ref(false)
  const error = ref<string | null>(null)

  let abortController: AbortController | null = null

  async function load(rawTitle: string): Promise<void> {
    // Every title change supersedes the request in flight — including a change
    // to a cached or empty title, or the stale body lands on the new page.
    abortController?.abort()
    abortController = null

    const trimmed = rawTitle.trim()
    if (!trimmed.length) {
      html.value = null
      error.value = null
      loading.value = false
      return
    }

    const host = wikiHostFromLang(lang)
    const cacheKey = `${host}\u0000${trimmed.replace(/_/g, ' ')}`

    const cached = bodyCache.get(cacheKey)
    if (cached) {
      html.value = cached.html
      articleLang.value = cached.lang
      articleDir.value = cached.dir
      error.value = null
      loading.value = false
      return
    }

    const controller = new AbortController()
    abortController = controller
    loading.value = true
    error.value = null
    html.value = null

    try {
      const url = `https://${host}/api/rest_v1/page/html/${encodeURIComponent(trimmed)}`
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'text/html; charset=utf-8', ...wikimediaApiFetchHeaders('page-html') },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)

      const body = extractParserOutput(await response.text(), lang)
      bodyCache.set(cacheKey, body)
      if (controller.signal.aborted) return
      articleLang.value = body.lang
      articleDir.value = body.dir
      html.value = body.html
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      // A superseded request must not clear the newer one's loading state.
      if (abortController === controller) {
        abortController = null
        loading.value = false
      }
    }
  }

  watch(title, (value) => void load(value), { immediate: true })
  onScopeDispose(() => abortController?.abort())

  return { html, lang: articleLang, dir: articleDir, loading, error }
}
