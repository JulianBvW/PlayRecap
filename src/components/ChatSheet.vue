<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useBooksStore } from '@/stores/books'
import ChatEmpty from '@/components/ChatEmpty.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'

const props = defineProps<{
  modelValue: boolean
  bookId: string
  chapterIndex: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const chatStore = useChatStore()
const booksStore = useBooksStore()
const { activeBook } = storeToRefs(booksStore)

const isClosing = ref(false)

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      isClosing.value = true
      setTimeout(() => {
        isClosing.value = false
      }, 300)
    }
  },
)

const thread = computed(() => chatStore.getThread(props.bookId, props.chapterIndex))

function onSend(text: string, speechMode: boolean) {
  chatStore.sendMessage(props.bookId, props.chapterIndex, text, speechMode)
}
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
          top: 5vh;
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
        <!-- Header -->
        <div
          style="
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 20px 12px;
            flex-shrink: 0;
            position: relative;
            border-bottom: 1px solid var(--color-line);
          "
        >
          <span style="font-size: 12.5px; color: var(--color-faint);">{{ activeBook?.title }}</span>
          <span
            style="
              font-size: 22px;
              font-weight: 600;
              color: var(--color-ink);
              font-family: var(--font-serif);
            "
          >Kapitel {{ chapterIndex + 1 }}</span>

          <button
            aria-label="Chat schließen"
            style="
              position: absolute;
              right: 16px;
              top: 50%;
              transform: translateY(-50%);
              width: 36px;
              height: 36px;
              background: transparent;
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
                stroke="var(--color-faint)"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div style="flex: 1; overflow-y: auto; padding: 12px 0;">
          <ChatEmpty
            v-if="!thread.length"
            :chapter-count="activeBook?.chapters.length ?? 0"
            @send="(text) => onSend(text, false)"
          />
          <ChatMessage
            v-for="(msg, i) in thread"
            :key="i"
            :message="msg"
          />
        </div>

        <!-- Input -->
        <ChatInput
          :chapter-count="activeBook?.chapters.length ?? 0"
          @send="onSend"
        />
      </div>
    </div>
  </Teleport>
</template>
