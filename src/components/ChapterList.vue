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
defineExpose({ scrollContainerRef })
</script>

<template>
  <div ref="scrollContainerRef">
    <SeriesRecapEntry
      v-if="book.seriesRecap !== null"
      @open="emit('open-series-recap')"
    />

    <ChapterRow
      v-for="ch in book.chapters"
      :key="ch.index"
      :chapter="ch"
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
