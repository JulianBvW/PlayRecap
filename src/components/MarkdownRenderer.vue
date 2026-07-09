<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ content: string }>()

type InlinePart = { bold: boolean; italic: boolean; text: string }
type Segment =
  | { type: 'hr' }
  | { type: 'heading'; level: 3 | 4; parts: InlinePart[] }
  | { type: 'bullet'; indent: number; parts: InlinePart[] }
  | { type: 'paragraph'; parts: InlinePart[] }
  | { type: 'table'; headers: InlinePart[][]; rows: InlinePart[][] }

function splitInline(line: string): InlinePart[] {
  const parts: InlinePart[] = []
  const cleaned = line.replace(/<br\s*\/?>/gi, ' ')
  // **bold** must come before *italic* in the alternation to avoid partial matches
  const re = /\*\*(.+?)\*\*|\*([^*\n]+?)\*/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > last) parts.push({ bold: false, italic: false, text: cleaned.slice(last, match.index) })
    if (match[1] !== undefined) {
      parts.push({ bold: true, italic: false, text: match[1] })
    } else {
      parts.push({ bold: false, italic: true, text: match[2]! })
    }
    last = match.index + match[0].length
  }
  if (last < cleaned.length) parts.push({ bold: false, italic: false, text: cleaned.slice(last) })
  return parts
}

function parseTableRow(line: string): InlinePart[][] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => splitInline(cell.trim()))
}

function isSeparatorRow(line: string): boolean {
  return line
    .split('|')
    .slice(1, -1)
    .every((cell) => /^\s*:?-+:?\s*$/.test(cell))
}

const segments = computed<Segment[]>(() => {
  const lines = props.content.split('\n').filter((l) => l.trim())
  const result: Segment[] = []
  let tableLines: string[] = []

  function flushTable() {
    if (tableLines.length < 2) {
      tableLines.forEach((l) => result.push({ type: 'paragraph', parts: splitInline(l) }))
      tableLines = []
      return
    }
    const sepIdx = tableLines.findIndex((l) => isSeparatorRow(l))
    const headers = sepIdx > 0 ? parseTableRow(tableLines[0]!) : []
    const dataRows = tableLines
      .filter((_, i) => i !== sepIdx && (headers.length === 0 || i !== 0))
      .map(parseTableRow)
    result.push({ type: 'table', headers, rows: dataRows })
    tableLines = []
  }

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      tableLines.push(line)
    } else {
      if (tableLines.length > 0) flushTable()
      if (/^[-*_]{3,}$/.test(line.trim())) {
        result.push({ type: 'hr' })
      } else if (line.startsWith('#### ')) {
        result.push({ type: 'heading', level: 4, parts: splitInline(line.slice(5)) })
      } else if (line.startsWith('### ')) {
        result.push({ type: 'heading', level: 3, parts: splitInline(line.slice(4)) })
      } else {
        const bulletMatch = line.match(/^(\s*)- (.*)$/)
        if (bulletMatch) {
          const indent = Math.min(Math.floor(bulletMatch[1]!.length / 2), 2)
          result.push({ type: 'bullet', indent, parts: splitInline(bulletMatch[2] ?? '') })
        } else {
          result.push({ type: 'paragraph', parts: splitInline(line) })
        }
      }
    }
  }
  if (tableLines.length > 0) flushTable()
  return result
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
          <em v-else-if="part.italic">{{ part.text }}</em>
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
            <em v-else-if="part.italic">{{ part.text }}</em>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
      </div>

      <!-- Table -->
      <div
        v-else-if="seg.type === 'table'"
        style="overflow-x: auto; margin: 10px 0;"
      >
        <table style="border-collapse: collapse; font-size: 14px; width: 100%; min-width: max-content;">
          <thead v-if="seg.headers.length > 0">
            <tr>
              <th
                v-for="(cell, ci) in seg.headers"
                :key="ci"
                style="
                  padding: 6px 12px;
                  text-align: left;
                  font-weight: 600;
                  color: var(--color-ink);
                  border-bottom: 2px solid var(--color-line);
                  white-space: nowrap;
                "
              >
                <template v-for="(part, j) in cell" :key="j">
                  <strong v-if="part.bold">{{ part.text }}</strong>
                  <em v-else-if="part.italic">{{ part.text }}</em>
                  <template v-else>{{ part.text }}</template>
                </template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, ri) in seg.rows"
              :key="ri"
              :style="ri % 2 === 1 ? 'background: var(--color-panel)' : ''"
            >
              <td
                v-for="(cell, ci) in row"
                :key="ci"
                style="
                  padding: 6px 12px;
                  color: var(--color-ink);
                  border-bottom: 1px solid var(--color-line);
                  vertical-align: top;
                "
              >
                <template v-for="(part, j) in cell" :key="j">
                  <strong v-if="part.bold">{{ part.text }}</strong>
                  <em v-else-if="part.italic">{{ part.text }}</em>
                  <template v-else>{{ part.text }}</template>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        v-else
        style="font-size: 16px; line-height: 1.62; color: var(--color-ink); margin: 6px 0;"
      >
        <template v-for="(part, j) in seg.parts" :key="j">
          <strong v-if="part.bold">{{ part.text }}</strong>
          <em v-else-if="part.italic">{{ part.text }}</em>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </template>
  </div>
</template>
