import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import ReadAloudButton from '@/components/ReadAloudButton.vue'

vi.mock('@/composables/useTTS', () => ({
  useTTS: () => ({
    isPlaying: ref(false),
    isLoading: ref(false),
    isAvailable: true,
    play: vi.fn(),
    stop: vi.fn(),
  }),
  getVoiceId: () => 'gb_oliver_neutral',
}))

vi.mock('@/stores/books', () => ({
  useBooksStore: () => ({ activeBook: ref(null) }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ReadAloudButton', () => {
  it('idle state shows "Vorlesen"', () => {
    const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
    expect(wrapper.text()).toContain('Vorlesen')
    expect(wrapper.text()).not.toContain('Wird vorgelesen')
    expect(wrapper.text()).not.toContain('Lädt')
  })

  it('button is rendered when isAvailable is true', () => {
    const wrapper = mount(ReadAloudButton, { props: { text: 'Test text' } })
    expect(wrapper.find('button').exists()).toBe(true)
  })
})
