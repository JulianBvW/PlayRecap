import { ref, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { stripMarkdown } from '@/utils/markdown'

const VOXTRAL_ENDPOINT = 'https://api.mistral.ai/v1/audio/speech'
const VOXTRAL_MODEL = 'voxtral-mini-tts-2603'

// Returns the Voxtral voice slug for a given book language, or null if unsupported.
// Only English is currently available on the Mistral TTS API (as of 2026-07).
export function getVoiceId(language: string): string | null {
  if (language === 'en') return 'gb_oliver_neutral'
  return null
}

export function useTTS(language: string) {
  const voiceId = getVoiceId(language)
  const isAvailable = voiceId !== null

  const isPlaying = ref(false)
  let audio: HTMLAudioElement | null = null
  let blobUrl: string | null = null

  function stop() {
    audio?.pause()
    audio = null
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
    isPlaying.value = false
  }

  async function play(text: string) {
    if (!voiceId) return
    stop()
    const settingsStore = useSettingsStore()
    if (!settingsStore.apiKey) return

    const input = stripMarkdown(text)
    if (!input) return

    isPlaying.value = true
    try {
      const response = await fetch(VOXTRAL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settingsStore.apiKey}`,
        },
        body: JSON.stringify({
          model: VOXTRAL_MODEL,
          input,
          voice_id: voiceId,
          response_format: 'mp3',
        }),
      })
      if (!response.ok) throw new Error(`${response.status}`)

      const { audio_data } = (await response.json()) as { audio_data: string }
      const binary = atob(audio_data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      audio = new Audio(blobUrl)
      audio.onended = stop
      audio.onerror = stop
      await audio.play()
    } catch {
      stop()
    }
  }

  onUnmounted(stop)

  return { isPlaying, isAvailable, play, stop }
}
