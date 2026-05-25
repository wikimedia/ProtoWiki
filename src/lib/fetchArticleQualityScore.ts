const LIFT_WING_ARTICLE_QUALITY_URL =
  'https://api.wikimedia.org/service/lw/inference/v1/models/articlequality:predict'

const DEFAULT_API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) dashpage-recent-changes'

export interface ArticleQualityScoreResult {
  score: number
  revisionId: number
}

export async function fetchArticleQualityScore(
  revId: number,
  lang = 'en',
  apiUserAgent = DEFAULT_API_USER_AGENT,
): Promise<ArticleQualityScoreResult | null> {
  if (revId <= 0) return null

  try {
    const response = await fetch(LIFT_WING_ARTICLE_QUALITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-User-Agent': apiUserAgent,
      },
      body: JSON.stringify({ rev_id: revId, lang }),
    })

    if (!response.ok) {
      if (response.status === 422) return null
      return null
    }

    const data = (await response.json()) as { score?: number; revision_id?: number }
    if (typeof data.score !== 'number') return null

    return {
      score: data.score,
      revisionId: data.revision_id ?? revId,
    }
  } catch {
    return null
  }
}
