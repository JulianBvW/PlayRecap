<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ content: string }>()

type InlinePart = { bold: boolean; text: string }
type Segment =
  | { type: 'heading'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'paragraph'; parts: InlinePart[] }

function splitBold(line: string): InlinePart[] {
  const parts: InlinePart[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) parts.push({ bold: false, text: line.slice(last, match.index) })
    parts.push({ bold: true, text: match[1]! })
    last = match.index + match[0].length
  }
  if (last < line.length) parts.push({ bold: false, text: line.slice(last) })
  return parts
}

const segments = computed<Segment[]>(() => {
  return props.content.split('\n').reduce<Segment[]>((acc, line) => {
    if (!line.trim()) return acc
    if (line.startsWith('### ')) {
      acc.push({ type: 'heading', text: line.slice(4) })
    } else if (line.startsWith('- ')) {
      acc.push({ type: 'bullet', text: line.slice(2) })
    } else {
      acc.push({ type: 'paragraph', parts: splitBold(line) })
    }
    return acc
  }, [])
})
</script>

<template>
  <div>
    <template v-for="(seg, i) in segments" :key="i">
      <p
        v-if="seg.type === 'heading'"
        style="font-size: 14px; font-weight: 700; color: var(--color-ink); margin: 12px 0 4px;"
      >{{ seg.text }}</p>

      <div
        v-else-if="seg.type === 'bullet'"
        style="display: flex; gap: 8px; align-items: flex-start; margin: 4px 0;"
      >
        <span style="color: var(--color-accent); flex-shrink: 0;">–</span>
        <span style="font-size: 16px; line-height: 1.62; color: var(--color-ink);">{{ seg.text }}</span>
      </div>

      <p
        v-else
        style="font-size: 16px; line-height: 1.62; color: var(--color-ink); margin: 6px 0;"
      >
        <template v-for="(part, j) in seg.parts" :key="j">
          <strong v-if="part.bold">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </template>
  </div>
</template>
