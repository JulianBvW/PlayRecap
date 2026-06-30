import Dexie, { type Table } from 'dexie'
import type { BookRecord } from '@/types/library'

interface SettingsRecord {
  key: string
  value: string
}

class PlayRecapDB extends Dexie {
  books!: Table<BookRecord, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('PlayRecapDB')

    this.version(1).stores({
      books: 'id',    // keyed by id; all other fields stored implicitly
      settings: 'key', // simple key-value store for apiKey etc.
    })

    // Request persistent storage so the library survives iOS storage pressure.
    // Fire-and-forget — we don't need to act on the granted/denied result.
    navigator.storage?.persist()
  }
}

export const db = new PlayRecapDB()
