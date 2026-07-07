import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { Message, MessageFormat } from '@/types/library'
import { useSettingsStore } from '@/stores/settings'
import { useBooksStore } from '@/stores/books'
import { buildSystemPrompt, buildMessages } from '@/llm/context'
import { streamChat } from '@/llm/mistral'

export const useChatStore = defineStore('chat', () => {
  // Keyed by `${bookId}:${chapterIndex}`. Never written to IndexedDB.
  const threads = reactive(new Map<string, Message[]>())

  function threadKey(bookId: string, chapterIndex: number): string {
    return `${bookId}:${chapterIndex}`
  }

  function getThread(bookId: string, chapterIndex: number): Message[] {
    const key = threadKey(bookId, chapterIndex)
    if (!threads.has(key)) threads.set(key, [])
    return threads.get(key)!
  }

  function addMessage(bookId: string, chapterIndex: number, message: Message): void {
    getThread(bookId, chapterIndex).push(message)
  }

  // Patches the last message in a thread — used to append streaming tokens
  // and update status (thinking → streaming → done | error).
  function updateLastMessage(
    bookId: string,
    chapterIndex: number,
    patch: Partial<Message>,
  ): void {
    const thread = getThread(bookId, chapterIndex)
    if (thread.length > 0) Object.assign(thread[thread.length - 1]!, patch)
  }

  function clearThread(bookId: string, chapterIndex: number): void {
    threads.delete(threadKey(bookId, chapterIndex))
  }

  async function sendMessage(
    bookId: string,
    chapterIndex: number,
    text: string,
    speechMode: boolean,
    signal?: AbortSignal,
  ): Promise<void> {
    const settingsStore = useSettingsStore()
    const booksStore = useBooksStore()
    const format: MessageFormat = speechMode ? 'prose' : 'markdown'

    if (!settingsStore.apiKey) {
      addMessage(bookId, chapterIndex, { role: 'user', content: text, format, status: 'done' })
      addMessage(bookId, chapterIndex, {
        role: 'assistant',
        content: 'Bitte füge einen API-Schlüssel in den Einstellungen hinzu.',
        format,
        status: 'error',
      })
      return
    }

    const history = getThread(bookId, chapterIndex)
      .filter((m) => m.status === 'done')
      .map((m) => ({ role: m.role, content: m.content }))

    addMessage(bookId, chapterIndex, { role: 'user', content: text, format, status: 'done' })
    addMessage(bookId, chapterIndex, { role: 'assistant', content: '', format, status: 'thinking' })

    try {
      const book = booksStore.activeBook
      if (!book) {
        updateLastMessage(bookId, chapterIndex, {
          content: 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
          status: 'error',
        })
        return
      }
      const systemPrompt = buildSystemPrompt(book, chapterIndex, speechMode)
      const messages = buildMessages(history, text, systemPrompt)

      updateLastMessage(bookId, chapterIndex, { status: 'streaming' })
      for await (const token of streamChat(messages, settingsStore.apiKey, signal)) {
        if (signal?.aborted) break
        const thread = getThread(bookId, chapterIndex)
        const last = thread[thread.length - 1]
        if (!last) break
        updateLastMessage(bookId, chapterIndex, { content: last.content + token })
      }
      updateLastMessage(bookId, chapterIndex, { status: 'done' })
    } catch (err) {
      if (signal?.aborted) {
        updateLastMessage(bookId, chapterIndex, { status: 'done' })
        return
      }
      const detail = err instanceof Error ? err.message : null
      updateLastMessage(bookId, chapterIndex, {
        content: detail
          ? `Fehler: ${detail}`
          : 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
        status: 'error',
      })
    }
  }

  return { threads, getThread, addMessage, updateLastMessage, clearThread, sendMessage }
})
