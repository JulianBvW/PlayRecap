import type { MistralMessage } from './context'

const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions'
const MISTRAL_MODEL = 'mistral-small-latest'

export async function* streamChat(
  messages: MistralMessage[],
  apiKey: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch(MISTRAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MISTRAL_MODEL, messages, stream: true }),
    signal,
  })

  if (!response.ok) throw new Error(`${response.status}`)

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const token = JSON.parse(data).choices?.[0]?.delta?.content
          if (token) yield token
        } catch {
          // malformed SSE line — skip
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
