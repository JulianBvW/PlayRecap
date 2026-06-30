import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'
import type { Book, BookRecord } from '@/types/library'

export const useBooksStore = defineStore('books', () => {
  const books = ref<BookRecord[]>([])
  const activeBookId = ref<string | null>(null)

  const sortedBooks = computed(() =>
    [...books.value].sort((a, b) => {
      if (a.lastOpenedAt === null && b.lastOpenedAt === null) return 0
      if (a.lastOpenedAt === null) return 1
      if (b.lastOpenedAt === null) return -1
      return b.lastOpenedAt.localeCompare(a.lastOpenedAt)
    }),
  )

  // Always reflects current book data — stays in sync when lastOpenedAt changes
  const activeBook = computed(() => books.value.find((b) => b.id === activeBookId.value) ?? null)

  async function init() {
    books.value = await db.books.toArray()
    activeBookId.value = sortedBooks.value[0]?.id ?? null
  }

  async function selectBook(id: string) {
    const now = new Date().toISOString()
    await db.books.update(id, { lastOpenedAt: now })
    const idx = books.value.findIndex((b) => b.id === id)
    if (idx !== -1) books.value[idx] = { ...books.value[idx]!, lastOpenedAt: now }
    activeBookId.value = id
  }

  // Upsert: updates content for existing books, preserves their lastOpenedAt.
  // New books get lastOpenedAt = null.
  async function upsertBooks(incoming: Book[]) {
    for (const book of incoming) {
      const existing = await db.books.get(book.id)
      await db.books.put({ ...book, lastOpenedAt: existing?.lastOpenedAt ?? null })
    }
    books.value = await db.books.toArray()
    if (!activeBookId.value) {
      activeBookId.value = sortedBooks.value[0]?.id ?? null
    }
  }

  // Full reset of the books table. Reads lastOpenedAt from the file if present.
  async function importBooks(incoming: (Book & { lastOpenedAt?: string | null })[]) {
    await db.books.clear()
    await db.books.bulkPut(
      incoming.map((b) => ({ ...b, lastOpenedAt: b.lastOpenedAt ?? null })),
    )
    books.value = await db.books.toArray()
    activeBookId.value = sortedBooks.value[0]?.id ?? null
  }

  // Serialises the books store for export. Never includes the API key.
  function exportBooks(): { version: number; books: BookRecord[] } {
    return { version: 1, books: sortedBooks.value }
  }

  // Nuclear option — wipes both books and settings (including the API key).
  async function clearAll() {
    await db.books.clear()
    await db.settings.clear()
    books.value = []
    activeBookId.value = null
  }

  return {
    books,
    sortedBooks,
    activeBook,
    init,
    selectBook,
    upsertBooks,
    importBooks,
    exportBooks,
    clearAll,
  }
})
