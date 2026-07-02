Plan: Phase 5 — Chat UI

Context

Phase 4 is complete (tagged phase-4-done, 58 tests passing). ChapterRow.vue already has a chat button that emits open-chat (no args) and App.vue discards it with () => {}. useChatStore has threads, getThread, addMessage, updateLastMessage, clearThread but no sendMessage.
Message type already has role, content, format: MessageFormat, status: MessageStatus. CSS tokens include --color-user-bubble and --color-user-ink. Animation stubs prc-rise/prc-fade exist; prc-sin/prc-sout/prc-dot/prc-eq/prc-blink need to be added.

ChatSheet is not based on BottomSheet — it's 95% height, uses prc-sin/prc-sout, has no grab handle, and needs a fixed-bottom input. It replicates the isClosing + <Teleport> pattern independently.

Three steps: store + animations + primitives → message rendering → full assembly + wiring.

---

Step 1 of 3 — useChatStore.sendMessage + CSS animation stubs + ThinkingDots.vue + StreamingCaret.vue

Update: src/stores/chat.ts

Add sendMessage(bookId, chapterIndex, text, speechMode):
function sendMessage(bookId: string, chapterIndex: number, text: string, speechMode: boolean): void {
const format: MessageFormat = speechMode ? 'prose' : 'markdown'
addMessage(bookId, chapterIndex, { role: 'user', content: text, format, status: 'done' })
addMessage(bookId, chapterIndex, { role: 'assistant', content: '', format, status: 'thinking' })
setTimeout(() => {
updateLastMessage(bookId, chapterIndex, {
content: speechMode
? `Dies ist eine simulierte Prosa-Antwort für Kapitel ${chapterIndex + 1}.`
: `### Simulierte Antwort\n\nDies ist eine **simulierte** Antwort.\n\n- Punkt eins\n- Punkt zwei`,
status: 'done',
})
}, 600)
}
Export sendMessage from the store return.

Update: src/assets/main.css

Add after the existing prc-backdrop--out rule:
@keyframes prc-sin {
from { transform: translateY(100%); }
to { transform: translateY(0); }
}
@keyframes prc-dot {
0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
40% { transform: translateY(-4px); opacity: 1; }
}
@keyframes prc-eq {
0%, 100% { transform: scaleY(0.4); }
50% { transform: scaleY(1); }
}
@keyframes prc-blink {
0%, 100% { opacity: 1; }
50% { opacity: 0; }
}

.prc-chat { animation: prc-sin .34s cubic-bezier(.22,1,.36,1) forwards; }
.prc-chat--out { animation: prc-sin .3s ease-in reverse forwards; }

New: src/components/ThinkingDots.vue

Three 6×6 var(--color-accent) circles (border-radius: 50%) in a display: flex; gap: 5px; align-items: center; height: 24px row. Each has animation: prc-dot 0.9s infinite with animation-delay: 0s, 0.15s, 0.3s respectively.

New: src/components/StreamingCaret.vue

8×18 var(--color-accent) rect (border-radius: 2px, display: inline-block, vertical-align: middle) with animation: prc-blink 0.8s step-end infinite.

Tests: src/**tests**/stores/chat.spec.ts

- Two threads with different (bookId, chapterIndex) pairs stay independent (message in thread A absent from thread B)
- speechMode=false → both messages get format: 'markdown'
- speechMode=true → both messages get format: 'prose'

---

Step 2 of 3 — MarkdownRenderer.vue + ReadAloudButton.vue + ChatMessage.vue + tests

New: src/components/MarkdownRenderer.vue

Props: content: string.

Parses content line-by-line into typed segments — no v-html, structured v-for rendering:

type Segment =
| { type: 'heading'; text: string }
| { type: 'bullet'; text: string }
| { type: 'paragraph'; parts: { bold: boolean; text: string }[] }

Parse rules (in a computed inside <script setup>):

- Line starts with ### → { type: 'heading', text: ... }
- Line starts with - → { type: 'bullet', text: ... }
- Blank line → skip
- Otherwise → { type: 'paragraph', parts: splitBold(line) } (splits on **...**)

Rendering:

- heading: <p style="font-size:14px; font-weight:700; color:var(--color-ink); margin:12px 0 4px">
- bullet: <div style="display:flex; gap:8px; align-items:flex-start; margin:4px 0"> — <span style="color:var(--color-accent); flex-shrink:0">–</span> + <span style="font-size:16px; line-height:1.62; color:var(--color-ink)">text</span>
- paragraph: <p style="font-size:16px; line-height:1.62; color:var(--color-ink); margin:6px 0"> with <strong> wrapping bold parts

New: src/components/ReadAloudButton.vue

Internal state: isPlaying = ref(false). Click toggles isPlaying.

Idle (!isPlaying): pill button — speaker SVG + "Vorlesen", surface bg, 1px line border, sub text, border-radius: 20px, padding: 7px 14px, gap: 6px.

Playing (isPlaying): stop-square SVG + "Wird vorgelesen" + three 3×14 accent bars (transform-origin: bottom, each with prc-eq 0.7s ease-in-out infinite, stagger 0s/0.15s/0.3s) + accent-soft bg, accent text/border.

New: src/components/ChatMessage.vue

Props: message: Message.

User (role === 'user'): display:flex; justify-content:flex-end; padding:4px 20px. Bubble: background:var(--color-user-bubble); color:var(--color-user-ink); border-radius:16px 16px 5px 16px; padding:10px 14px; font-size:15px; line-height:1.45; max-width:80%. Plain {{
 message.content }}.

Assistant (role === 'assistant'): padding:4px 20px:

- status: 'thinking' → <ThinkingDots />
- status: 'streaming' → plain text + <StreamingCaret />
- status: 'done' + format: 'markdown' → <MarkdownRenderer :content="message.content" />
- status: 'done' + format: 'prose' → <p> per \n\n-split chunk, font-size:16px; line-height:1.7
- status: 'error' → <p style="color:var(--color-danger)">{{ message.content }}</p>
- After done content: <ReadAloudButton />

Tests: src/**tests**/components/MarkdownRenderer.spec.ts

it('renders ### heading as heading-styled text', ...) // text present, heading-like element
it('renders **bold** as strong element', ...) // strong or font-weight in DOM
it('renders - item as bullet with en-dash', ...) // "–" and item text both present

Tests: src/**tests**/components/ReadAloudButton.spec.ts

it('idle state shows "Vorlesen"', ...)
it('after click shows "Wird vorgelesen"', ...)

---

Step 3 of 3 — ChatEmpty.vue + ChatInput.vue + ChatSheet.vue + wiring

New: src/components/ChatEmpty.vue

Props: chapterCount: number. Emits: send: [text: string].

Centered column, padding: 40px 20px 24px:

- Greeting "Was möchtest du wissen?" (18px/500/sub/serif)
- display:flex; flex-wrap:wrap; gap:8px; justify-content:center chip row:
  a. "Fasse die wichtigsten Ereignisse zusammen"
  b. "Wer sind die Hauptfiguren?"
  c. "Was war der wichtigste Wendepunkt?"
  d. "Letzte 3 Kapitel zusammenfassen" — hidden when chapterCount < 3
- Chips: pill buttons, 1px line border, surface bg, sub text, border-radius: 20px, padding: 8px 16px, font-size: 14px

New: src/components/ChatInput.vue

Props: chapterCount: number. Emits: send: [text: string, speechMode: boolean].

Internal: draft = ref(''), speechMode = ref(false).

onSend(): if draft.value.trim() → emit('send', draft.value.trim(), speechMode.value) → draft.value = ''.

Layout (display:flex; align-items:center; gap:10px; padding:10px 16px; padding-bottom:calc(10px + env(safe-area-inset-bottom, 0px)); background:var(--color-surface); border-top:1px solid var(--color-line); flex-shrink:0):

- Mic (42×42 circle): OFF → surface/line/mic SVG in accent; ON → accent bg/white mic SVG. Click toggles speechMode.
- Input (flex:1): panel bg, line border, border-radius:22px, padding:10px 16px, font-size:15px, placeholder `Frage zu Kapitel 1–${chapterCount} …`, @keydown.enter.prevent="onSend". v-model="draft".
- Send (42×42 circle, accent bg): paper-plane SVG. :disabled="!draft.trim()", opacity:0.4 when disabled.

New: src/components/ChatSheet.vue

Props: modelValue: boolean, bookId: string, chapterIndex: number. Emits: update:modelValue.

Reads useChatStore(), useBooksStore() (storeToRefs for activeBook).

isClosing + 300ms pattern (same as BottomSheet).

thread = computed(() => chatStore.getThread(bookId, chapterIndex)).

onSend(text: string, speechMode: boolean): calls chatStore.sendMessage(bookId, chapterIndex, text, speechMode).

Template:
<Teleport to="body">

   <div v-if="modelValue || isClosing">
     <div :class="['prc-backdrop', { 'prc-backdrop--out': isClosing }]"
       style="position:fixed; inset:0; background:rgba(20,18,15,0.34); z-index:22;"
       @click="emit('update:modelValue', false)" />

     <div :class="['prc-chat', { 'prc-chat--out': isClosing }]"
       style="position:fixed; top:5vh; left:0; right:0; bottom:0; background:var(--color-surface);
              border-radius:22px 22px 0 0; box-shadow:0 -10px 44px rgba(0,0,0,0.22); z-index:23;
              display:flex; flex-direction:column;">

       <!-- Header -->
       <div style="display:flex; flex-direction:column; align-items:center; padding:16px 20px 12px; flex-shrink:0; position:relative; border-bottom:1px solid var(--color-line);">
         <span style="font-size:12.5px; color:var(--color-faint);">{{ activeBook?.title }}</span>
         <span style="font-size:22px; font-weight:600; color:var(--color-ink); font-family:var(--font-serif);">Kapitel {{ chapterIndex + 1 }}</span>
         <button @click="emit('update:modelValue', false)"
           aria-label="Chat schließen"
           style="position:absolute; right:16px; top:50%; transform:translateY(-50%);
                  width:36px; height:36px; background:transparent; border:none; cursor:pointer; ...">
           <!-- × SVG 18×18 -->
         </button>
       </div>

       <!-- Messages -->
       <div style="flex:1; overflow-y:auto; padding:12px 0;">
         <ChatEmpty v-if="!thread.length" :chapter-count="activeBook?.chapters.length ?? 0"
           @send="(text) => onSend(text, false)" />
         <ChatMessage v-for="(msg, i) in thread" :key="i" :message="msg" />
       </div>

       <!-- Input -->
       <ChatInput :chapter-count="activeBook?.chapters.length ?? 0" @send="onSend" />
     </div>

   </div>
 </Teleport>

Update: src/components/ChapterRow.vue

Change emit type: 'open-chat': [chapterIndex: number]
Change click: @click="emit('open-chat', chapter.index)"

Update: src/components/ChapterList.vue

Change @open-chat="() => {}" to @open-chat="(i) => emit('open-chat', i)".
Update ChapterList's own emit definition to 'open-chat': [chapterIndex: number].

Update: src/App.vue

import ChatSheet from '@/components/ChatSheet.vue'
const showChat = ref(false)
const chatChapterIndex = ref(0)

Change @open-chat handler on <ChapterList>:
@open-chat="(i) => { chatChapterIndex.value = i; showChat.value = true }"

Add at bottom of template (alongside BookSwitcherSheet and SettingsSheet):
<ChatSheet
   v-model="showChat"
   :book-id="activeBook?.id ?? ''"
   :chapter-index="chatChapterIndex"
 />

---

Key reuse

- BottomSheet.vue — not used by ChatSheet (different animation + no grab handle)
- ThinkingDots, StreamingCaret — rendered inside ChatMessage
- MarkdownRenderer — rendered inside ChatMessage for assistant format: 'markdown' messages only
- ReadAloudButton — rendered inside ChatMessage after status: 'done' assistant messages
- stripMarkdown (src/utils/markdown.ts) — Phase 7 will pass text through this before TTS; no Phase 5 call needed
- useChatStore.getThread — already in store; sendMessage is the only addition
- storeToRefs from pinia — pattern already used in BookSwitcherSheet and SettingsSheet

---

Verification

1.  npm run test:unit — all 58 prior tests + new tests pass
2.  Tap a chapter's chat button → ChatSheet slides up from bottom (prc-sin, translateY 100%→0)
3.  Empty state: "Was möchtest du wissen?" greeting + 4 chips visible
4.  Tap a chip → user bubble appears right-aligned (dark bg), thinking dots appear, mock markdown response after ~600ms
5.  Heading/bold/bullet render correctly in markdown response
6.  Type a message + Enter → same flow
7.  Toggle mic → button changes to accent bg; send → mock prose response (plain paragraphs, no bullets)
8.  "Vorlesen" shows below assistant message; tap → "Wird vorgelesen" + equalizer bars
9.  Close × → sheet slides back down, backdrop fades (prc-chat--out, prc-backdrop--out)
10. Open chat on chapter 1, send a message. Open chat on chapter 3 → thread is empty (independent)
11. npm run type-check passes
