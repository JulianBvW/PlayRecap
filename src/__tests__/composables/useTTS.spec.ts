import { describe, it, expect } from 'vitest'
import { getVoiceId } from '@/composables/useTTS'

describe('getVoiceId', () => {
  it('de → de_female', () => {
    expect(getVoiceId('de')).toBe('de_female')
  })

  it('en → neutral_female', () => {
    expect(getVoiceId('en')).toBe('neutral_female')
  })

  it('auto → de_female (German default)', () => {
    expect(getVoiceId('auto')).toBe('de_female')
  })
})
