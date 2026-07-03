import { beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chat'

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
})
