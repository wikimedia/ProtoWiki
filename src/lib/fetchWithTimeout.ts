const DEFAULT_TIMEOUT_MS = 7000

export interface FetchWithTimeoutInit extends RequestInit {
  /** Abort the request after this many milliseconds. Defaults to 7000. */
  timeoutMs?: number
}

/**
 * `fetch` that aborts itself after `timeoutMs`, while still honouring a
 * caller-supplied `signal` (navigation aborts). A timeout rejects with a
 * `TimeoutError` so callers can distinguish it from a user-driven `AbortError`.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...rest } = init

  const controller = new AbortController()

  function onExternalAbort() {
    controller.abort(externalSignal?.reason)
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason)
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  const timeout = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'))
  }, timeoutMs)

  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}
