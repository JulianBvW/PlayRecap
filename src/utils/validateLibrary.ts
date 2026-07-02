import type { Book } from '@/types/library'

export interface LibraryFileRaw {
  version: number
  books: (Book & { lastOpenedAt?: string | null })[]
}

export function validateLibraryFile(raw: unknown): LibraryFileRaw {
  if (typeof raw !== 'object' || raw === null)
    throw new Error('Ungültiges Dateiformat')
  if ((raw as any).version !== 1)
    throw new Error(`Unbekannte Version: ${(raw as any).version}`)
  if (!Array.isArray((raw as any).books))
    throw new Error('Fehlende Bücherliste')
  return raw as LibraryFileRaw
}
