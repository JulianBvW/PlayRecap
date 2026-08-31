/**
 * Splits text into blocks small enough for the Voxtral TTS endpoint, which
 * documents "keep prompts under 300 words for best results".
 *
 * Blocks are cut as LARGE as allowed, not as small as possible: Voxtral sets the
 * prosody per request, so every block gets its own sentence melody. Many small
 * blocks sound chopped up — for a calm reading app that costs more than a few
 * hundred milliseconds of latency would.
 *
 * Cuts land on sentence boundaries. `stripMarkdown` runs before this.
 */

// Abbreviations whose trailing period is not a sentence end. German text is full
// of them, and a naive /[.!?]\s/ would cut inside "z. B." or "Bd. 2" — audibly wrong.
const ABBREVIATIONS = new Set([
  'bzw',
  'ca',
  'etc',
  'evtl',
  'ggf',
  'inkl',
  'usw',
  'vgl',
  'zzgl',
  'abs',
  'bd',
  'kap',
  'nr',
  'str',
  'dr',
  'prof',
  'hr',
  'fr',
  'st',
  'mr',
  'mrs',
  'ms',
  'jr',
  'sr',
  'vs',
  'approx',
])

const WORD_BEFORE_DOT = /[A-Za-zÄÖÜäöüß]+$/
const STARTS_NEW_SENTENCE = /^["'»„(]?[A-ZÄÖÜ]/

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Decides whether the punctuation at `dotIndex` really ends a sentence.
 * `restIndex` is where the following text starts (after the whitespace run).
 */
function isSentenceEnd(text: string, dotIndex: number, restIndex: number): boolean {
  // "!" "?" "…" are unambiguous; only "." needs the guards below.
  if (text[dotIndex] !== '.') return true

  const prevChar = text[dotIndex - 1] ?? ''
  const nextChar = text[dotIndex + 1] ?? ''

  // Decimal numbers and version-like tokens: 3.14
  if (/\d/.test(prevChar) && /\d/.test(nextChar)) return false

  const trailingWord = text.slice(0, dotIndex).match(WORD_BEFORE_DOT)?.[0]

  if (trailingWord) {
    // Single letters are initials ("J. R. R. Tolkien") or the halves of
    // spaced-out abbreviations like "z. B." and "u. a."
    if (trailingWord.length === 1) return false
    return !ABBREVIATIONS.has(trailingWord.toLowerCase())
  }

  // A digit right before the dot is ambiguous: it may end a sentence
  // ("… im Jahr 1994.") or be an ordinal / list marker ("Kapitel 2."). Only
  // treat it as an end when what follows actually starts a new sentence.
  return STARTS_NEW_SENTENCE.test(text.slice(restIndex))
}

function splitSentences(text: string): string[] {
  const sentences: string[] = []
  // Punctuation, optional closing quote/bracket, then whitespace or end of text.
  const boundary = /[.!?…]+["'»“)\]]*(\s+|$)/g
  let start = 0
  let match: RegExpExecArray | null

  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[0].length
    if (!isSentenceEnd(text, match.index, end)) continue
    const sentence = text.slice(start, end).trim()
    if (sentence) sentences.push(sentence)
    start = end
  }

  const tail = text.slice(start).trim()
  if (tail) sentences.push(tail)
  return sentences
}

/**
 * Greedily packs sentences into blocks of at most `maxWords` words.
 * A single sentence longer than `maxWords` is emitted whole rather than cut
 * mid-thought — the endpoint's limit is a quality hint, not a hard error.
 */
export function splitForTTS(text: string, maxWords = 280): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const blocks: string[] = []
  let current = ''
  let currentWords = 0

  for (const sentence of splitSentences(trimmed)) {
    const words = countWords(sentence)

    if (current && currentWords + words > maxWords) {
      blocks.push(current)
      current = sentence
      currentWords = words
      continue
    }

    current = current ? `${current} ${sentence}` : sentence
    currentWords += words
  }

  if (current) blocks.push(current)
  return blocks
}
