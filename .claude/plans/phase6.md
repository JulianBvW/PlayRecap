Plan: Phase 6 — LLM Integration

Context

Phase 5 is complete (tagged phase-5-done, 68 tests passing). The full chat UI is built and working with a 600ms mock. useChatStore.sendMessage is a stub that uses setTimeout; the Message type already models all four states (thinking → streaming → done | error) and
ChatMessage.vue renders all of them. useSettingsStore.apiKey is a reactive ref persisted in IndexedDB.

src/llm/ does not exist — both files are greenfield. No fetch(), AbortController, or streaming primitives exist anywhere in src/ yet.

Key existing utilities to reuse:

- src/utils/markdown.ts — stripMarkdown(text) (for TTS prep in Phase 7, not needed here)
- src/stores/chat.ts — addMessage, updateLastMessage, getThread (all used by the new sendMessage)
- src/stores/settings.ts — settingsStore.apiKey (read directly in the store, never passed as a prop)
- src/stores/books.ts — booksStore.activeBook (needed to assemble LLM context)

Three steps: context assembly + tests → streaming transport + store wiring → abort + final integration.

---

Step 1 of 3 — Context assembly (src/llm/context.ts + tests)

Pure functions only — no network, fully testable. The most logic-sensitive step because it controls the spoiler boundary.

New: src/llm/context.ts

Export type:
export interface MistralMessage {
role: 'system' | 'user' | 'assistant'
content: string
}

buildSystemPrompt(book: BookRecord, anchorIndex: number): string

Assembles a single string with these sections in order:

1.  Role declaration: "Du bist ein hilfreicher Assistent für Hörbücher."
2.  Language rule:

- 'de' → "Antworte immer auf Deutsch."
- 'en' → "Always answer in English."
- 'auto' → "Antworte in der Sprache, in der die Zusammenfassungen verfasst sind."

3.  Spoiler rule: "Dein Wissen über dieses Buch endet nach Kapitel N. Gib keine Informationen über spätere Kapitel preis." (N = anchorIndex + 1)
4.  Book header: "Buch: {title}\nAutor: {author}"
5.  Series recap (only when book.seriesRecap !== null): "\nBisher in der Serie:\n- bullet\n- bullet"
6.  Chapters 0..anchorIndex (inclusive, never beyond): for each "Kapitel N: {title}\n- summary\n- summary"

Returns lines.join('\n').

buildMessages(history, userText, speechMode, systemPrompt): MistralMessage[]

history is { role: MessageRole; content: string }[] — completed exchanges only, passed in by the caller.

Mode prefix prepended to userText:

- speechMode = false → "Antworte mit strukturiertem Markdown (Überschriften mit ###, Fettdruck mit \*\*, Listen mit -). "
- speechMode = true → "Die Antwort wird vorgelesen. Antworte in natürlicher gesprochener Prosa ohne Markdown-Formatierung. "

Returns:
[
{ role: 'system', content: systemPrompt },
...history,
{ role: 'user', content: modePrefix + userText },
]

Tests: src/**tests**/llm/context.spec.ts

All four roadmap cases:

- buildSystemPrompt: seriesRecap = null → recap section absent; seriesRecap = ['X'] → "Bisher in der Serie" present with bullet
- buildSystemPrompt: anchorIndex = 2, book has 10 chapters → chapters 1–3 present, chapter 4 absent
- buildSystemPrompt: language 'de' → German instruction; 'en' → English; 'auto' → language-match instruction
- buildMessages: speechMode = false → result contains "Markdown"; speechMode = true → result contains "Prosa"

---

Step 2 of 3 — Streaming transport + store wiring (src/llm/mistral.ts + src/stores/chat.ts)

New: src/llm/mistral.ts

const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions'
const MISTRAL_MODEL = 'mistral-small-latest'

export async function\* streamChat(
messages: MistralMessage[],
apiKey: string,
signal?: AbortSignal,
): AsyncGenerator<string> {
const response = await fetch(MISTRAL_ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
body: JSON.stringify({ model: MISTRAL_MODEL, messages, stream: true }),
signal,
})

if (!response.ok) throw new Error(`${response.status}`)

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''
try {
while (true) {
const { done, value } = await reader.read()
if (done) break
buffer += decoder.decode(value, { stream: true })
const lines = buffer.split('\n')
buffer = lines.pop() ?? ''
for (const line of lines) {
if (!line.startsWith('data: ')) continue
const data = line.slice(6)
if (data === '[DONE]') return
try {
const token = JSON.parse(data).choices?.[0]?.delta?.content
if (token) yield token
} catch { /_ malformed SSE line _/ }
}
}
} finally {
reader.releaseLock()
}
}

Update: src/stores/chat.ts

Replace the setTimeout stub with real streaming. sendMessage becomes async:

async function sendMessage(
bookId: string, chapterIndex: number,
text: string, speechMode: boolean,
signal?: AbortSignal,
): Promise<void> {
const settingsStore = useSettingsStore()
const booksStore = useBooksStore()
const format: MessageFormat = speechMode ? 'prose' : 'markdown'

// No-key guard — show inline error, no network call
if (!settingsStore.apiKey) {
addMessage(bookId, chapterIndex, { role: 'user', content: text, format, status: 'done' })
addMessage(bookId, chapterIndex, {
role: 'assistant',
content: 'Bitte füge einen API-Schlüssel in den Einstellungen hinzu.',
format, status: 'error',
})
return
}

// Snapshot history before adding new messages (so userText isn't included twice)
const history = getThread(bookId, chapterIndex)
.filter(m => m.status === 'done')
.map(m => ({ role: m.role, content: m.content }))

addMessage(bookId, chapterIndex, { role: 'user', content: text, format, status: 'done' })
addMessage(bookId, chapterIndex, { role: 'assistant', content: '', format, status: 'thinking' })

try {
const book = booksStore.activeBook!
const systemPrompt = buildSystemPrompt(book, chapterIndex)
const messages = buildMessages(history, text, speechMode, systemPrompt)

     updateLastMessage(bookId, chapterIndex, { status: 'streaming' })
     for await (const token of streamChat(messages, settingsStore.apiKey, signal)) {
       if (signal?.aborted) break
       const last = getThread(bookId, chapterIndex).at(-1)
       if (!last) break
       updateLastMessage(bookId, chapterIndex, { content: last.content + token })
     }
     if (!signal?.aborted) {
       updateLastMessage(bookId, chapterIndex, { status: 'done' })
     }

} catch (e) {
if (signal?.aborted) return
updateLastMessage(bookId, chapterIndex, {
content: 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
status: 'error',
})
}
}

No new tests for SSE streaming (per testing philosophy: integration territory, test manually with real key).

---

Step 3 of 3 — Abort wiring (src/components/ChatSheet.vue) + verification

Update: src/components/ChatSheet.vue

Add onUnmounted import. Own one AbortController reference:

import { ref, computed, watch, onUnmounted } from 'vue'

let activeController: AbortController | null = null

function onSend(text: string, mode: boolean) {
activeController?.abort() // cancel any in-flight request
activeController = new AbortController()
chatStore.sendMessage(props.bookId, props.chapterIndex, text, mode, activeController.signal)
}

onUnmounted(() => {
activeController?.abort()
})

The sendMessage signature change (signal?: AbortSignal) is backward-compatible — callers that don't pass it (e.g. chip sends via onChipSend) still work.

No new tests needed — abort behavior can't be reliably tested in jsdom.

Verification

1.  npm run test:unit — all 68 prior tests + 4 new context tests pass (72 total)
2.  Add a valid Mistral API key in Settings
3.  Open chat on a chapter, send a message → thinking dots appear, then tokens stream in with blinking caret, then done state with ReadAloudButton
4.  Speech mode ON → prose response (no ### or \*\* in text)
5.  English book → response arrives in English
6.  With no API key → inline error message in the chat bubble (no network request fires)
7.  Send a message, immediately close the chat × → no console errors, no ghost tokens appearing if you reopen
8.  Network error (wrong key / offline) → error bubble in chat, prior messages still visible
9.  npm run type-check passes

---

Key reuse

- src/stores/chat.ts — addMessage, updateLastMessage, getThread already exist; only sendMessage body changes
- src/stores/settings.ts — settingsStore.apiKey read directly (never passed as prop — security constraint)
- src/stores/books.ts — booksStore.activeBook needed for context assembly
- src/types/library.ts — BookRecord, MessageFormat, MessageRole (imported in context.ts)
- No new Vue components — this is a pure logic phase
