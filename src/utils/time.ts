/**
 * Formats a chapter start offset (seconds) as MM:SS, or H:MM:SS once past one hour.
 * Always renders from the provided value — never recomputed from chapter index.
 */
export function formatStartTime(totalSeconds: number): string {
  const s = Math.floor(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
