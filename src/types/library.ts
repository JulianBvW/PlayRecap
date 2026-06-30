// --- Library JSON contract (matches pipeline output exactly) ---

export interface Chapter {
  index: number     // 0-based; UI displays index + 1
  start: number     // chapter start offset in seconds; render from this, never recompute
  title: string
  summary: string[] // bullet strings without leading markers — UI renders the dots
}

export interface Book {
  id: string
  title: string
  author: string
  language: 'de' | 'en' | 'auto'
  chapterSeconds: number   // nominal chapter length in seconds, informational only
  cover: string | null     // data URI (e.g. "data:image/webp;base64,…") or null → placeholder
  seriesRecap: string[] | null // null = standalone / part 1; array = sequel, always fed to LLM
  chapters: Chapter[]
}

export interface LibraryFile {
  version: number
  books: Book[]
}

// --- Frontend-extended record stored in IndexedDB ---

export interface BookRecord extends Book {
  lastOpenedAt: string | null // ISO timestamp; the only field the frontend ever writes
}

// --- Chat types (in-memory only, never written to IndexedDB) ---

export type MessageFormat = 'markdown' | 'prose' // fixed at send time, never changes after
export type MessageStatus = 'thinking' | 'streaming' | 'done' | 'error'
export type MessageRole = 'user' | 'assistant'

export interface Message {
  role: MessageRole
  content: string
  format: MessageFormat
  status: MessageStatus
}

// Map key: `${bookId}:${chapterIndex}`
export type ChatMap = Map<string, Message[]>
