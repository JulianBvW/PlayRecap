import { describe, it, expect } from 'vitest'
import { getVoiceId } from '@/composables/useTTS'

describe('getVoiceId', () => {
  it('en → gb_oliver_neutral', () => {
    expect(getVoiceId('en')).toBe('gb_oliver_neutral')
  })

  it('de → null (not supported by Mistral TTS)', () => {
    expect(getVoiceId('de')).toBeNull()
  })

  it('auto → null (German default, not supported)', () => {
    expect(getVoiceId('auto')).toBeNull()
  })
})
