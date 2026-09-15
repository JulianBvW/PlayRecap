import { beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '@/db'
import { useSettingsStore } from '@/stores/settings'
import { DEFAULT_MODEL } from '@/llm/mistral'

describe('useSettingsStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.delete()
    await db.open()
  })

  describe('apiKey', () => {
    it('starts empty and survives a round trip through the database', async () => {
      const store = useSettingsStore()
      await store.init()
      expect(store.apiKey).toBe('')

      await store.setApiKey('sk-test')
      const reloaded = useSettingsStore()
      await reloaded.init()
      expect(reloaded.apiKey).toBe('sk-test')
    })
  })

  describe('model', () => {
    it('falls back to the default when nothing is stored', async () => {
      const store = useSettingsStore()
      await store.init()
      expect(store.modelInput).toBe('')
      expect(store.model).toBe(DEFAULT_MODEL)
    })

    it('uses a stored model and keeps it after a reload', async () => {
      const store = useSettingsStore()
      await store.setModel('mistral-large-latest')
      expect(store.model).toBe('mistral-large-latest')

      const reloaded = useSettingsStore()
      await reloaded.init()
      expect(reloaded.model).toBe('mistral-large-latest')
    })

    // The case a `?? DEFAULT_MODEL` in init() would let through: the row exists, so
    // it is not nullish, but its value is unusable as a model name.
    it('falls back to the default for an empty string stored by an earlier build', async () => {
      await db.settings.put({ key: 'model', value: '' })
      const store = useSettingsStore()
      await store.init()
      expect(store.model).toBe(DEFAULT_MODEL)
    })

    it('treats a whitespace-only entry as empty', async () => {
      const store = useSettingsStore()
      await store.setModel('   ')
      expect(store.model).toBe(DEFAULT_MODEL)
    })

    // Model ids get pasted, and a pasted id tends to bring a newline with it.
    it('trims surrounding whitespace off a pasted model id', async () => {
      const store = useSettingsStore()
      await store.setModel('  ministral-8b-latest\n')
      expect(store.model).toBe('ministral-8b-latest')
    })

    // Clearing the field has to leave it cleared, otherwise the placeholder showing
    // the default can never be seen again.
    it('keeps an emptied field empty instead of writing the default into it', async () => {
      const store = useSettingsStore()
      await store.setModel('ministral-3b-latest')
      await store.setModel('')

      expect(store.modelInput).toBe('')
      expect(store.model).toBe(DEFAULT_MODEL)

      const reloaded = useSettingsStore()
      await reloaded.init()
      expect(reloaded.modelInput).toBe('')
      expect(reloaded.model).toBe(DEFAULT_MODEL)
    })
  })
})
