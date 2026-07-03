import type { BookRecord } from '@/types/library'
import type { MessageRole } from '@/types/library'

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function buildSystemPrompt(book: BookRecord, anchorIndex: number): string {
  const lines: string[] = []

  lines.push('Du bist ein hilfreicher Assistent für Hörbücher.')

  if (book.language === 'de') {
    lines.push('Antworte immer auf Deutsch.')
  } else if (book.language === 'en') {
    lines.push('Always answer in English.')
  } else {
    lines.push('Antworte in der Sprache, in der die Zusammenfassungen verfasst sind.')
  }

  lines.push(
    `Dein Wissen über dieses Buch endet nach Kapitel ${anchorIndex + 1}. Gib keine Informationen über spätere Kapitel preis.`,
  )

  lines.push(`\nBuch: ${book.title}`)
  lines.push(`Autor: ${book.author}`)

  if (book.seriesRecap !== null) {
    lines.push('\nBisher in der Serie:')
    book.seriesRecap.forEach((bullet) => lines.push(`- ${bullet}`))
  }

  lines.push('\nKapitelzusammenfassungen:')
  for (let i = 0; i <= anchorIndex; i++) {
    const ch = book.chapters[i]
    if (!ch) continue
    lines.push(`\nKapitel ${i + 1}: ${ch.title}`)
    ch.summary.forEach((bullet) => lines.push(`- ${bullet}`))
  }

  return lines.join('\n')
}

export function buildMessages(
  history: { role: MessageRole; content: string }[],
  userText: string,
  speechMode: boolean,
  systemPrompt: string,
): MistralMessage[] {
  const modePrefix = speechMode
    ? 'Die Antwort wird vorgelesen. Antworte in natürlicher gesprochener Prosa ohne Markdown-Formatierung. '
    : 'Antworte mit strukturiertem Markdown (Überschriften mit ###, Fettdruck mit **, Listen mit -). '

  return [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: modePrefix + userText },
  ]
}
