<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ content: string }>()

type InlinePart = { bold: boolean; text: string }
type Segment =
  | { type: 'hr' }
  | { type: 'heading'; level: 3 | 4; parts: InlinePart[] }
  | { type: 'bullet'; indent: number; parts: InlinePart[] }
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
    if (/^[-*_]{3,}$/.test(line.trim())) {
      acc.push({ type: 'hr' })
    } else if (line.startsWith('#### ')) {
      acc.push({ type: 'heading', level: 4, parts: splitBold(line.slice(5)) })
    } else if (line.startsWith('### ')) {
      acc.push({ type: 'heading', level: 3, parts: splitBold(line.slice(4)) })
    } else {
      const bulletMatch = line.match(/^(\s*)- (.*)$/)
      if (bulletMatch) {
        const indent = Math.min(Math.floor(bulletMatch[1]!.length / 2), 2)
        acc.push({ type: 'bullet', indent, parts: splitBold(bulletMatch[2] ?? '') })
      } else {
        acc.push({ type: 'paragraph', parts: splitBold(line) })
      }
    }
    return acc
  }, [])
})
</script>

<template>
  <div>
    <template v-for="(seg, i) in segments" :key="i">
      <hr
        v-if="seg.type === 'hr'"
        style="border: none; border-top: 1px solid var(--color-line); margin: 14px 0;"
      />

      <p
        v-else-if="seg.type === 'heading'"
        :style="seg.level === 3
          ? 'font-size: 17px; font-weight: 600; color: var(--color-ink); margin: 14px 0 4px;'
          : 'font-size: 14.5px; font-weight: 600; color: var(--color-sub); margin: 10px 0 3px;'"
      >
        <template v-for="(part, j) in seg.parts" :key="j">
          <strong v-if="part.bold">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>

      <div
        v-else-if="seg.type === 'bullet'"
        :style="`display: flex; gap: 8px; align-items: flex-start; margin: 4px 0; padding-left: ${seg.indent * 16}px;`"
      >
        <span style="color: var(--color-accent); flex-shrink: 0;">–</span>
        <span style="font-size: 16px; line-height: 1.62; color: var(--color-ink);">
          <template v-for="(part, j) in seg.parts" :key="j">
            <strong v-if="part.bold">{{ part.text }}</strong>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
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
