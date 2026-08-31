import { ref, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { stripMarkdown } from '@/utils/markdown'
import { splitForTTS } from '@/utils/ttsChunks'

const VOXTRAL_ENDPOINT = 'https://api.mistral.ai/v1/audio/speech'
const VOXTRAL_MODEL = 'voxtral-mini-tts-2603'

// Mistral offers no German preset voice: GET /v1/audio/voices?type=preset returns
// 30 voices, all en_us / en_gb / fr_fr (see Generator/list_voices.sh). That is why
// speech-mode answers are generated in English (buildSystemPrompt in @/llm/context)
// — text and voice then match. Tags on this voice: calm, even, neutral.
const TTS_VOICE_ID = 'gb_oliver_neutral'

// The endpoint documents "keep prompts under 300 words for best results".
const MAX_WORDS_PER_REQUEST = 280

// Only one answer may be read aloud at a time. Every ReadAloudButton builds its own
// useTTS instance, so the currently playing one is tracked module-wide and stopped
// when another starts.
let activeStop: (() => void) | null = null

async function describeResponseError(response: Response): Promise<string> {
  if (response.status === 401) return 'API-Schlüssel ungültig'
  if (response.status === 403) return 'Text wurde abgelehnt'
  if (response.status === 429) return 'Zu viele Anfragen'
  try {
    const body = await response.json()
    const message = body?.detail ?? body?.message ?? body?.error?.message
    if (typeof message === 'string' && message) return message
  } catch {
    // body not JSON — fall through to the status code
  }
  return `Fehler ${response.status}`
}

export function useTTS() {
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let audio: HTMLAudioElement | null = null
  let blobUrl: string | null = null
  let controller: AbortController | null = null
  // Resolver of the block currently playing. stop() has to settle it, otherwise the
  // awaiting play() chain never unwinds and the async function leaks forever.
  let settleBlock: (() => void) | null = null
  // Bumped by every stop() and play(). A fetch or playback that resolves after its
  // run was superseded compares against this and bails instead of talking over the
  // new one — otherwise a stopped chain would keep playing its next block.
  let runId = 0

  function releaseAudio() {
    if (audio) {
      audio.pause()
      audio.onended = null
      audio.onerror = null
      audio = null
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
    // Let a pending playBlock() finish; the chain then sees it is stale and returns.
    const settle = settleBlock
    settleBlock = null
    settle?.()
  }

  function stop() {
    runId++
    controller?.abort()
    controller = null
    releaseAudio()
    isPlaying.value = false
    isLoading.value = false
    if (activeStop === stop) activeStop = null
  }

  // Returns a Blob rather than raw bytes: the Uint8Array is only narrow enough for
  // the Blob constructor at its construction site.
  async function fetchBlock(text: string, apiKey: string, signal: AbortSignal): Promise<Blob> {
    const response = await fetch(VOXTRAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VOXTRAL_MODEL,
        input: text,
        voice_id: TTS_VOICE_ID,
        response_format: 'mp3',
      }),
      signal,
    })
    if (!response.ok) throw new Error(await describeResponseError(response))

    const { audio_data } = (await response.json()) as { audio_data?: string }
    if (!audio_data) throw new Error('Antwort ohne Audiodaten')

    const binary = atob(audio_data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'audio/mpeg' })
  }

  // Resolves when the block has finished playing. A rejected play() is how the
  // browser reports a blocked autoplay, so it must surface as an error.
  function playBlock(blob: Blob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      releaseAudio()
      blobUrl = URL.createObjectURL(blob)
      const element = new Audio(blobUrl)
      audio = element
      settleBlock = resolve
      element.onended = () => {
        settleBlock = null
        resolve()
      }
      element.onerror = () => {
        settleBlock = null
        reject(new Error('Audio konnte nicht abgespielt werden'))
      }
      element.play().catch((err) => {
        settleBlock = null
        reject(err)
      })
    })
  }

  async function play(text: string) {
    stop()
    if (activeStop) activeStop()
    activeStop = stop

    const run = runId
    const isStale = () => run !== runId
    error.value = null

    const settingsStore = useSettingsStore()
    if (!settingsStore.apiKey) {
      error.value = 'Kein API-Schlüssel'
      return
    }

    // Markdown is stripped first so formatting characters are never spoken, then the
    // plain text is cut into blocks the endpoint can handle.
    const blocks = splitForTTS(stripMarkdown(text), MAX_WORDS_PER_REQUEST)
    if (blocks.length === 0) return

    controller = new AbortController()
    const { signal } = controller
    isLoading.value = true

    try {
      for (const [index, block] of blocks.entries()) {
        const blob = await fetchBlock(block, settingsStore.apiKey, signal)
        if (isStale()) return
        // isPlaying stays true across the whole chain — the network gap between two
        // blocks must not flicker the button back to its idle state.
        if (index === 0) {
          isLoading.value = false
          isPlaying.value = true
        }
        await playBlock(blob)
        if (isStale()) return
      }
      releaseAudio()
      isPlaying.value = false
      if (activeStop === stop) activeStop = null
    } catch (err) {
      if (isStale() || signal.aborted) return
      const message = err instanceof Error ? err.message : 'Vorlesen fehlgeschlagen'
      stop()
      error.value = message
    }
  }

  onUnmounted(stop)

  return { isPlaying, isLoading, error, play, stop }
}
