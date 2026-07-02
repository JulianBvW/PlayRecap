import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomSheet from '@/components/BottomSheet.vue'

describe('BottomSheet', () => {
  it('renders backdrop and slot content when modelValue is true', () => {
    const wrapper = mount(BottomSheet, {
      props: { modelValue: true },
      slots: { default: '<p class="slot-content">Hello</p>' },
      attachTo: document.body,
    })
    expect(document.querySelector('.prc-backdrop')).not.toBeNull()
    expect(document.querySelector('.slot-content')).not.toBeNull()
    wrapper.unmount()
  })

  it('renders nothing when modelValue is false', () => {
    const wrapper = mount(BottomSheet, {
      props: { modelValue: false },
      attachTo: document.body,
    })
    expect(document.querySelector('.prc-backdrop')).toBeNull()
    expect(document.querySelector('.prc-sheet')).toBeNull()
    wrapper.unmount()
  })

  it('emits update:modelValue with false when backdrop is clicked', async () => {
    const wrapper = mount(BottomSheet, {
      props: { modelValue: true },
      attachTo: document.body,
    })
    const backdrop = document.querySelector('.prc-backdrop') as HTMLElement
    backdrop.click()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })
})
