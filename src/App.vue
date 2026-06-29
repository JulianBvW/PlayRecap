<script setup lang="ts"></script>

<template>
  <!-- Full-bleed background: fixed + opaque so it covers all safe areas (notch, home indicator).
       Must be position:fixed — position:absolute stops short if any ancestor has collapsed height. -->
  <div class="app-bg" />

  <!-- All scrolling lives inside this container; body must never scroll.
       Prevents rubber-band overscroll from exposing the native UIScrollView background. -->
  <div class="app-scroll">
    <div class="app-content">
      <!-- views render here -->
    </div>
  </div>
</template>

<style scoped>
.app-bg {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg);
  z-index: 0;
}

.app-scroll {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  z-index: 1;
}

/* Interactive content respects safe areas — background extends to physical edges, content does not */
.app-content {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
</style>
