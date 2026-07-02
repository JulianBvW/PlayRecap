<template>
  <div style="display: flex; gap: 5px; align-items: center; height: 24px;">
    <div
      v-for="delay in ['0s', '0.15s', '0.3s']"
      :key="delay"
      :style="{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--color-accent)',
        animation: 'prc-dot 0.9s infinite',
        animationDelay: delay,
      }"
    />
  </div>
</template>
