<script setup lang="ts">
import { ref } from 'vue'
import { useBooksStore } from '@/stores/books'
import type { Book } from '@/types/library'

const booksStore = useBooksStore()
const fileInput = ref<HTMLInputElement | null>(null)

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as { books: Book[] }
      booksStore.upsertBooks(data.books)
    } catch {
      // Phase 4 adds proper validation and error display
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div
    style="
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg);
    "
  >
    <button
      style="
        background: var(--color-surface);
        border: 1px solid var(--color-line);
        color: var(--color-accent);
        font-family: var(--font-serif);
        font-size: 16px;
        font-weight: 500;
        border-radius: 12px;
        padding: 12px 24px;
        cursor: pointer;
      "
      @click="fileInput?.click()"
    >
      Daten importieren
    </button>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none;"
      @change="onFileChange"
    />
  </div>
</template>
