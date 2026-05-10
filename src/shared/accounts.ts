export type AccountValidity = 'unknown' | 'valid' | 'invalid'

export type AccountRecord = {
  id: string
  universe: number
  username: string
  password: string
  ip: string
  token: string
  validity: AccountValidity
  createdAt: number
  updatedAt: number
}

export type AccountState = {
  accounts: AccountRecord[]
  activeAccountId: string | null
}

export type AccountFormDraft = {
  universe: string
  username: string
  password: string
  ip: string
  token: string
}

export type CreateAccountInput = {
  universe: number
  username: string
  password: string
  ip: string
  token: string
}

export type UpdateAccountInput = CreateAccountInput

export const accountStorageAreaName = 'local'
export const accountStorageKey = 'accounts'

export const defaultAccountState: AccountState = {
  accounts: [],
  activeAccountId: null,
}

const ipv4Pattern =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getStorageArea = (): chrome.storage.StorageArea | null => {
  if (typeof chrome === 'undefined') {
    return null
  }

  return chrome.storage?.[accountStorageAreaName] ?? null
}

const normalizeTimestamp = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value : '')

const normalizeUniverse = (value: unknown): number => {
  const universe = Number(value)

  return Number.isInteger(universe) && universe > 0 ? universe : 1
}

const normalizeValidity = (value: unknown): AccountValidity =>
  value === 'valid' || value === 'invalid' ? value : 'unknown'

const normalizeAccount = (value: unknown): AccountRecord | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeString(value.id)
  const username = normalizeString(value.username)
  const password = normalizeString(value.password)
  const ip = normalizeString(value.ip)
  const now = Date.now()

  if (!id || !username || !password || !isValidIPv4(ip)) {
    return null
  }

  return {
    id,
    universe: normalizeUniverse(value.universe),
    username,
    password,
    ip,
    token: normalizeString(value.token),
    validity: normalizeValidity(value.validity),
    createdAt: normalizeTimestamp(value.createdAt, now),
    updatedAt: normalizeTimestamp(value.updatedAt, now),
  }
}

export const isValidIPv4 = (value: string): boolean => ipv4Pattern.test(value.trim())

export const sanitizeCreateAccountInput = (input: CreateAccountInput): CreateAccountInput => ({
  universe: normalizeUniverse(input.universe),
  username: input.username.trim(),
  password: input.password,
  ip: input.ip.trim(),
  token: input.token.trim(),
})

export const sanitizeUpdateAccountInput = (input: UpdateAccountInput): UpdateAccountInput => ({
  ...sanitizeCreateAccountInput(input),
})

export const normalizeAccountState = (value: unknown): AccountState => {
  if (!isRecord(value)) {
    return defaultAccountState
  }

  const accounts = Array.isArray(value.accounts)
    ? value.accounts.flatMap((account) => {
        const normalizedAccount = normalizeAccount(account)

        return normalizedAccount ? [normalizedAccount] : []
      })
    : []
  const activeAccountId =
    typeof value.activeAccountId === 'string' &&
    accounts.some((account) => account.id === value.activeAccountId)
      ? value.activeAccountId
      : null

  return { accounts, activeAccountId }
}

export const loadAccountState = async (): Promise<AccountState> => {
  const storageArea = getStorageArea()

  if (!storageArea) {
    return defaultAccountState
  }

  const result = await storageArea.get(accountStorageKey)

  return normalizeAccountState(result[accountStorageKey])
}

export const saveAccountState = async (state: AccountState): Promise<void> => {
  const storageArea = getStorageArea()

  if (!storageArea) {
    return
  }

  await storageArea.set({ [accountStorageKey]: normalizeAccountState(state) })
}
