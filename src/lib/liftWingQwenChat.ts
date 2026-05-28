const QWEN_CHAT_COMPLETIONS_URL =
  'https://api.wikimedia.org/service/lw/inference/v1/models/qwen3-14b/openai/v1/chat/completions'

const DEFAULT_API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia/protowiki) llm-topic-suggested-edits'

export class LiftWingQwenChatError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http' | 'parse',
  ) {
    super(message)
    this.name = 'LiftWingQwenChatError'
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface StreamChatCompletionOptions {
  messages: ChatMessage[]
  maxTokens?: number
  signal?: AbortSignal
  onDelta?: (chunk: string, accumulated: string) => void
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new LiftWingQwenChatError('Request aborted', 'aborted')
  }
}

/** Remove qwen3 thinking blocks before parsing model output. */
export function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/thinking>/gi, '').trim()
}

/**
 * Extract the first JSON string array from model output.
 * Returns trimmed non-empty strings.
 */
export function parseJsonStringArray(text: string): string[] {
  const cleaned = stripThinkingBlocks(text)
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new LiftWingQwenChatError('Could not find a JSON array in the model response', 'parse')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw new LiftWingQwenChatError('Model response was not valid JSON', 'parse')
  }

  if (!Array.isArray(parsed)) {
    throw new LiftWingQwenChatError('Model response was not a JSON array', 'parse')
  }

  return parsed
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function extractDeltaContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''

  const record = payload as Record<string, unknown>
  const choices = record.choices
  if (!Array.isArray(choices) || !choices.length) return ''

  const first = choices[0]
  if (!first || typeof first !== 'object') return ''

  const delta = (first as Record<string, unknown>).delta
  if (!delta || typeof delta !== 'object') return ''

  const content = (delta as Record<string, unknown>).content
  return typeof content === 'string' ? content : ''
}

/**
 * Stream an OpenAI-compatible chat completion from Lift Wing qwen3-14b.
 * Returns the full accumulated assistant text.
 */
export async function streamChatCompletion(options: StreamChatCompletionOptions): Promise<string> {
  assertNotAborted(options.signal)

  const response = await fetch(QWEN_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-User-Agent': DEFAULT_API_USER_AGENT,
    },
    body: JSON.stringify({
      model: 'qwen3-14b',
      messages: options.messages,
      max_tokens: options.maxTokens ?? 600,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new LiftWingQwenChatError(`HTTP ${response.status}`, 'http')
  }

  if (!response.body) {
    throw new LiftWingQwenChatError('Empty response body', 'http')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  try {
    while (true) {
      assertNotAborted(options.signal)

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue

        let payload: unknown
        try {
          payload = JSON.parse(data)
        } catch {
          continue
        }

        const delta = extractDeltaContent(payload)
        if (!delta) continue

        accumulated += delta
        options.onDelta?.(delta, accumulated)
      }
    }
  } finally {
    reader.releaseLock()
  }

  return accumulated
}
