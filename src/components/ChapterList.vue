<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BookRecord } from '@/types/library'
import ChapterRow from '@/components/ChapterRow.vue'
import SeriesRecapEntry from '@/components/SeriesRecapEntry.vue'
import ScrollHighlight from '@/components/ScrollHighlight.vue'
import ChapterRail from '@/components/ChapterRail.vue'
import { useScrollSpy } from '@/composables/useScrollSpy'

defineProps<{ book: BookRecord }>()
const emit = defineEmits<{
  'open-chat': [chapterIndex: number]
  'open-series-recap': []
  'chapter-changed': [index: number]
}>()

const scrollContainerRef = ref<HTMLElement | null>(null)
const rowRefs = ref<(HTMLElement | null)[]>([])
defineExpose({ scrollContainerRef, rowRefs })

const { currentChapterIndex } = useScrollSpy(scrollContainerRef, rowRefs)

const highlightTop = ref(0)
const highlightHeight = ref(0)
const shouldAnimate = ref(false)

watch(currentChapterIndex, (newIdx, oldIdx) => {
  shouldAnimate.value = Math.abs(newIdx - oldIdx) <= 1
  const row = rowRefs.value[newIdx]
  if (row) {
    highlightTop.value = row.offsetTop
    highlightHeight.value = row.offsetHeight
  }
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
      <ScrollHighlight :top="highlightTop" :height="highlightHeight" :animate="shouldAnimate" />

      <SeriesRecapEntry
        v-if="book.seriesRecap !== null"
        @open="emit('open-series-recap')"
      />

      <ChapterRow
        v-for="ch in book.chapters"
        :key="ch.index"
        :chapter="ch"
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
