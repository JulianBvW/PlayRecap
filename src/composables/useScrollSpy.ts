import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export function useScrollSpy(
  scrollContainer: Ref<HTMLElement | null>,
  rowRefs: Ref<(HTMLElement | null)[]>,
): { currentChapterIndex: Ref<number> } {
  const currentChapterIndex = ref(0)

  function compute() {
    const el = scrollContainer.value
    if (!el) return
    const scrollTop = el.scrollTop
    let idx = 0
    for (let i = 0; i < rowRefs.value.length; i++) {
      const row = rowRefs.value[i]
      if (row && row.offsetTop <= scrollTop) idx = i
    }
    currentChapterIndex.value = idx
  }

  onMounted(() => {
    scrollContainer.value?.addEventListener('scroll', compute, { passive: true })
    compute()
  })

  onUnmounted(() => {
    scrollContainer.value?.removeEventListener('scroll', compute)
  })

  return { currentChapterIndex }
}
