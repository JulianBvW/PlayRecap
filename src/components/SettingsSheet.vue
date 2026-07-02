<script setup lang="ts">
import { ref } from 'vue'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { validateLibraryFile } from '@/utils/validateLibrary'
import BottomSheet from '@/components/BottomSheet.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const booksStore = useBooksStore()
const settingsStore = useSettingsStore()

const apiKeyDraft = ref(settingsStore.apiKey)
const fileMode = ref<'upsert' | 'import'>('upsert')
const fileError = ref('')
const confirmingClear = ref(false)
const filePicker = ref<HTMLInputElement | null>(null)

function close() {
  emit('update:modelValue', false)
  confirmingClear.value = false
}

function triggerPicker(mode: 'upsert' | 'import') {
  fileMode.value = mode
  fileError.value = ''
  filePicker.value?.click()
}

async function onFileSelected() {
  const file = filePicker.value?.files?.[0]
  if (!file) return
  try {
    const data = validateLibraryFile(JSON.parse(await file.text()))
    if (fileMode.value === 'upsert') await booksStore.upsertBooks(data.books)
    else await booksStore.importBooks(data.books)
    fileError.value = ''
  } catch (e) {
    fileError.value = (e as Error).message
  }
  filePicker.value!.value = ''
}

function exportData() {
  const json = JSON.stringify(booksStore.exportBooks(), null, 2)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = 'playrecap-backup.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

function handleClear() {
  confirmingClear.value = true
}

async function doConfirmClear() {
  await booksStore.clearAll()
  close()
}
</script>

<template>
  <BottomSheet :model-value="modelValue" @update:model-value="close">
    <div
      style="
        max-height: 82vh;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
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
        >Einstellungen</span>

        <button
          aria-label="Einstellungen schließen"
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
          @click="close"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M4 4L14 14M14 4L4 14"
              stroke="var(--color-faint)"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- LLM section -->
      <p
        style="
          font-size: 11px;
          font-weight: 700;
          color: var(--color-faint);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          margin: 0;
          padding: 0 20px 8px;
        "
      >LLM-Verbindung</p>

      <div style="padding: 0 20px 4px;">
        <input
          v-model="apiKeyDraft"
          type="password"
          placeholder="API-Schlüssel einfügen"
          style="
            width: 100%;
            box-sizing: border-box;
            background: var(--color-panel);
            border: 1px solid var(--color-line);
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 15px;
            font-family: var(--font-serif);
            color: var(--color-ink);
            outline: none;
          "
          @blur="settingsStore.setApiKey(apiKeyDraft)"
        />
        <p
          style="
            font-size: 12px;
            color: var(--color-faint);
            margin: 6px 2px 0;
          "
        >Wird nur lokal auf diesem Gerät gespeichert.</p>
      </div>

      <!-- Data section -->
      <p
        style="
          font-size: 11px;
          font-weight: 700;
          color: var(--color-faint);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          margin: 0;
          padding: 20px 20px 8px;
        "
      >Daten</p>

      <!-- Bücher hinzufügen -->
      <button
        style="
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        "
        @click="triggerPicker('upsert')"
      >
        <div
          style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--color-accent-soft);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          "
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="10" height="14" rx="1.5" stroke="var(--color-accent)" stroke-width="1.5" />
            <path d="M14 7v6M11 10h6" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span style="font-size: 16px; color: var(--color-ink);">Bücher hinzufügen</span>
      </button>

      <!-- Daten importieren -->
      <button
        style="
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        "
        @click="triggerPicker('import')"
      >
        <div
          style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--color-accent-soft);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          "
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 2v10M5 8l4 4 4-4" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 14h12" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span style="font-size: 16px; color: var(--color-ink);">Daten importieren</span>
      </button>

      <!-- Daten exportieren -->
      <button
        style="
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        "
        @click="exportData"
      >
        <div
          style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--color-accent-soft);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          "
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 12V2M5 6l4-4 4 4" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 14h12" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span style="font-size: 16px; color: var(--color-ink);">Daten exportieren</span>
      </button>

      <!-- Alle Daten löschen -->
      <button
        style="
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        "
        @click="handleClear"
      >
        <div
          style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--color-danger-soft);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          "
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 5h12M7 5V3h4v2M6 5l1 10h4l1-10" stroke="var(--color-danger)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <span style="font-size: 16px; color: var(--color-danger);">Alle Daten löschen</span>
      </button>

      <!-- Confirm clear -->
      <div
        v-if="confirmingClear"
        style="
          margin: 4px 20px 0;
          padding: 14px 16px;
          background: var(--color-danger-soft);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        "
      >
        <span style="font-size: 14px; color: var(--color-danger);">Wirklich alles löschen?</span>
        <button
          style="
            background: var(--color-danger);
            color: var(--color-surface);
            border: none;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
          "
          @click="doConfirmClear"
        >Löschen</button>
      </div>

      <!-- File error -->
      <p
        v-if="fileError"
        style="
          font-size: 13px;
          color: var(--color-danger);
          margin: 6px 20px 0;
        "
      >{{ fileError }}</p>

      <div style="height: 16px; flex-shrink: 0;" />

      <!-- Hidden file picker -->
      <input
        ref="filePicker"
        type="file"
        accept=".json"
        style="display: none;"
        @change="onFileSelected"
      />
    </div>
  </BottomSheet>
</template>
