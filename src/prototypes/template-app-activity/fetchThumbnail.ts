import { wikimediaApiFetchHeaders } from '@/config'

/**
 * The mock pools use real Wikipedia article titles, so their thumbnails can be
 * loaded for real instead of always showing a placeholder.
 */
export async function fetchThumbnailUrl(
  title: string,
  options: { signal?: AbortSignal; host?: string } = {},
): Promise<string | null> {
  const host = options.host ?? 'en.wikipedia.org'

  try {
    const response = await fetch(
      `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        signal: options.signal,
        headers: wikimediaApiFetchHeaders('activity-thumbnail'),
      },
    )
    if (!response.ok) return null

    const data = (await response.json()) as { thumbnail?: { source?: string } }
    return data.thumbnail?.source ?? null
  } catch {
    return null
  }
}
