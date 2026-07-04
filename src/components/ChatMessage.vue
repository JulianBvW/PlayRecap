<script setup lang="ts">
import type { Message } from '@/types/library'
import ThinkingDots from '@/components/ThinkingDots.vue'
import StreamingCaret from '@/components/StreamingCaret.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import ReadAloudButton from '@/components/ReadAloudButton.vue'

defineProps<{ message: Message; autoPlay?: boolean }>()
defineEmits<{ played: [] }>()
</script>

<template>
  <!-- User bubble -->
  <div
    v-if="message.role === 'user'"
    style="display: flex; justify-content: flex-end; padding: 4px 20px;"
  >
    <div
      style="
        background: var(--color-user-bubble);
        color: var(--color-user-ink);
        border-radius: 16px 16px 5px 16px;
        padding: 10px 14px;
        font-size: 15px;
        line-height: 1.45;
        max-width: 80%;
      "
    >{{ message.content }}</div>
  </div>

  <!-- Assistant message -->
  <div v-else style="padding: 4px 20px;">
    <ThinkingDots v-if="message.status === 'thinking'" />

    <template v-else-if="message.status === 'streaming'">
      <span style="font-size: 16px; line-height: 1.62; color: var(--color-ink);">{{ message.content }}</span>
      <StreamingCaret />
    </template>

    <template v-else-if="message.status === 'error'">
      <p style="font-size: 16px; line-height: 1.6; color: var(--color-danger); margin: 0;">{{ message.content }}</p>
    </template>

    <template v-else-if="message.status === 'done'">
      <MarkdownRenderer :content="message.content" />
      <div style="margin-top: 10px;">
        <ReadAloudButton :text="message.content" :auto-play="autoPlay" @played="$emit('played')" />
      </div>
    </template>
  </div>
</template>
