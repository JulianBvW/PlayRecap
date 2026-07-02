import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReadAloudButton from '@/components/ReadAloudButton.vue'

describe('ReadAloudButton', () => {
  it('idle state shows "Vorlesen"', () => {
    const wrapper = mount(ReadAloudButton)
    expect(wrapper.text()).toContain('Vorlesen')
    expect(wrapper.text()).not.toContain('Wird vorgelesen')
  })

  it('after click shows "Wird vorgelesen" and hides "Vorlesen"', async () => {
    const wrapper = mount(ReadAloudButton)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Wird vorgelesen')
    expect(wrapper.text()).not.toContain('Vorlesen')
  })
})
