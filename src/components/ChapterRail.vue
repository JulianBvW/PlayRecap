<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildRailSubset } from '@/utils/rail'

const props = defineProps<{
  totalChapters: number
  currentChapterIndex: number
  rowRefs: (HTMLElement | null)[]
  scrollContainer: HTMLElement | null
}>()

const ticks = computed(() => buildRailSubset(props.totalChapters))

const nearestTick = computed(() => {
  const target = props.currentChapterIndex + 1
  const t = ticks.value
  if (t.length === 0) return -1
  return t.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev,
  )
})

const railRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragChapterNumber = ref(0)
const dragOffsetY = ref(0)

function scrollToChapterIndex(chapterIndex: number) {
  const row = props.rowRefs[chapterIndex]
  const container = props.scrollContainer
  if (!row || !container) return
  container.scrollTop = row.offsetTop + row.offsetHeight - container.clientHeight
}

function getTickIndexAtY(clientY: number): number {
  const rail = railRef.value
  if (!rail) return 0
  const rect = rail.getBoundingClientRect()
  const pad = 8
  const relY = clientY - rect.top - pad
  const availH = rect.height - 2 * pad
  const n = ticks.value.length
  if (n <= 1) return 0
  const fraction = Math.max(0, Math.min(1, relY / availH))
  return Math.round(fraction * (n - 1))
}

function onPointerDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  isDragging.value = true
  const rail = railRef.value
  if (rail) {
    dragOffsetY.value = e.clientY - rail.getBoundingClientRect().top
  }
  const tickIdx = getTickIndexAtY(e.clientY)
  const chapterNumber = ticks.value[tickIdx]
  if (chapterNumber === undefined) return
  dragChapterNumber.value = chapterNumber
  scrollToChapterIndex(chapterNumber - 1)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  const rail = railRef.value
  if (rail) {
    dragOffsetY.value = e.clientY - rail.getBoundingClientRect().top
  }
  const tickIdx = getTickIndexAtY(e.clientY)
  const chapterNumber = ticks.value[tickIdx]
  if (chapterNumber === undefined) return
  dragChapterNumber.value = chapterNumber
  scrollToChapterIndex(chapterNumber - 1)
}

function onPointerUp() {
  isDragging.value = false
}

const bubbleTop = computed(() => Math.max(0, dragOffsetY.value - 31) + 'px')
</script>

<template>
  <div
    ref="railRef"
    style="
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 22px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      z-index: 2;
      touch-action: none;
      user-select: none;
      cursor: pointer;
    "
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span
      v-for="tick in ticks"
      :key="tick"
      :style="{
        fontSize: '10px',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: '1',
        display: 'block',
        color: tick === nearestTick ? 'var(--color-accent)' : 'var(--color-faint)',
        fontWeight: tick === nearestTick ? '700' : '400',
        transform: tick === nearestTick ? 'scale(1.18)' : 'scale(1)',
        transition: 'all .15s ease',
      }"
    >{{ tick }}</span>

    <div
      v-if="isDragging"
      :style="{
        position: 'absolute',
        right: '22px',
        top: bubbleTop,
        width: '62px',
        height: '62px',
        background: 'var(--color-accent)',
        color: 'var(--color-surface)',
        fontSize: '26px',
        fontWeight: '600',
        fontFamily: 'Georgia, serif',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        lineHeight: '1',
        boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
      }"
    >{{ dragChapterNumber }}</div>
  </div>
</template>
