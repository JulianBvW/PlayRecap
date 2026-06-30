import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')

  async function init() {
    const record = await db.settings.get('apiKey')
    apiKey.value = record?.value ?? ''
  }

  async function setApiKey(value: string) {
    apiKey.value = value
    await db.settings.put({ key: 'apiKey', value })
  }

  return { apiKey, init, setApiKey }
})
