<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import type { BookRecord } from '@/types/library'
import ChapterRow from '@/components/ChapterRow.vue'
import SeriesRecapEntry from '@/components/SeriesRecapEntry.vue'
import ScrollHighlight from '@/components/ScrollHighlight.vue'
import ChapterRail from '@/components/ChapterRail.vue'
import { useScrollSpy } from '@/composables/useScrollSpy'

const props = defineProps<{ book: BookRecord }>()
const emit = defineEmits<{
  'open-chat': [chapterIndex: number]
  'open-series-recap': []
  'chapter-changed': [index: number]
}>()

const scrollContainerRef = ref<HTMLElement | null>(null)
const rowRefs = ref<(HTMLElement | null)[]>([])
defineExpose({ scrollContainerRef, rowRefs })

const { currentChapterIndex } = useScrollSpy(scrollContainerRef, rowRefs)

// Static highlights on every 10th chapter (indices 9, 19, 29 …)
const tenthIndices = computed(() =>
  props.book.chapters.map((_, i) => i).filter(i => (i + 1) % 10 === 0),
)
const tenthSet = computed(() => new Set(tenthIndices.value))

// Hide the hr at the top of a highlighted chapter and at the top of the chapter immediately after it,
// so no dividing line appears "touching" the highlighted band.
function showDivider(chapterIndex: number): boolean {
  return !tenthSet.value.has(chapterIndex) && !tenthSet.value.has(chapterIndex - 1)
}

type HighlightPos = { top: number; height: number }
const staticHighlights = ref<HighlightPos[]>([])

function computeStaticHighlights() {
  staticHighlights.value = tenthIndices.value.map(i => {
    const row = rowRefs.value[i]
    return row ? { top: row.offsetTop, height: row.offsetHeight } : { top: 0, height: 0 }
  })
}

onMounted(async () => {
  await nextTick()
  computeStaticHighlights()
})

watch(() => props.book.id, async () => {
  await nextTick()
  if (scrollContainerRef.value) scrollContainerRef.value.scrollTop = 0
  computeStaticHighlights()
})

watch(currentChapterIndex, (newIdx) => {
  emit('chapter-changed', newIdx)
})
</script>

<template>
  <div style="position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column;">
    <div
      ref="scrollContainerRef"
      style="
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        position: relative;
        -webkit-overflow-scrolling: touch;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      "
    >
      <ScrollHighlight
        v-for="(pos, i) in staticHighlights"
        :key="i"
        :top="pos.top"
        :height="pos.height"
        :animate="false"
      />

      <SeriesRecapEntry
        v-if="book.seriesRecap !== null"
        @open="emit('open-series-recap')"
      />

      <ChapterRow
        v-for="ch in book.chapters"
        :key="ch.index"
        :chapter="ch"
        :show-divider="showDivider(ch.index)"
        :ref="(el) => { rowRefs[ch.index] = el ? (el as any).$el : null }"
        @open-chat="emit('open-chat', ch.index)"
      />

      <div
        style="
          padding: 32px 0 48px;
          text-align: center;
          color: var(--color-faint);
          font-size: 13px;
        "
      >
        Ende des Buches
      </div>
    </div>

    <ChapterRail
      :total-chapters="book.chapters.length"
      :current-chapter-index="currentChapterIndex"
      :row-refs="rowRefs"
      :scroll-container="scrollContainerRef"
    />
  </div>
</template>
