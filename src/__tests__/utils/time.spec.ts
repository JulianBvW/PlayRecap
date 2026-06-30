import { describe, it, expect } from 'vitest'
import { formatStartTime } from '@/utils/time'

describe('formatStartTime', () => {
  it('formats 0 as 00:00', () => {
    expect(formatStartTime(0)).toBe('00:00')
  })

  it('pads single-digit seconds', () => {
    expect(formatStartTime(5)).toBe('00:05')
  })

  it('formats 65 as 01:05', () => {
    expect(formatStartTime(65)).toBe('01:05')
  })

  it('formats exactly 5 minutes as 05:00', () => {
    expect(formatStartTime(300)).toBe('05:00')
  })

  it('formats 59:59 correctly', () => {
    expect(formatStartTime(3599)).toBe('59:59')
  })

  it('rolls to H:MM:SS at exactly one hour', () => {
    expect(formatStartTime(3600)).toBe('1:00:00')
  })

  it('formats 3661 as 1:01:01', () => {
    expect(formatStartTime(3661)).toBe('1:01:01')
  })

  it('handles multi-hour values', () => {
    expect(formatStartTime(7200)).toBe('2:00:00')
    expect(formatStartTime(7384)).toBe('2:03:04')
  })

  it('floors fractional seconds', () => {
    expect(formatStartTime(65.9)).toBe('01:05')
    expect(formatStartTime(3600.5)).toBe('1:00:00')
  })
})
