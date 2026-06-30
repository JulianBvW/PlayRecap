import { describe, it, expect } from 'vitest'
import { stripMarkdown } from '@/utils/markdown'

describe('stripMarkdown', () => {
  it('leaves plain text unchanged', () => {
    expect(stripMarkdown('Hello world.')).toBe('Hello world.')
  })

  it('strips heading markers, keeps heading text', () => {
    expect(stripMarkdown('### Kapitel Eins')).toBe('Kapitel Eins')
    expect(stripMarkdown('# Titel')).toBe('Titel')
    expect(stripMarkdown('## Abschnitt')).toBe('Abschnitt')
  })

  it('strips bold markers', () => {
    expect(stripMarkdown('**fett**')).toBe('fett')
    expect(stripMarkdown('Das ist **wichtig**.')).toBe('Das ist wichtig.')
    expect(stripMarkdown('__auch fett__')).toBe('auch fett')
  })

  it('strips italic markers', () => {
    expect(stripMarkdown('*kursiv*')).toBe('kursiv')
    expect(stripMarkdown('_ebenfalls kursiv_')).toBe('ebenfalls kursiv')
  })

  it('strips bullet/dash list markers', () => {
    expect(stripMarkdown('- erster Punkt')).toBe('erster Punkt')
    expect(stripMarkdown('* anderer Punkt')).toBe('anderer Punkt')
    expect(stripMarkdown('+ noch ein Punkt')).toBe('noch ein Punkt')
  })

  it('strips numbered list markers', () => {
    expect(stripMarkdown('1. Erster Schritt')).toBe('Erster Schritt')
    expect(stripMarkdown('42. Zweiundvierzigster')).toBe('Zweiundvierzigster')
  })

  it('strips links, keeps display text', () => {
    expect(stripMarkdown('[hier klicken](https://example.com)')).toBe('hier klicken')
  })

  it('strips inline code backticks, keeps code text', () => {
    expect(stripMarkdown('Nutze `formatStartTime` hier.')).toBe(
      'Nutze formatStartTime hier.',
    )
  })

  it('removes fenced code blocks entirely', () => {
    const input = 'Davor\n```\ncode hier\n```\nDanach'
    const result = stripMarkdown(input)
    expect(result).toContain('Davor')
    expect(result).toContain('Danach')
    expect(result).not.toContain('```')
    expect(result).not.toContain('code hier')
  })

  it('removes table rows and separators', () => {
    const table = '| Name | Wert |\n| --- | --- |\n| Foo | Bar |'
    expect(stripMarkdown(table)).not.toContain('|')
  })

  it('handles a realistic multi-line markdown answer', () => {
    const input = [
      '### Zusammenfassung',
      '',
      'Luke **trifft** Vader.',
      '',
      '- Erster Punkt',
      '- Zweiter Punkt',
    ].join('\n')

    const result = stripMarkdown(input)
    expect(result).not.toMatch(/#{1,6}/)
    expect(result).not.toContain('**')
    expect(result).not.toMatch(/^- /m)
    expect(result).toContain('Zusammenfassung')
    expect(result).toContain('trifft')
    expect(result).toContain('Erster Punkt')
  })
})
