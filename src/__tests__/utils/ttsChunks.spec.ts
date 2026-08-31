import { describe, it, expect } from 'vitest'
import { splitForTTS } from '@/utils/ttsChunks'

describe('splitForTTS', () => {
  it('returns nothing for empty or whitespace-only text', () => {
    expect(splitForTTS('')).toEqual([])
    expect(splitForTTS('   \n\n  ')).toEqual([])
  })

  it('keeps a single sentence as one block', () => {
    expect(splitForTTS('Thrawn kehrt zurück.')).toEqual(['Thrawn kehrt zurück.'])
  })

  it('keeps short text in one block instead of splitting per sentence', () => {
    // Blocks are cut as large as allowed — one melody, not three
    const text = 'Erster Satz. Zweiter Satz. Dritter Satz.'
    expect(splitForTTS(text, 280)).toEqual([text])
  })

  it('packs sentences up to the limit and starts a new block after it', () => {
    // Each sentence is 3 words → limit 6 fits exactly two per block
    const text = 'Aaa bbb ccc. Ddd eee fff. Ggg hhh iii. Jjj kkk lll.'
    expect(splitForTTS(text, 6)).toEqual([
      'Aaa bbb ccc. Ddd eee fff.',
      'Ggg hhh iii. Jjj kkk lll.',
    ])
  })

  it('emits an oversized single sentence whole rather than cutting mid-sentence', () => {
    const long = `${Array.from({ length: 40 }, (_, i) => `wort${i}`).join(' ')}.`
    const blocks = splitForTTS(long, 10)
    expect(blocks).toEqual([long])
  })

  it('never loses or duplicates text', () => {
    const text = 'Eins zwei. Drei vier. Fünf sechs. Sieben acht.'
    const blocks = splitForTTS(text, 4)
    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.join(' ')).toBe(text)
  })

  describe('sentence-boundary guards', () => {
    it('does not cut inside a spaced-out abbreviation like "z. B."', () => {
      const text = 'Er nutzt Tarnschilde, z. B. an der Chimaera, mit großem Erfolg.'
      expect(splitForTTS(text, 4)).toEqual([text])
    })

    it('does not cut inside a decimal number', () => {
      const text = 'Der Wert liegt bei 3.14 laut Messung.'
      expect(splitForTTS(text, 3)).toEqual([text])
    })

    it('does not cut after a known abbreviation', () => {
      const text = 'Siehe Bd. 2 für Details.'
      expect(splitForTTS(text, 2)).toEqual([text])
    })

    it('does not cut between initials', () => {
      const text = 'Geschrieben von J. R. R. Tolkien im Exil.'
      expect(splitForTTS(text, 3)).toEqual([text])
    })

    it('does not cut after an ordinal list marker', () => {
      const text = 'Kapitel 2. beschreibt die Flucht.'
      expect(splitForTTS(text, 2)).toEqual([text])
    })

    it('does cut after a number that genuinely ends a sentence', () => {
      const text = 'Das geschah im Jahr 1994. Danach kam die Wende.'
      expect(splitForTTS(text, 4)).toEqual(['Das geschah im Jahr 1994.', 'Danach kam die Wende.'])
    })

    it('cuts on ! and ? as well', () => {
      const text = 'Wer war das? Niemand weiß es! Wirklich niemand.'
      expect(splitForTTS(text, 3)).toEqual(['Wer war das?', 'Niemand weiß es!', 'Wirklich niemand.'])
    })

    it('keeps a closing quote with its sentence', () => {
      const text = 'Er sagte "es ist vorbei." Dann ging er.'
      expect(splitForTTS(text, 5)).toEqual(['Er sagte "es ist vorbei."', 'Dann ging er.'])
    })
  })
})
