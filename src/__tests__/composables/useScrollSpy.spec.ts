import { describe, it, expect } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useScrollSpy } from '@/composables/useScrollSpy'

function mockRow(offsetTop: number): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'offsetTop', { get: () => offsetTop, configurable: true })
  return el
}

function mockContainer() {
  const el = document.createElement('div')
  let _top = 0
  Object.defineProperty(el, 'scrollTop', {
    get: () => _top,
    set: (v: number) => {
      _top = v
    },
    configurable: true,
  })
  return el
}

function setup(offsets: number[]) {
  const container = mockContainer()
  const containerRef = ref<HTMLElement | null>(container)
  const rowRefs = ref<(HTMLElement | null)[]>(offsets.map(mockRow))

  const TestComp = defineComponent({
    setup: () => useScrollSpy(containerRef, rowRefs),
    template: '<div />',
  })

  const wrapper = mount(TestComp)

  async function scrollTo(top: number) {
    container.scrollTop = top
    container.dispatchEvent(new Event('scroll'))
    await nextTick()
  }

  return { wrapper, scrollTo }
}

describe('useScrollSpy', () => {
  it('starts at index 0 when scrollTop is 0', () => {
    const { wrapper } = setup([0, 100, 200, 300])
    expect((wrapper.vm as any).currentChapterIndex).toBe(0)
  })

  it('advances to index 1 when scrolled past its offsetTop', async () => {
    const { wrapper, scrollTo } = setup([0, 100, 200, 300])
    await scrollTo(110)
    expect((wrapper.vm as any).currentChapterIndex).toBe(1)
  })

  it('returns last index when scrolled past all rows', async () => {
    const { wrapper, scrollTo } = setup([0, 100, 200, 300])
    await scrollTo(350)
    expect((wrapper.vm as any).currentChapterIndex).toBe(3)
  })

  it('returns correct index when scrolled exactly to a row boundary', async () => {
    const { wrapper, scrollTo } = setup([0, 100, 200, 300])
    await scrollTo(200)
    expect((wrapper.vm as any).currentChapterIndex).toBe(2)
  })
})
