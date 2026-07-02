<script setup lang="ts">
import { ref } from 'vue'
import { useBooksStore } from '@/stores/books'
import { validateLibraryFile } from '@/utils/validateLibrary'

const booksStore = useBooksStore()
const fileInput = ref<HTMLInputElement | null>(null)
const fileError = ref('')

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const data = validateLibraryFile(JSON.parse(await file.text()))
    await booksStore.upsertBooks(data.books)
    fileError.value = ''
  } catch (e) {
    fileError.value = (e as Error).message
  }
  ;(event.target as HTMLInputElement).value = ''
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

    <p
      v-if="fileError"
      style="font-size: 13px; color: var(--color-danger); margin-top: 12px;"
    >{{ fileError }}</p>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none;"
      @change="onFileChange"
    />
  </div>
</template>
