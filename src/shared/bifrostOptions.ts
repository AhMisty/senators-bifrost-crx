export type BifrostOptions = {
  gameAddress: string
  isAccelerationEnabled: boolean
  accelerationAddress: string
}

const storageKey = 'bifrostOptions'

export const defaultBifrostOptions: BifrostOptions = {
  gameAddress: '',
  isAccelerationEnabled: false,
  accelerationAddress: '',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getStorageArea = (): chrome.storage.StorageArea | null => {
  if (typeof chrome === 'undefined') {
    return null
  }

  return chrome.storage?.local ?? null
}

export const normalizeBifrostOptions = (value: unknown): BifrostOptions => {
  if (!isRecord(value)) {
    return defaultBifrostOptions
  }

  return {
    gameAddress:
      typeof value.gameAddress === 'string' ? value.gameAddress : defaultBifrostOptions.gameAddress,
    isAccelerationEnabled:
      typeof value.isAccelerationEnabled === 'boolean'
        ? value.isAccelerationEnabled
        : defaultBifrostOptions.isAccelerationEnabled,
    accelerationAddress:
      typeof value.accelerationAddress === 'string'
        ? value.accelerationAddress
        : defaultBifrostOptions.accelerationAddress,
  }
}

export const sanitizeBifrostOptions = (options: BifrostOptions): BifrostOptions => ({
  gameAddress: options.gameAddress.trim(),
  isAccelerationEnabled: options.isAccelerationEnabled,
  accelerationAddress: options.accelerationAddress.trim(),
})

export const loadBifrostOptions = async (): Promise<BifrostOptions> => {
  const storageArea = getStorageArea()

  if (!storageArea) {
    return defaultBifrostOptions
  }

  const result = await storageArea.get(storageKey)

  return normalizeBifrostOptions(result[storageKey])
}

export const saveBifrostOptions = async (options: BifrostOptions): Promise<void> => {
  const storageArea = getStorageArea()

  if (!storageArea) {
    return
  }

  await storageArea.set({ [storageKey]: sanitizeBifrostOptions(options) })
}
