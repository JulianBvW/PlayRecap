import { describe, it, expect } from 'vitest'
import { getVoiceId } from '@/composables/useTTS'

describe('getVoiceId', () => {
  it('de → de_female', () => {
    expect(getVoiceId('de')).toBe('de_female')
  })

  it('en → gb_jane_neutral', () => {
    expect(getVoiceId('en')).toBe('gb_jane_neutral')
  })

  it('auto → de_female (German default)', () => {
    expect(getVoiceId('auto')).toBe('de_female')
  })
})
