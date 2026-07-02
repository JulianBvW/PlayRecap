<script setup lang="ts">
defineProps<{ chapterCount: number }>()
const emit = defineEmits<{ send: [text: string] }>()

const chips = [
  'Bis hier zusammenfassen',
  'Figuren auflisten',
  'Wichtigste Wendungen',
]
const chipConditional = 'Letzte 3 Kapitel'
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
        font-size: 20px;
        font-weight: 600;
        color: var(--color-ink);
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
        v-for="chip in chips"
        :key="chip"
        style="
          border: 1px solid var(--color-line);
          background: var(--color-surface);
          color: var(--color-ink);
          border-radius: 999px;
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
          color: var(--color-ink);
          border-radius: 999px;
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
