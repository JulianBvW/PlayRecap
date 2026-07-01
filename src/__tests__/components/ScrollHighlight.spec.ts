import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScrollHighlight from '@/components/ScrollHighlight.vue'

describe('ScrollHighlight', () => {
  it('applies smooth transition when animate is true', () => {
    const wrapper = mount(ScrollHighlight, {
      props: { top: 100, height: 200, animate: true },
    })
    const el = wrapper.element as HTMLElement
    expect(el.style.transition).toContain('cubic-bezier')
  })

  it('disables transition when animate is false', () => {
    const wrapper = mount(ScrollHighlight, {
      props: { top: 100, height: 200, animate: false },
    })
    const el = wrapper.element as HTMLElement
    expect(el.style.transition).toBe('none')
  })
})
