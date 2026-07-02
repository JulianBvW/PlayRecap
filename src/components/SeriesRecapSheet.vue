<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBooksStore } from '@/stores/books'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { activeBook } = storeToRefs(useBooksStore())
const isClosing = ref(false)

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      isClosing.value = true
      setTimeout(() => { isClosing.value = false }, 300)
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue || isClosing">
      <!-- Backdrop -->
      <div
        :class="['prc-backdrop', { 'prc-backdrop--out': isClosing }]"
        style="position: fixed; inset: 0; background: rgba(20,18,15,0.34); z-index: 22;"
        @click="emit('update:modelValue', false)"
      />

      <!-- Sheet -->
      <div
        :class="['prc-chat', { 'prc-chat--out': isClosing }]"
        style="
          position: fixed;
          top: 15vh;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-surface);
          border-radius: 22px 22px 0 0;
          box-shadow: 0 -10px 44px rgba(0,0,0,0.22);
          z-index: 23;
          display: flex;
          flex-direction: column;
        "
      >
        <!-- Grab handle -->
        <div style="display: flex; justify-content: center; padding: 12px 0 4px;">
          <div style="width: 38px; height: 4px; border-radius: 2px; background: var(--color-line-strong);" />
        </div>

        <!-- Header -->
        <div
          style="
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 4px 20px 12px;
            flex-shrink: 0;
            position: relative;
            border-bottom: 1px solid var(--color-line);
          "
        >
          <span
            style="
              font-size: 11px;
              font-weight: 700;
              color: var(--color-accent);
              text-transform: uppercase;
              letter-spacing: 0.16em;
            "
          >BISHER IN DER SERIE</span>
          <span
            style="
              font-size: 22px;
              font-weight: 600;
              color: var(--color-ink);
              font-family: var(--font-serif);
            "
          >{{ activeBook?.title }}</span>
          <span style="font-size: 13px; color: var(--color-sub);">
            Was in den vorherigen Büchern geschah
          </span>

          <button
            aria-label="Schließen"
            style="
              position: absolute;
              right: 16px;
              top: 50%;
              transform: translateY(-50%);
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: var(--color-panel);
              border: none;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
            "
            @click="emit('update:modelValue', false)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M4 4L14 14M14 4L4 14"
                stroke="var(--color-sub)"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <!-- Bullets -->
        <div style="flex: 1; overflow-y: auto; padding: 20px 20px 0;">
          <div
            v-for="(bullet, i) in activeBook?.seriesRecap"
            :key="i"
            style="
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin-bottom: 13px;
            "
          >
            <span
              style="
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--color-accent);
                flex-shrink: 0;
                margin-top: 7px;
              "
            />
            <span style="font-size: 16px; line-height: 1.55; color: var(--color-ink);">{{ bullet }}</span>
          </div>
          <div style="height: 32px;" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
