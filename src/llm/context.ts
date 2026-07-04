import type { BookRecord } from '@/types/library'
import type { MessageRole } from '@/types/library'

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function buildSystemPrompt(book: BookRecord, anchorIndex: number, speechMode: boolean): string {
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

  if (speechMode) {
    lines.push(
      '\nDeine Antwort wird direkt vorgelesen. Schreibe ausschließlich in fließender Prosa — kein Markdown, keine Aufzählungszeichen, keine Überschriften. Standardmäßig 3–4 Absätze; passe die Länge dem Anliegen an, wenn der Nutzer ausdrücklich mehr oder weniger möchte.',
    )
  } else {
    lines.push(
      '\nAntworte mit strukturiertem Markdown (### für Überschriften, ** für Fettdruck, - für Listen). Bei Zusammenfassungen: gliedere nach inhaltlichen Bögen — nicht nach Kapitelnummern. Standardmäßig 4–5 Abschnitte; passe Ausführlichkeit und Länge dem Anliegen an, wenn der Nutzer ausdrücklich mehr oder weniger möchte.',
    )
  }

  lines.push(`\nBuch: ${book.title}`)
  lines.push(`Autor: ${book.author}`)

  if (book.seriesRecap !== null) {
    lines.push('\nBisher in der Serie:')
    book.seriesRecap.forEach((bullet) => lines.push(`- ${bullet}`))
  }

  lines.push(
    '\nKapitelzusammenfassungen (nur als Kontext — nutze in Antworten eine eigene thematische Gliederung, keine Kapitelnummern):',
  )
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
  systemPrompt: string,
): MistralMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userText },
  ]
}
