import { describe, it, expect } from 'vitest'
import { getVoiceId } from '@/composables/useTTS'

describe('getVoiceId', () => {
  it('en → gb_oliver_neutral', () => {
    expect(getVoiceId('en')).toBe('gb_oliver_neutral')
  })

  it('de → gb_oliver_neutral (English fallback, no German preset on Mistral cloud API)', () => {
    expect(getVoiceId('de')).toBe('gb_oliver_neutral')
  })

  it('auto → gb_oliver_neutral (English fallback)', () => {
    expect(getVoiceId('auto')).toBe('gb_oliver_neutral')
  })
})
