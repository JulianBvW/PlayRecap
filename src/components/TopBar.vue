<script setup lang="ts">
import { computed } from 'vue'
import type { BookRecord } from '@/types/library'
import CoverImage from '@/components/CoverImage.vue'

const props = withDefaults(
  defineProps<{
    book: BookRecord
    currentChapterIndex?: number
  }>(),
  { currentChapterIndex: 0 },
)

const emit = defineEmits<{ 'open-switcher': [] }>()

const progress = computed(() => {
  const total = props.book.chapters.length
  if (total === 0) return 0
  return ((props.currentChapterIndex + 1) / total) * 100
})
</script>

<template>
  <div style="background: var(--color-bg);">
    <button
      style="
        width: 100%;
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 2px 18px 10px;
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
      "
      @click="emit('open-switcher')"
    >
      <CoverImage :cover="book.cover" :title="book.title" :size="46" />

      <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
        <span
          style="
            font-size: 16.5px;
            font-weight: 600;
            color: var(--color-ink);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: var(--font-serif);
          "
        >{{ book.title }}</span>
        <span
          style="
            font-size: 12.5px;
            font-weight: 400;
            color: var(--color-sub);
            font-family: var(--font-serif);
          "
        >Kapitel {{ currentChapterIndex + 1 }} von {{ book.chapters.length }}</span>
      </div>

      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style="flex-shrink: 0;"
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="var(--color-faint)"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div style="padding: 0 18px;">
      <div style="width: 100%; height: 3px; background: var(--color-line); border-radius: 2px;">
        <div
          :style="{
            height: '100%',
            background: 'var(--color-accent)',
            width: progress + '%',
            transition: 'width .3s ease',
            borderRadius: '2px',
          }"
        />
      </div>
    </div>
  </div>
</template>
