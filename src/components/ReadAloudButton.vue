<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBooksStore } from '@/stores/books'
import { useTTS } from '@/composables/useTTS'

const props = defineProps<{
  text: string
  autoPlay?: boolean
}>()

const emit = defineEmits<{ played: [] }>()

const booksStore = useBooksStore()
const { activeBook } = storeToRefs(booksStore)

const { isPlaying, isAvailable, play, stop } = useTTS(activeBook.value?.language ?? 'auto')

function toggle() {
  if (isPlaying.value) {
    stop()
  } else {
    play(props.text)
  }
}

onMounted(() => {
  if (props.autoPlay) {
    play(props.text)
    emit('played')
  }
})
</script>

<template>
  <button
    v-if="isAvailable"
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '7px 14px',
      borderRadius: '20px',
      border: `1px solid ${isPlaying ? 'var(--color-accent)' : 'var(--color-line)'}`,
      background: isPlaying ? 'var(--color-accent-soft)' : 'var(--color-surface)',
      color: isPlaying ? 'var(--color-accent)' : 'var(--color-sub)',
      cursor: 'pointer',
      fontSize: '13px',
      fontFamily: 'var(--font-serif)',
    }"
    @click="toggle"
  >
    <!-- Idle: speaker icon -->
    <svg
      v-if="!isPlaying"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 5H4.5L8 2V12L4.5 9H2V5Z"
        fill="var(--color-sub)"
      />
      <path
        d="M10 4.5C10.9 5.4 10.9 8.6 10 9.5M11.5 3C13.2 4.7 13.2 9.3 11.5 11"
        stroke="var(--color-sub)"
        stroke-width="1.2"
        stroke-linecap="round"
      />
    </svg>

    <!-- Playing: stop square -->
    <svg
      v-else
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="var(--color-accent)" />
    </svg>

    <span v-if="!isPlaying">Vorlesen</span>
    <span v-else>Wird vorgelesen</span>

    <!-- Equalizer bars (playing only) -->
    <template v-if="isPlaying">
      <span
        v-for="(delay, i) in ['0s', '0.15s', '0.3s']"
        :key="i"
        :style="{
          display: 'inline-block',
          width: '3px',
          height: '14px',
          background: 'var(--color-accent)',
          borderRadius: '1.5px',
          transformOrigin: 'bottom',
          animation: 'prc-eq 0.7s ease-in-out infinite',
          animationDelay: delay,
        }"
      />
    </template>
  </button>
</template>
