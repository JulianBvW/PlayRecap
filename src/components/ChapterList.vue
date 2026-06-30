<script setup lang="ts">
import { ref } from 'vue'
import type { BookRecord } from '@/types/library'
import ChapterRow from '@/components/ChapterRow.vue'
import SeriesRecapEntry from '@/components/SeriesRecapEntry.vue'

defineProps<{ book: BookRecord }>()
const emit = defineEmits<{
  'open-chat': [chapterIndex: number]
  'open-series-recap': []
}>()

const scrollContainerRef = ref<HTMLElement | null>(null)
const rowRefs = ref<(HTMLElement | null)[]>([])
defineExpose({ scrollContainerRef, rowRefs })
</script>

<template>
  <div
    ref="scrollContainerRef"
    style="
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    "
  >
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
</template>
