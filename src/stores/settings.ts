import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'
import { DEFAULT_MODEL } from '@/llm/mistral'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')

  // Raw field content. May be empty — that is how the user says "use the default".
  const modelInput = ref('')

  // The name every API call uses. Normalising on read rather than on write is what
  // keeps the field clearable: emptying it leaves it empty and shows the default as a
  // placeholder, instead of snapping back to the default as if it had been typed.
  // Nothing outside this store may read modelInput for a request.
  const model = computed(() => modelInput.value.trim() || DEFAULT_MODEL)

  async function init() {
    const [storedKey, storedModel] = await db.settings.bulkGet(['apiKey', 'model'])
    apiKey.value = storedKey?.value ?? ''
    modelInput.value = storedModel?.value ?? ''
  }

  async function setApiKey(value: string) {
    apiKey.value = value
    await db.settings.put({ key: 'apiKey', value })
  }

  async function setModel(value: string) {
    modelInput.value = value
    await db.settings.put({ key: 'model', value })
  }

  return { apiKey, model, modelInput, init, setApiKey, setModel }
})
