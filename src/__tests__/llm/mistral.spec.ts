import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { streamChat, DEFAULT_MODEL } from '@/llm/mistral'
import type { MistralMessage } from '@/llm/context'

const messages: MistralMessage[] = [{ role: 'user', content: 'Wer ist Thrawn?' }]

// A reader stub rather than a real ReadableStream: the point of these tests is to
// control exactly where the chunk boundaries fall, and releaseLock has to exist
// because streamChat calls it in a finally on every exit path.
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  let next = 0
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () =>
          Promise.resolve(
            next < chunks.length
              ? { done: false, value: encoder.encode(chunks[next++]!) }
              : { done: true, value: undefined },
          ),
        releaseLock: () => {},
      }),
    },
  } as unknown as Response
}

function errorResponse(status: number, body?: unknown): Response {
  return {
    ok: false,
    status,
    json: () => (body === undefined ? Promise.reject(new Error('not JSON')) : Promise.resolve(body)),
  } as unknown as Response
}

function token(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`
}

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let text = ''
  for await (const chunk of stream) text += chunk
  return text
}

type FetchMock = (url: string, init: RequestInit) => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn<FetchMock>>

beforeEach(() => {
  fetchMock = vi.fn<FetchMock>(() => Promise.resolve(sseResponse([token('Hallo'), 'data: [DONE]\n'])))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamChat', () => {
  it('sends the model it was given, not a baked-in one', async () => {
    await collect(streamChat(messages, 'sk-test', 'ministral-8b-latest'))

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.mistral.ai/v1/chat/completions')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('ministral-8b-latest')
    expect(body.stream).toBe(true)
    expect(body.messages).toEqual(messages)
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sk-test' })
  })

  it('exports a default model the settings can fall back to', () => {
    expect(DEFAULT_MODEL).toBe('ministral-14b-latest')
  })

  it('yields tokens in order and stops at [DONE]', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([token('Groß'), token('admiral'), 'data: [DONE]\n', token('nie')]),
    )
    expect(await collect(streamChat(messages, 'sk-test', DEFAULT_MODEL))).toBe('Großadmiral')
  })

  it('reassembles a token whose JSON is split across two reads', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Chi',
        'maera"}}]}\ndata: [DONE]\n',
      ]),
    )
    expect(await collect(streamChat(messages, 'sk-test', DEFAULT_MODEL))).toBe('Chimaera')
  })

  it('skips malformed and non-data lines instead of failing', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([': keep-alive\n', 'data: {nicht json}\n', token('ok'), 'data: [DONE]\n']),
    )
    expect(await collect(streamChat(messages, 'sk-test', DEFAULT_MODEL))).toBe('ok')
  })

  describe('errors name the model', () => {
    // The whole point: a tier refusal and a typo in the settings field look identical
    // without it, which is exactly the confusion that prompted the setting.
    it('includes status, server message and model for a 403', async () => {
      fetchMock.mockResolvedValue(
        errorResponse(403, { message: 'This model is not available in your subscription tier' }),
      )
      await expect(collect(streamChat(messages, 'sk-test', 'mistral-large-latest'))).rejects.toThrow(
        '403: This model is not available in your subscription tier (Modell: mistral-large-latest)',
      )
    })

    it('names the model for a mistyped id', async () => {
      fetchMock.mockResolvedValue(errorResponse(400, { detail: 'Invalid model' }))
      await expect(collect(streamChat(messages, 'sk-test', 'gibt-es-nicht'))).rejects.toThrow(
        '400: Invalid model (Modell: gibt-es-nicht)',
      )
    })

    it('falls back to the bare status when the body is not JSON', async () => {
      fetchMock.mockResolvedValue(errorResponse(500))
      await expect(collect(streamChat(messages, 'sk-test', DEFAULT_MODEL))).rejects.toThrow(
        `HTTP 500 (Modell: ${DEFAULT_MODEL})`,
      )
    })
  })
})
