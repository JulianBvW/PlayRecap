<script setup lang="ts">
defineProps<{ chapterCount: number }>()
const emit = defineEmits<{ send: [text: string] }>()

const chips = [
  'Fasse die wichtigsten Ereignisse zusammen',
  'Wer sind die Hauptfiguren?',
  'Was war der wichtigste Wendepunkt?',
]
const chipsAlways = chips
const chipConditional = 'Letzte 3 Kapitel zusammenfassen'
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px 24px;
      gap: 16px;
    "
  >
    <p
      style="
        font-size: 18px;
        font-weight: 500;
        color: var(--color-sub);
        font-family: var(--font-serif);
        margin: 0;
        text-align: center;
      "
    >Was möchtest du wissen?</p>

    <div
      style="
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      "
    >
      <button
        v-for="chip in chipsAlways"
        :key="chip"
        style="
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-sub);
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 14px;
          font-family: var(--font-serif);
          cursor: pointer;
        "
        @click="emit('send', chip)"
      >{{ chip }}</button>

      <button
        v-if="chapterCount >= 3"
        style="
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-sub);
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 14px;
          font-family: var(--font-serif);
          cursor: pointer;
        "
        @click="emit('send', chipConditional)"
      >{{ chipConditional }}</button>
    </div>
  </div>
</template>
