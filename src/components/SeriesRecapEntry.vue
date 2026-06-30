<script setup lang="ts">
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <div>
    <hr
      style="
        height: 1px;
        border: none;
        background: var(--color-line);
        margin: 0 28px 0 24px;
      "
    />

    <button
      style="
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 17px 34px 17px 24px;
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
      "
      @click="emit('open')"
    >
      <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
        <span
          style="
            font-size: 11px;
            font-weight: 700;
            color: var(--color-faint);
            text-transform: uppercase;
            letter-spacing: 0.16em;
          "
        >SERIE</span>
        <span
          style="
            font-size: 18px;
            font-weight: 600;
            font-style: italic;
            color: var(--color-ink);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          "
        >Bisher in der Serie</span>
      </div>

      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        style="flex-shrink: 0; margin-left: 8px;"
      >
        <path
          d="M6.75 4.5L11.25 9L6.75 13.5"
          stroke="var(--color-accent)"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
