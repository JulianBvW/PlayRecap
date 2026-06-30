import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverImage from '@/components/CoverImage.vue'

describe('CoverImage', () => {
  it('shows the first letter of the title when cover is null', () => {
    const wrapper = mount(CoverImage, { props: { cover: null, title: 'Dune' } })
    expect(wrapper.text()).toContain('D')
  })

  it('shows the correct first letter for a German title', () => {
    const wrapper = mount(CoverImage, {
      props: { cover: null, title: 'Erben des Imperiums' },
    })
    expect(wrapper.text()).toContain('E')
  })

  it('renders an img tag and no letter text when cover is a data URI', () => {
    const cover = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const wrapper = mount(CoverImage, { props: { cover, title: 'Dune' } })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
  })
})
