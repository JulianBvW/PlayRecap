<script setup lang="ts">
import type { Chapter } from '@/types/library'
import { formatStartTime } from '@/utils/time'

defineProps<{ chapter: Chapter }>()
const emit = defineEmits<{ 'open-chat': [chapterIndex: number] }>()
</script>

<template>
  <div style="position: relative; z-index: 1;">
    <hr
      style="
        height: 1px;
        border: none;
        background: var(--color-line);
        margin: 0 28px 0 24px;
      "
    />

    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 18px 34px 0 24px;
      "
    >
      <div>
        <span
          style="
            font-size: 11px;
            font-weight: 700;
            color: var(--color-accent);
            text-transform: uppercase;
            letter-spacing: 0.16em;
          "
        >KAPITEL {{ chapter.index + 1 }}</span>
        <span
          style="
            font-size: 11px;
            font-weight: 700;
            color: var(--color-faint);
            letter-spacing: 0.16em;
          "
        > · {{ formatStartTime(chapter.start) }}</span>
      </div>

      <button
        aria-label="Chat zu diesem Kapitel öffnen"
        style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(43,38,32,0.06);
          padding: 0;
        "
        @click="emit('open-chat', chapter.index)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M13 1H3C2.45 1 2 1.45 2 2v8c0 .55.45 1 1 1h2v2.5l3-2.5h5c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z"
            fill="var(--color-accent)"
          />
        </svg>
      </button>
    </div>

    <div
      style="
        padding: 6px 34px 0 24px;
        font-size: 19px;
        font-weight: 600;
        color: var(--color-ink);
        line-height: 1.3;
      "
    >
      {{ chapter.title }}
    </div>

    <div style="padding: 7px 34px 19px 24px; display: flex; flex-direction: column; gap: 7px;">
      <div
        v-for="(bullet, i) in chapter.summary"
        :key="bullet + i"
        style="display: flex; gap: 8px; align-items: flex-start;"
      >
        <span
          style="
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--color-accent);
            opacity: 0.85;
            flex-shrink: 0;
            margin-top: 8px;
          "
        />
        <span
          style="
            font-size: 14.5px;
            font-weight: 400;
            color: var(--color-sub);
            line-height: 1.5;
          "
        >{{ bullet }}</span>
      </div>
    </div>
  </div>
</template>
