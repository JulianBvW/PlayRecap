import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

describe('MarkdownRenderer', () => {
  it('renders ### heading as heading-styled text', () => {
    const wrapper = mount(MarkdownRenderer, { props: { content: '### Meine Überschrift' } })
    const p = wrapper.find('p')
    expect(p.exists()).toBe(true)
    expect(p.text()).toContain('Meine Überschrift')
    expect(p.attributes('style')).toContain('font-weight: 700')
  })

  it('renders **bold** as strong element', () => {
    const wrapper = mount(MarkdownRenderer, { props: { content: 'Das ist **fett** hier.' } })
    const strong = wrapper.find('strong')
    expect(strong.exists()).toBe(true)
    expect(strong.text()).toBe('fett')
  })

  it('renders - item as bullet with en-dash', () => {
    const wrapper = mount(MarkdownRenderer, { props: { content: '- Listenpunkt eins' } })
    expect(wrapper.text()).toContain('–')
    expect(wrapper.text()).toContain('Listenpunkt eins')
  })

  it('skips blank lines', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: 'Zeile eins\n\nZeile zwei' },
    })
    const paragraphs = wrapper.findAll('p')
    expect(paragraphs).toHaveLength(2)
  })
})
