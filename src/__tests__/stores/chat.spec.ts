import { beforeEach, describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '@/db'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useBooksStore } from '@/stores/books'
import { DEFAULT_MODEL } from '@/llm/mistral'
import type { Book } from '@/types/library'

// Only streamChat is replaced; DEFAULT_MODEL stays the real one, because the point of
// these tests is which model actually reaches the API client.
type StreamChat = (
  messages: unknown,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
) => AsyncGenerator<string>
const { streamChatMock } = vi.hoisted(() => ({ streamChatMock: vi.fn<StreamChat>() }))
vi.mock('@/llm/mistral', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/llm/mistral')>()),
  streamChat: streamChatMock,
}))

// The chain under test ends at streamChat, so the stream itself stays empty.
async function* noTokens(): AsyncGenerator<string> {}

const book: Book = {
  id: 'book-a',
  title: 'Erben des Imperiums',
  author: 'Timothy Zahn',
  language: 'de',
  chapterSeconds: 300,
  cover: null,
  seriesRecap: null,
  chapters: [{ index: 0, start: 0, title: 'Kapitel 1', summary: ['Bullet A'] }],
}

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    streamChatMock.mockReset()
    streamChatMock.mockImplementation(noTokens)
  })

  it('threads keyed by bookId + chapterIndex are independent', async () => {
    const store = useChatStore()
    await store.sendMessage('book-a', 0, 'Hallo A', false)
    await store.sendMessage('book-b', 2, 'Hallo B', false)

    const threadA = store.getThread('book-a', 0)
    const threadB = store.getThread('book-b', 2)

    expect(threadA.some((m) => m.content === 'Hallo A')).toBe(true)
    expect(threadA.some((m) => m.content === 'Hallo B')).toBe(false)
    expect(threadB.some((m) => m.content === 'Hallo B')).toBe(true)
    expect(threadB.some((m) => m.content === 'Hallo A')).toBe(false)
  })

  it('speechMode=false gives both messages format: markdown', async () => {
    const store = useChatStore()
    await store.sendMessage('book-a', 0, 'Frage', false)
    const thread = store.getThread('book-a', 0)
    expect(thread).toHaveLength(2)
    expect(thread[0]!.format).toBe('markdown')
    expect(thread[1]!.format).toBe('markdown')
  })

  it('speechMode=true gives both messages format: prose', async () => {
    const store = useChatStore()
    await store.sendMessage('book-a', 0, 'Frage', true)
    const thread = store.getThread('book-a', 0)
    expect(thread).toHaveLength(2)
    expect(thread[0]!.format).toBe('prose')
    expect(thread[1]!.format).toBe('prose')
  })

  it('no-key guard: shows inline error without a network call', async () => {
    const store = useChatStore()
    await store.sendMessage('book-a', 0, 'Test', false)

    const thread = store.getThread('book-a', 0)
    expect(thread).toHaveLength(2)
    expect(thread[0]!.role).toBe('user')
    expect(thread[1]!.role).toBe('assistant')
    expect(thread[1]!.status).toBe('error')
    expect(thread[1]!.content).toContain('API-Schlüssel')
  })

  describe('model selection', () => {
    async function sendWithModel(modelInput: string) {
      await db.delete()
      await db.open()
      const settings = useSettingsStore()
      settings.apiKey = 'sk-test'
      settings.modelInput = modelInput
      await useBooksStore().upsertBooks([book])
      await useChatStore().sendMessage(book.id, 0, 'Frage', false)
      return streamChatMock.mock.calls[0]!
    }

    it('passes the configured model to the API client', async () => {
      const [, apiKey, model] = await sendWithModel('ministral-3b-latest')
      expect(apiKey).toBe('sk-test')
      expect(model).toBe('ministral-3b-latest')
    })

    it('passes the default when the field was left empty', async () => {
      const [, , model] = await sendWithModel('')
      expect(model).toBe(DEFAULT_MODEL)
    })
  })
})
