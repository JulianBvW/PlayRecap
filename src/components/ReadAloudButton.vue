<script setup lang="ts">
import { watch } from 'vue'
import { useTTS } from '@/composables/useTTS'

const props = defineProps<{
  text: string
  autoPlay?: boolean
}>()

const emit = defineEmits<{ played: [] }>()

const { isPlaying, isLoading, error, play, stop } = useTTS()

function toggle() {
  if (isPlaying.value || isLoading.value) {
    stop()
  } else {
    play(props.text)
  }
}

// A watch, not onMounted: in speech mode the parent sets autoPlay only after the
// stream resolves, which can land either before or after this component mounts
// (the status flip to 'done' is what mounts it). immediate covers the first case,
// the watch itself the second — onMounted alone missed the second and the answer
// then never started on its own.
watch(
  () => props.autoPlay,
  (shouldPlay) => {
    if (!shouldPlay) return
    play(props.text)
    emit('played')
  },
  { immediate: true },
)
</script>

<template>
  <button
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '7px 14px',
      borderRadius: '20px',
      border: `1px solid ${
        error
          ? 'var(--color-danger)'
          : isPlaying
            ? 'var(--color-accent)'
            : isLoading
              ? 'var(--color-faint)'
              : 'var(--color-line)'
      }`,
      background: isPlaying ? 'var(--color-accent-soft)' : 'var(--color-surface)',
      color: error
        ? 'var(--color-danger)'
        : isPlaying
          ? 'var(--color-accent)'
          : isLoading
            ? 'var(--color-faint)'
            : 'var(--color-sub)',
      cursor: isLoading ? 'default' : 'pointer',
      fontSize: '13px',
      fontFamily: 'var(--font-serif)',
      opacity: isLoading ? '0.7' : '1',
    }"
    @click="toggle"
  >
    <!-- Error: what went wrong, tapping retries -->
    <template v-if="error">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M7 1.5L13 12.5H1L7 1.5Z"
          stroke="var(--color-danger)"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
        <path
          d="M7 5.5V8.5M7 10.4V10.6"
          stroke="var(--color-danger)"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </svg>
      <span>{{ error }}</span>
    </template>

    <!-- Loading: spinner dots -->
    <template v-else-if="isLoading">
      <span
        v-for="(delay, i) in ['0s', '0.18s', '0.36s']"
        :key="i"
        :style="{
          display: 'inline-block',
          width: '4px',
          height: '4px',
          background: 'var(--color-faint)',
          borderRadius: '50%',
          animation: 'prc-dot 0.9s ease-in-out infinite',
          animationDelay: delay,
        }"
      />
      <span>Lädt…</span>
    </template>

    <!-- Idle: speaker icon -->
    <template v-else-if="!isPlaying">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2 5H4.5L8 2V12L4.5 9H2V5Z" fill="var(--color-sub)" />
        <path
          d="M10 4.5C10.9 5.4 10.9 8.6 10 9.5M11.5 3C13.2 4.7 13.2 9.3 11.5 11"
          stroke="var(--color-sub)"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </svg>
      <span>Vorlesen</span>
    </template>

    <!-- Playing: stop square + label + equalizer -->
    <template v-else>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" fill="var(--color-accent)" />
      </svg>
      <span>Wird vorgelesen</span>
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
