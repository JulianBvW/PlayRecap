<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ chapterCount: number; speechMode: boolean }>()
const emit = defineEmits<{
  send: [text: string, speechMode: boolean]
  'update:speechMode': [value: boolean]
}>()

const draft = ref('')

function onSend() {
  if (!draft.value.trim()) return
  emit('send', draft.value.trim(), props.speechMode)
  draft.value = ''
}
</script>

<template>
  <div
    style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      background: var(--color-surface);
      border-top: 1px solid var(--color-line);
      flex-shrink: 0;
    "
  >
    <!-- Mic toggle -->
    <button
      aria-label="Sprachausgabe umschalten"
      :style="{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: `1px solid ${speechMode ? 'transparent' : 'var(--color-line)'}`,
        background: speechMode ? 'var(--color-accent)' : 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: '0',
        padding: '0',
      }"
      @click="emit('update:speechMode', !speechMode)"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="6" y="1" width="6" height="10" rx="3"
          :fill="speechMode ? 'white' : 'var(--color-accent)'" />
        <path d="M3 9C3 12.31 5.69 15 9 15C12.31 15 15 12.31 15 9"
          :stroke="speechMode ? 'white' : 'var(--color-accent)'"
          stroke-width="1.5" stroke-linecap="round" />
        <line x1="9" y1="15" x2="9" y2="17"
          :stroke="speechMode ? 'white' : 'var(--color-accent)'"
          stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>

    <!-- Text input -->
    <input
      v-model="draft"
      type="text"
      :placeholder="`Frage zu Kapitel 1–${props.chapterCount} …`"
      style="
        flex: 1;
        background: var(--color-panel);
        border: 1px solid var(--color-line);
        border-radius: 22px;
        padding: 10px 16px;
        font-size: 15px;
        font-family: var(--font-serif);
        color: var(--color-ink);
        outline: none;
        min-width: 0;
      "
      @keydown.enter.prevent="onSend"
    />

    <!-- Send button -->
    <button
      aria-label="Nachricht senden"
      :disabled="!draft.trim()"
      :style="{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: 'none',
        background: 'var(--color-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: draft.trim() ? 'pointer' : 'default',
        flexShrink: '0',
        padding: '0',
        opacity: draft.trim() ? '1' : '0.4',
      }"
      @click="onSend"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M16 2L1 8L7 10M16 2L10 17L7 10M16 2L7 10"
          stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>
