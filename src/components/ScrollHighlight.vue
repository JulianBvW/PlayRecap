<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  top: number
  height: number
  animate: boolean
}>()

const style = computed(() => ({
  position: 'absolute' as const,
  left: '8px',
  right: '6px',
  borderRadius: '14px',
  background: 'transparent',
  zIndex: '0',
  pointerEvents: 'none' as const,
  top: props.top + 'px',
  height: props.height + 'px',
  transition: props.animate
    ? 'top cubic-bezier(.4,0,.2,1) .34s, height cubic-bezier(.4,0,.2,1) .34s'
    : 'none',
}))
</script>

<template>
  <div :style="style" />
</template>
