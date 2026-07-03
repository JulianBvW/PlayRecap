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
    const result = buildSystemPrompt(makeBook({ seriesRecap: null }), 2)
    expect(result).not.toContain('Bisher in der Serie')
  })

  it('includes series recap section when seriesRecap is present', () => {
    const result = buildSystemPrompt(makeBook({ seriesRecap: ['Held rettet Stadt'] }), 2)
    expect(result).toContain('Bisher in der Serie')
    expect(result).toContain('Held rettet Stadt')
  })

  it('includes only chapters 0..anchorIndex and not beyond', () => {
    const result = buildSystemPrompt(makeBook(), 2)
    expect(result).toContain('Kapitel 1 Titel')
    expect(result).toContain('Kapitel 2 Titel')
    expect(result).toContain('Kapitel 3 Titel')
    expect(result).not.toContain('Kapitel 4 Titel')
  })

  it('emits correct language instructions for de / en / auto', () => {
    expect(buildSystemPrompt(makeBook({ language: 'de' }), 0)).toContain('immer auf Deutsch')
    expect(buildSystemPrompt(makeBook({ language: 'en' }), 0)).toContain('Always answer in English')
    expect(buildSystemPrompt(makeBook({ language: 'auto' }), 0)).toContain('Sprache, in der die Zusammenfassungen')
  })
})

describe('buildMessages', () => {
  const prompt = 'SYSTEM'

  it('speech OFF → user content contains "Markdown"', () => {
    const msgs = buildMessages([], 'Wer ist der Held?', false, prompt)
    const last = msgs.at(-1)!
    expect(last.role).toBe('user')
    expect(last.content).toContain('Markdown')
  })

  it('speech ON → user content contains "Prosa"', () => {
    const msgs = buildMessages([], 'Wer ist der Held?', true, prompt)
    const last = msgs.at(-1)!
    expect(last.role).toBe('user')
    expect(last.content).toContain('Prosa')
  })

  it('prepends system message and appends user text', () => {
    const msgs = buildMessages([], 'Frage', false, 'MEIN SYSTEM')
    expect(msgs[0]).toEqual({ role: 'system', content: 'MEIN SYSTEM' })
    expect(msgs.at(-1)!.content).toContain('Frage')
  })

  it('interleaves history between system and new user turn', () => {
    const history = [
      { role: 'user' as const, content: 'Erste Frage' },
      { role: 'assistant' as const, content: 'Erste Antwort' },
    ]
    const msgs = buildMessages(history, 'Zweite Frage', false, prompt)
    expect(msgs).toHaveLength(4) // system + 2 history + new user
    expect(msgs[1]).toEqual({ role: 'user', content: 'Erste Frage' })
    expect(msgs[2]).toEqual({ role: 'assistant', content: 'Erste Antwort' })
    expect(msgs[3].role).toBe('user')
    expect(msgs[3].content).toContain('Zweite Frage')
  })
})
