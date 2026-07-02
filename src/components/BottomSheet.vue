<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

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
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue || isClosing">
      <div
        :class="['prc-backdrop', { 'prc-backdrop--out': isClosing }]"
        style="position: fixed; inset: 0; background: rgba(20,18,15,0.34); z-index: 20;"
        @click="emit('update:modelValue', false)"
      />
      <div
        :class="['prc-sheet', { 'prc-sheet--out': isClosing }]"
        style="
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-surface);
          border-radius: 22px 22px 0 0;
          box-shadow: 0 -10px 44px rgba(0,0,0,0.22);
          z-index: 21;
        "
      >
        <div style="display: flex; justify-content: center; padding: 12px 0 4px;">
          <div
            style="width: 38px; height: 4px; border-radius: 2px; background: var(--color-line-strong);"
          />
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
