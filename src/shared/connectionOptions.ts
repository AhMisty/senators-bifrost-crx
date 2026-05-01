export type ConnectionOptions = {
  gameAddress: string
  isGameAddressProxyAddress: boolean
  originAddress: string
}

export const connectionOptionsStorageAreaName = 'local'
export const connectionOptionsStorageKey = 'connectionOptions'

export const defaultConnectionOptions: ConnectionOptions = {
  gameAddress: '',
  isGameAddressProxyAddress: false,
  originAddress: '',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getStorageArea = (): chrome.storage.StorageArea | null => {
  if (typeof chrome === 'undefined') {
    return null
  }

  return chrome.storage?.[connectionOptionsStorageAreaName] ?? null
}

const getLegacyStorageKey = (): string | null => {
  if (typeof chrome === 'undefined') {
    return null
  }

  const extensionName = chrome.runtime?.getManifest?.().name

  if (!extensionName) {
    return null
  }

  return `${extensionName.charAt(0).toLowerCase()}${extensionName.slice(1)}Options`
}

export const normalizeConnectionOptions = (value: unknown): ConnectionOptions => {
  if (!isRecord(value)) {
    return defaultConnectionOptions
  }

  return {
    gameAddress:
      typeof value.gameAddress === 'string'
        ? value.gameAddress
        : defaultConnectionOptions.gameAddress,
    isGameAddressProxyAddress:
      typeof value.isGameAddressProxyAddress === 'boolean'
        ? value.isGameAddressProxyAddress
        : typeof value.isGameAddressAccelerationAddress === 'boolean'
          ? value.isGameAddressAccelerationAddress
          : typeof value.isAccelerationEnabled === 'boolean'
            ? value.isAccelerationEnabled
            : defaultConnectionOptions.isGameAddressProxyAddress,
    originAddress:
      typeof value.originAddress === 'string'
        ? value.originAddress
        : typeof value.sourceAddress === 'string'
          ? value.sourceAddress
          : typeof value.accelerationAddress === 'string'
            ? value.accelerationAddress
            : defaultConnectionOptions.originAddress,
  }
}

export const sanitizeConnectionOptions = (options: ConnectionOptions): ConnectionOptions => ({
  gameAddress: options.gameAddress.trim(),
  isGameAddressProxyAddress: options.isGameAddressProxyAddress,
  originAddress: options.originAddress.trim(),
})

export const loadConnectionOptions = async (): Promise<ConnectionOptions> => {
  const storageArea = getStorageArea()

  if (!storageArea) {
    return defaultConnectionOptions
  }

  const legacyStorageKey = getLegacyStorageKey()
  const storageKeys = legacyStorageKey
    ? [connectionOptionsStorageKey, legacyStorageKey]
    : [connectionOptionsStorageKey]
  const result = await storageArea.get(storageKeys)
  const legacyOptions = legacyStorageKey ? result[legacyStorageKey] : undefined
  const storedOptions = result[connectionOptionsStorageKey] ?? legacyOptions
  const options = normalizeConnectionOptions(storedOptions)

  if (result[connectionOptionsStorageKey] === undefined && legacyOptions !== undefined) {
    await storageArea.set({ [connectionOptionsStorageKey]: sanitizeConnectionOptions(options) })
  }

  return options
}

export const saveConnectionOptions = async (options: ConnectionOptions): Promise<void> => {
  const storageArea = getStorageArea()

  if (!storageArea) {
    return
  }

  await storageArea.set({ [connectionOptionsStorageKey]: sanitizeConnectionOptions(options) })
}
