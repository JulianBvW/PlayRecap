import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChapterRow from '@/components/ChapterRow.vue'
import type { Chapter } from '@/types/library'

const chapter: Chapter = {
  index: 2,
  start: 65,
  title: 'Der Angriff',
  summary: ['Bullet 1', 'Bullet 2'],
}

describe('ChapterRow', () => {
  it('renders the 1-based chapter number', () => {
    const wrapper = mount(ChapterRow, { props: { chapter } })
    expect(wrapper.text()).toContain('KAPITEL 3')
  })

  it('formats start time via formatStartTime', () => {
    const wrapper = mount(ChapterRow, { props: { chapter } })
    expect(wrapper.text()).toContain('01:05')
  })

  it('renders all summary bullets', () => {
    const wrapper = mount(ChapterRow, { props: { chapter } })
    expect(wrapper.text()).toContain('Bullet 1')
    expect(wrapper.text()).toContain('Bullet 2')
  })

  it('renders the chat button', () => {
    const wrapper = mount(ChapterRow, { props: { chapter } })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('emits open-chat when chat button is clicked', async () => {
    const wrapper = mount(ChapterRow, { props: { chapter } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('open-chat')).toHaveLength(1)
  })
})
