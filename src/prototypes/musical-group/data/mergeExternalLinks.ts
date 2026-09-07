export const OFFICIAL_WEBSITE_LABEL = 'Official website'

export function normalizeUrlForDedup(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    parsed.hostname = parsed.hostname.toLowerCase()
    if (parsed.pathname.endsWith('/') && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    }
    return parsed.toString()
  } catch {
    return url.trim().toLowerCase()
  }
}
