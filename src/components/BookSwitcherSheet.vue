<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBooksStore } from '@/stores/books'
import BottomSheet from '@/components/BottomSheet.vue'
import CoverImage from '@/components/CoverImage.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'open-settings': []
}>()

const booksStore = useBooksStore()
const { sortedBooks, activeBook } = storeToRefs(booksStore)

function onSelect(id: string) {
  booksStore.selectBook(id)
  emit('update:modelValue', false)
}

function onOpenSettings() {
  emit('update:modelValue', false)
  emit('open-settings')
}
</script>

<template>
  <BottomSheet :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <div
      style="
        max-height: 82vh;
        display: flex;
        flex-direction: column;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      "
    >
      <!-- Header -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 20px 12px;
          flex-shrink: 0;
        "
      >
        <span
          style="
            font-size: 20px;
            font-weight: 600;
            color: var(--color-ink);
            font-family: var(--font-serif);
          "
        >Deine Hörbücher</span>

        <button
          aria-label="Einstellungen öffnen"
          style="
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
          "
          @click="onOpenSettings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
              stroke="var(--color-faint)"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M16.2 12.5a1.5 1.5 0 0 0 .3 1.65l.05.06a1.8 1.8 0 0 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.91 1.37V18a1.8 1.8 0 0 1-3.6 0v-.07A1.5 1.5 0 0 0 6.8 16.6a1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 0 1-2.55-2.55l.06-.06A1.5 1.5 0 0 0 2.9 12.7a1.5 1.5 0 0 0-1.37-.91H1.5a1.8 1.8 0 0 1 0-3.6h.07A1.5 1.5 0 0 0 2.9 7.2a1.5 1.5 0 0 0-.3-1.65l-.06-.06A1.8 1.8 0 0 1 5.09 2.94l.06.06A1.5 1.5 0 0 0 6.8 3.3a1.5 1.5 0 0 0 .91-1.37V1.8a1.8 1.8 0 0 1 3.6 0v.07A1.5 1.5 0 0 0 13.2 3.3a1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 0 1 2.55 2.55l-.06.06A1.5 1.5 0 0 0 17.1 7.2a1.5 1.5 0 0 0 1.37.91H18.5a1.8 1.8 0 0 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.91l.06-.12z"
              stroke="var(--color-faint)"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <!-- Book list -->
      <div style="overflow-y: auto; flex: 1;">
        <button
          v-for="book in sortedBooks"
          :key="book.id"
          :style="{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '10px 20px',
            background: book.id === activeBook?.id ? 'var(--color-accent-soft)' : 'transparent',
            borderRadius: book.id === activeBook?.id ? '14px' : '0',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }"
          @click="onSelect(book.id)"
        >
          <CoverImage :cover="book.cover" :title="book.title" :size="56" />

          <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
            <span
              style="
                font-size: 16px;
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
                font-size: 13px;
                font-weight: 400;
                color: var(--color-sub);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
            >{{ book.author }}</span>
            <span style="font-size: 13px; color: var(--color-faint);">
              {{ book.chapters.length }} Kapitel
            </span>
          </div>

          <svg
            v-if="book.id === activeBook?.id"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            style="flex-shrink: 0;"
          >
            <path
              d="M3.5 9L7.5 13L14.5 5"
              stroke="var(--color-accent)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div style="height: 8px;" />
      </div>
    </div>
  </BottomSheet>
</template>
