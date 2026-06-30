<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    cover: string | null
    title: string
    size?: 46 | 56
  }>(),
  { size: 46 },
)

const radius = props.size === 46 ? '9px' : '10px'
const fontSize = props.size * 0.48 + 'px'
const letter = props.title.charAt(0)
</script>

<template>
  <img
    v-if="cover !== null"
    :src="cover"
    :alt="title"
    :style="{
      width: size + 'px',
      height: size + 'px',
      borderRadius: radius,
      objectFit: 'cover',
      boxShadow: '0 1px 2px rgba(43,38,32,0.06)',
      flexShrink: '0',
    }"
  />
  <div
    v-else
    :style="{
      width: size + 'px',
      height: size + 'px',
      borderRadius: radius,
      background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-ink))',
      boxShadow: '0 1px 2px rgba(43,38,32,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    }"
  >
    <span
      :style="{
        color: 'var(--color-surface)',
        fontFamily: 'var(--font-serif)',
        fontWeight: '600',
        fontSize: fontSize,
        lineHeight: '1',
        userSelect: 'none',
      }"
    >{{ letter }}</span>
  </div>
</template>
