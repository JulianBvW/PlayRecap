import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ReadAloudButton from '@/components/ReadAloudButton.vue'

const tts = {
  isPlaying: ref(false),
  isLoading: ref(false),
  error: ref<string | null>(null),
  play: vi.fn<(text: string) => void>(),
  stop: vi.fn<() => void>(),
}

vi.mock('@/composables/useTTS', () => ({
  useTTS: () => tts,
}))

beforeEach(() => {
  tts.isPlaying.value = false
  tts.isLoading.value = false
  tts.error.value = null
  tts.play.mockClear()
  tts.stop.mockClear()
})

describe('ReadAloudButton', () => {
  it('idle state shows "Vorlesen"', () => {
    const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
    expect(wrapper.text()).toContain('Vorlesen')
    expect(wrapper.text()).not.toContain('Wird vorgelesen')
    expect(wrapper.text()).not.toContain('Lädt')
  })

  it('playing state shows "Wird vorgelesen"', async () => {
    const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
    tts.isPlaying.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Wird vorgelesen')
  })

  it('loading state shows "Lädt…"', async () => {
    const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
    tts.isLoading.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Lädt')
  })

  it('tapping starts playback, tapping again stops it', async () => {
    const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
    await wrapper.find('button').trigger('click')
    expect(tts.play).toHaveBeenCalledWith('Test text')

    tts.isPlaying.value = true
    await wrapper.vm.$nextTick()
    await wrapper.find('button').trigger('click')
    expect(tts.stop).toHaveBeenCalled()
  })

  describe('error state', () => {
    it('surfaces the failure instead of looking idle', async () => {
      const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
      tts.error.value = 'API-Schlüssel ungültig'
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('API-Schlüssel ungültig')
      expect(wrapper.text()).not.toContain('Vorlesen')
    })

    it('stays tappable so the user can retry', async () => {
      const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
      tts.error.value = 'Zu viele Anfragen'
      await wrapper.vm.$nextTick()
      await wrapper.find('button').trigger('click')
      expect(tts.play).toHaveBeenCalledWith('Test text')
    })
  })

  describe('auto-play in speech mode', () => {
    it('plays when autoPlay is already true at mount', () => {
      const wrapper = mount(ReadAloudButton, { props: { text: 'Answer', autoPlay: true } })
      expect(tts.play).toHaveBeenCalledWith('Answer')
      expect(wrapper.emitted('played')).toHaveLength(1)
    })

    // The regression this replaced onMounted for: the parent sets autoPlay only
    // after the stream resolves, which can land after this component has mounted.
    it('plays when autoPlay flips to true after mount', async () => {
      const wrapper = mount(ReadAloudButton, { props: { text: 'Answer', autoPlay: false } })
      expect(tts.play).not.toHaveBeenCalled()

      await wrapper.setProps({ autoPlay: true })
      expect(tts.play).toHaveBeenCalledWith('Answer')
      expect(wrapper.emitted('played')).toHaveLength(1)
    })

    it('does not play on its own when autoPlay stays false', () => {
      mount(ReadAloudButton, { props: { text: 'Answer', autoPlay: false } })
      expect(tts.play).not.toHaveBeenCalled()
    })
  })
})
