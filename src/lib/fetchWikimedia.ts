import { fetchWithTimeout, type FetchWithTimeoutInit } from './fetchWithTimeout'

const MAX_CONCURRENT_PER_HOST = 2
const MIN_SPACING_MS = 150
const MAX_RETRY_ATTEMPTS = 4
const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 30_000

const QUEUED_HOST_SUFFIXES = [
  '.wikipedia.org',
  '.wikidata.org',
  'commons.wikimedia.org',
  'wikimedia.org',
  'mediawiki.org',
]

function hostFromInput(input: RequestInfo | URL): string | null {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function shouldQueueHost(host: string): boolean {
  if (host === 'api.wikimedia.org') return false
  return QUEUED_HOST_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  )
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
        },
        { once: true },
      )
    }
  })
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(header)
  if (Number.isNaN(date)) return null
  return Math.max(0, date - Date.now())
}

function backoffMs(attempt: number): number {
  const base = Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
  const jitter = Math.floor(Math.random() * base * 0.25)
  return base + jitter
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

class HostQueue {
  private chain: Promise<void> = Promise.resolve()
  private active = 0
  private lastStartMs = 0

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      while (this.active >= MAX_CONCURRENT_PER_HOST) {
        await sleep(MIN_SPACING_MS)
      }

      const waitMs = Math.max(0, MIN_SPACING_MS - (Date.now() - this.lastStartMs))
      if (waitMs > 0) await sleep(waitMs)

      this.active++
      this.lastStartMs = Date.now()
      try {
        return await task()
      } finally {
        this.active--
      }
    }

    const result = this.chain.then(run, run)
    this.chain = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

const hostQueues = new Map<string, HostQueue>()

function queueForHost(host: string): HostQueue {
  let queue = hostQueues.get(host)
  if (!queue) {
    queue = new HostQueue()
    hostQueues.set(host, queue)
  }
  return queue
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit,
): Promise<Response> {
  const { signal } = init
  let lastResponse: Response | undefined

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    }

    const response = await fetchWithTimeout(input, init)
    if (!isRetryableStatus(response.status)) {
      return response
    }

    lastResponse = response
    const isLastAttempt = attempt >= MAX_RETRY_ATTEMPTS - 1
    if (isLastAttempt) break

    const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'))
    const delayMs = retryAfterMs ?? backoffMs(attempt)
    await sleep(delayMs, signal)
  }

  return lastResponse!
}

export type FetchWikimediaInit = FetchWithTimeoutInit

/** Queued, retried fetch for Wikimedia API hosts. Other hosts pass through. */
export async function fetchWikimedia(
  input: RequestInfo | URL,
  init: FetchWikimediaInit = {},
): Promise<Response> {
  const host = hostFromInput(input)
  if (!host || !shouldQueueHost(host)) {
    return fetchWithRetry(input, init)
  }
  return queueForHost(host).enqueue(() => fetchWithRetry(input, init))
}

/** Clear in-memory host queues (e.g. on reset). */
export function clearWikimediaFetchQueues(): void {
  hostQueues.clear()
}
