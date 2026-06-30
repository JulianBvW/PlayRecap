import { beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '@/db'
import { useBooksStore } from '@/stores/books'
import type { Book } from '@/types/library'

const baseBook: Book = {
  id: 'book-a',
  title: 'Erben des Imperiums',
  author: 'Timothy Zahn',
  language: 'de',
  chapterSeconds: 300,
  cover: null,
  seriesRecap: null,
  chapters: [
    { index: 0, start: 0, title: 'Kapitel 1', summary: ['Bullet A'] },
    { index: 1, start: 300, title: 'Kapitel 2', summary: ['Bullet B'] },
  ],
}

describe('useBooksStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.delete()
    await db.open()
  })

  it('upsertBooks preserves lastOpenedAt when re-adding the same id', async () => {
    const store = useBooksStore()
    await store.upsertBooks([baseBook])
    await store.selectBook(baseBook.id)
    const openedAt = store.books.find((b) => b.id === baseBook.id)?.lastOpenedAt
    expect(openedAt).not.toBeNull()

    // Re-upsert with updated content
    await store.upsertBooks([{ ...baseBook, title: 'Updated Title' }])

    const after = store.books.find((b) => b.id === baseBook.id)
    expect(after?.title).toBe('Updated Title')
    expect(after?.lastOpenedAt).toBe(openedAt)
  })

  it('importBooks resets the store and reads lastOpenedAt from the file', async () => {
    const store = useBooksStore()
    // Pre-load a book that import should wipe
    await store.upsertBooks([baseBook])
    expect(store.books).toHaveLength(1)

    const importedAt = '2024-03-15T09:00:00.000Z'
    const newBook: Book = { ...baseBook, id: 'book-b', title: 'Dunkle Gewalt' }

    await store.importBooks([{ ...newBook, lastOpenedAt: importedAt }])

    expect(store.books.find((b) => b.id === baseBook.id)).toBeUndefined()
    expect(store.books.find((b) => b.id === 'book-b')?.lastOpenedAt).toBe(importedAt)
  })

  it('importBooks sets lastOpenedAt to null when not present in file', async () => {
    const store = useBooksStore()
    await store.importBooks([baseBook]) // plain Book, no lastOpenedAt field

    expect(store.books[0].lastOpenedAt).toBeNull()
  })

  it('exportBooks returns a books array with no apiKey anywhere in the output', async () => {
    const store = useBooksStore()
    await store.upsertBooks([baseBook])
    await db.settings.put({ key: 'apiKey', value: 'super-secret' })

    const exported = store.exportBooks()

    expect(exported.version).toBe(1)
    expect(exported.books).toHaveLength(1)
    const serialised = JSON.stringify(exported)
    expect(serialised).not.toContain('apiKey')
    expect(serialised).not.toContain('super-secret')
  })

  it('clearAll empties both the books and settings tables', async () => {
    const store = useBooksStore()
    await store.upsertBooks([baseBook])
    await db.settings.put({ key: 'apiKey', value: 'my-key' })

    await store.clearAll()

    expect(store.books).toHaveLength(0)
    expect(store.activeBook).toBeNull()
    expect(await db.books.count()).toBe(0)
    expect(await db.settings.count()).toBe(0)
  })

  it('sortedBooks orders by lastOpenedAt descending, nulls last', async () => {
    const store = useBooksStore()
    await db.books.bulkPut([
      { ...baseBook, id: 'book-1', lastOpenedAt: '2024-01-10T00:00:00.000Z' },
      { ...baseBook, id: 'book-2', lastOpenedAt: '2024-01-20T00:00:00.000Z' },
      { ...baseBook, id: 'book-3', lastOpenedAt: null },
    ])
    await store.init()

    expect(store.sortedBooks[0].id).toBe('book-2') // newest
    expect(store.sortedBooks[1].id).toBe('book-1') // older
    expect(store.sortedBooks[2].id).toBe('book-3') // null → last
  })

  it('init auto-selects the most recently opened book', async () => {
    const store = useBooksStore()
    await db.books.bulkPut([
      { ...baseBook, id: 'book-x', lastOpenedAt: '2024-02-01T00:00:00.000Z' },
      { ...baseBook, id: 'book-y', lastOpenedAt: '2024-06-01T00:00:00.000Z' },
    ])
    await store.init()

    expect(store.activeBook?.id).toBe('book-y')
  })
})
