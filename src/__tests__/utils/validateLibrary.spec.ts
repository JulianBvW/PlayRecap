import { describe, it, expect } from 'vitest'
import { validateLibraryFile } from '@/utils/validateLibrary'

describe('validateLibraryFile', () => {
  it('throws with version message for wrong version', () => {
    expect(() => validateLibraryFile({ version: 2, books: [] })).toThrow('Unbekannte Version: 2')
  })

  it('throws for missing books key', () => {
    expect(() => validateLibraryFile({ version: 1 })).toThrow('Fehlende Bücherliste')
  })

  it('throws for non-object input', () => {
    expect(() => validateLibraryFile('not an object')).toThrow('Ungültiges Dateiformat')
    expect(() => validateLibraryFile(null)).toThrow('Ungültiges Dateiformat')
    expect(() => validateLibraryFile(42)).toThrow('Ungültiges Dateiformat')
  })

  it('returns the parsed object for a valid file', () => {
    const input = { version: 1, books: [] }
    const result = validateLibraryFile(input)
    expect(result).toBe(input)
    expect(result.version).toBe(1)
    expect(result.books).toHaveLength(0)
  })
})
