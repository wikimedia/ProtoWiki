/**
 * One dead or slow image must never hold a reserved slot open, so the wait is
 * capped and always resolves.
 */
const DECODE_TIMEOUT_MS = 1500

const decoded = new Set<string>()

function preloadImage(src: string): Promise<void> {
  if (decoded.has(src)) return Promise.resolve()

  return new Promise((resolve) => {
    const image = new Image()
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      decoded.add(src)
      resolve()
    }

    const timer = setTimeout(finish, DECODE_TIMEOUT_MS)
    image.onload = finish
    image.onerror = finish
    image.src = src
  })
}

/**
 * Waits for a page's thumbnails to decode before its cards replace their
 * placeholders. Without this the cards swap in and their images pop a beat
 * later — the same jank the reserved slot exists to prevent.
 */
export function preloadImages(sources: (string | undefined)[]): Promise<void> {
  const unique = [...new Set(sources.filter((src): src is string => Boolean(src)))]
  if (!unique.length) return Promise.resolve()
  return Promise.all(unique.map(preloadImage)).then(() => undefined)
}
