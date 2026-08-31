import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTTS } from '@/composables/useTTS'
import { useSettingsStore } from '@/stores/settings'

// A base64 payload is required because play() runs it through atob().
const FAKE_MP3 = btoa('fake-mp3-bytes')

// Fires onended on the next microtask so a chunk chain actually advances.
const audioInstances: FakeAudio[] = []
class FakeAudio {
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = false
  static failNextPlay = false
  // When held, onended never fires — the instance stays "currently playing"
  static holdPlayback = false

  constructor(public src: string) {
    audioInstances.push(this)
  }

  play() {
    if (FakeAudio.failNextPlay) {
      FakeAudio.failNextPlay = false
      return Promise.reject(new Error('NotAllowedError'))
    }
    if (!FakeAudio.holdPlayback) Promise.resolve().then(() => this.onended?.())
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

// useTTS registers onUnmounted, so it needs a component context.
function mountTTS() {
  let api!: ReturnType<typeof useTTS>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useTTS()
        return () => h('div')
      },
    }),
  )
  return { api, wrapper }
}

type FetchMock = (url: string, init: RequestInit) => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn<FetchMock>>

beforeEach(() => {
  setActivePinia(createPinia())
  useSettingsStore().apiKey = 'test-key'

  audioInstances.length = 0
  FakeAudio.failNextPlay = false
  FakeAudio.holdPlayback = false
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn<() => string>(() => 'blob:fake'),
    revokeObjectURL: vi.fn<() => void>(),
  })

  fetchMock = vi.fn<FetchMock>(() => Promise.resolve(jsonResponse({ audio_data: FAKE_MP3 })))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTTS', () => {
  it('sends model, voice and mp3 format to the speech endpoint', async () => {
    const { api } = mountTTS()
    await api.play('Ein kurzer Satz.')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.mistral.ai/v1/audio/speech')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body).toMatchObject({
      model: 'voxtral-mini-tts-2603',
      voice_id: 'gb_oliver_neutral',
      response_format: 'mp3',
      input: 'Ein kurzer Satz.',
    })
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-key',
    })
  })

  it('strips markdown before speaking so formatting is never read aloud', async () => {
    const { api } = mountTTS()
    await api.play('### Titel\n\n**fett** und - Punkt')

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.input).not.toContain('#')
    expect(body.input).not.toContain('**')
    expect(body.input).toContain('fett')
  })

  it('splits long text into one request per block and plays them in order', async () => {
    const { api } = mountTTS()
    // Three sentences of 3 words; the 280-word default keeps them together, so this
    // asserts the chain via the split itself being driven by the same helper.
    const long = Array.from({ length: 400 }, (_, i) => `wort${i}`).join(' ') + '.'
    const second = 'Zweiter Satz folgt hier.'
    await api.play(`${long} ${second}`)

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
    const inputs = fetchMock.mock.calls.map(
      (c) => JSON.parse((c[1] as RequestInit).body as string).input,
    )
    expect(inputs.at(-1)).toContain('Zweiter Satz')
    // One Audio element per block, created in order
    expect(audioInstances).toHaveLength(fetchMock.mock.calls.length)
  })

  it('ends in an idle state after the last block', async () => {
    const { api } = mountTTS()
    await api.play('Fertig.')
    expect(api.isPlaying.value).toBe(false)
    expect(api.isLoading.value).toBe(false)
    expect(api.error.value).toBeNull()
  })

  describe('errors are surfaced instead of failing silently', () => {
    it('reports a missing API key without calling the endpoint', async () => {
      const { api } = mountTTS()
      useSettingsStore().apiKey = ''
      await api.play('Text')
      expect(fetchMock).not.toHaveBeenCalled()
      expect(api.error.value).toBe('Kein API-Schlüssel')
    })

    it('maps 401 to an invalid-key message', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 401))
      const { api } = mountTTS()
      await api.play('Text')
      expect(api.error.value).toBe('API-Schlüssel ungültig')
      expect(api.isPlaying.value).toBe(false)
    })

    it('maps 403 to the content-moderation case', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 403))
      const { api } = mountTTS()
      await api.play('Text')
      expect(api.error.value).toBe('Text wurde abgelehnt')
    })

    it('maps 429 to a rate-limit message', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 429))
      const { api } = mountTTS()
      await api.play('Text')
      expect(api.error.value).toBe('Zu viele Anfragen')
    })

    it('falls back to the status code for an unmapped failure', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500))
      const { api } = mountTTS()
      await api.play('Text')
      expect(api.error.value).toBe('Fehler 500')
    })

    it('reports a response without audio data', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      const { api } = mountTTS()
      await api.play('Text')
      expect(api.error.value).toBe('Antwort ohne Audiodaten')
    })

    // This is how a browser reports blocked autoplay — the iOS case
    it('reports a rejected play() instead of looking like nothing happened', async () => {
      FakeAudio.failNextPlay = true
      const { api } = mountTTS()
      await api.play('Text')
      expect(api.error.value).toBe('NotAllowedError')
      expect(api.isPlaying.value).toBe(false)
    })
  })

  describe('stop', () => {
    it('aborts the in-flight request and clears the playing state', async () => {
      const { api } = mountTTS()
      const pending = api.play('Text')
      api.stop()
      await pending
      expect(api.isPlaying.value).toBe(false)
      expect(api.isLoading.value).toBe(false)
    })

    it('does not leave an error behind when the user stopped deliberately', async () => {
      const { api } = mountTTS()
      const pending = api.play('Text')
      api.stop()
      await pending
      expect(api.error.value).toBeNull()
    })
  })

  it('stops a playing instance when another one starts', async () => {
    const first = mountTTS().api
    const second = mountTTS().api

    // Hold the first one mid-playback so it is genuinely the active instance
    FakeAudio.holdPlayback = true
    const firstRun = first.play('Erste Antwort.')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(first.isPlaying.value).toBe(true)

    FakeAudio.holdPlayback = false
    await second.play('Zweite Antwort.')

    // Starting the second answer must have stopped the first
    expect(first.isPlaying.value).toBe(false)
    await firstRun
  })
})
