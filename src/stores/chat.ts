import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { Message } from '@/types/library'

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

  return { threads, getThread, addMessage, updateLastMessage, clearThread }
})
