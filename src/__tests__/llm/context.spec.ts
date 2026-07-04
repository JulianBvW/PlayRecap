import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildMessages } from '@/llm/context'
import type { BookRecord } from '@/types/library'

function makeBook(overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    id: 'book-1',
    title: 'Die Testchronik',
    author: 'Max Mustermann',
    language: 'de',
    chapterSeconds: 3600,
    cover: null,
    seriesRecap: null,
    lastOpenedAt: null,
    chapters: Array.from({ length: 10 }, (_, i) => ({
      index: i,
      start: i * 3600,
      title: `Kapitel ${i + 1} Titel`,
      summary: [`Zusammenfassung ${i + 1}`],
    })),
    ...overrides,
  }
}

describe('buildSystemPrompt', () => {
  it('omits series recap section when seriesRecap is null', () => {
    const result = buildSystemPrompt(makeBook({ seriesRecap: null }), 2, false)
    expect(result).not.toContain('Bisher in der Serie')
  })

  it('includes series recap section when seriesRecap is present', () => {
    const result = buildSystemPrompt(makeBook({ seriesRecap: ['Held rettet Stadt'] }), 2, false)
    expect(result).toContain('Bisher in der Serie')
    expect(result).toContain('Held rettet Stadt')
  })

  it('includes only chapters 0..anchorIndex and not beyond', () => {
    const result = buildSystemPrompt(makeBook(), 2, false)
    expect(result).toContain('Kapitel 1 Titel')
    expect(result).toContain('Kapitel 2 Titel')
    expect(result).toContain('Kapitel 3 Titel')
    expect(result).not.toContain('Kapitel 4 Titel')
  })

  it('emits correct language instructions for de / en / auto', () => {
    expect(buildSystemPrompt(makeBook({ language: 'de' }), 0, false)).toContain('immer auf Deutsch')
    expect(buildSystemPrompt(makeBook({ language: 'en' }), 0, false)).toContain('Always answer in English')
    expect(buildSystemPrompt(makeBook({ language: 'auto' }), 0, false)).toContain(
      'Sprache, in der die Zusammenfassungen',
    )
  })

  it('markdown mode → system prompt contains Markdown instruction', () => {
    expect(buildSystemPrompt(makeBook(), 0, false)).toContain('Markdown')
  })

  it('speech mode → system prompt contains Prosa instruction', () => {
    expect(buildSystemPrompt(makeBook(), 0, true)).toContain('Prosa')
  })

  it('speech mode → system prompt does not contain Markdown formatting instruction', () => {
    expect(buildSystemPrompt(makeBook(), 0, true)).not.toContain('### für Überschriften')
  })
})

describe('buildMessages', () => {
  const prompt = 'SYSTEM'

  it('prepends system message and appends user text verbatim', () => {
    const msgs = buildMessages([], 'Frage', prompt)
    expect(msgs[0]).toEqual({ role: 'system', content: 'SYSTEM' })
    expect(msgs.at(-1)!).toEqual({ role: 'user', content: 'Frage' })
  })

  it('user message is not modified — no format prefix injected', () => {
    const msgs = buildMessages([], 'Danke!', 'SYSTEM')
    expect(msgs.at(-1)!.content).toBe('Danke!')
  })

  it('interleaves history between system and new user turn', () => {
    const history = [
      { role: 'user' as const, content: 'Erste Frage' },
      { role: 'assistant' as const, content: 'Erste Antwort' },
    ]
    const msgs = buildMessages(history, 'Zweite Frage', prompt)
    expect(msgs).toHaveLength(4) // system + 2 history + new user
    expect(msgs[1]).toEqual({ role: 'user', content: 'Erste Frage' })
    expect(msgs[2]).toEqual({ role: 'assistant', content: 'Erste Antwort' })
    expect(msgs[3]).toEqual({ role: 'user', content: 'Zweite Frage' })
  })
})
