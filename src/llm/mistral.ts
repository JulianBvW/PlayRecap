import type { MistralMessage } from './context'

const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions'

// Which models a key may call is a property of the Mistral account, not of this app:
// a free-tier key cannot reach mistral-large-latest at all, and what is included
// changes without warning. The model is therefore configurable in the settings (see
// stores/settings.ts) and this is only the fallback. ministral-14b-latest is the
// largest general-purpose model a free-tier key answers with — measured with
// Generator/list_models.sh, which probes every listed model with a real request.
export const DEFAULT_MODEL = 'ministral-14b-latest'

export async function* streamChat(
  messages: MistralMessage[],
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch(MISTRAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const body = await response.json()
      const msg = body?.detail ?? body?.message ?? body?.error?.message
      if (msg) detail = `${response.status}: ${msg}`
    } catch { /* body not JSON */ }
    // Name the model: a typo in the settings field and a model the subscription tier
    // does not include both arrive as a bare 4xx and are otherwise indistinguishable.
    throw new Error(`${detail} (Modell: ${model})`)
  }

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
