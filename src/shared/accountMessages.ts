import type { AccountState, CreateAccountInput } from '@/shared/accounts'

export type AccountMessage =
  | {
      type: 'accounts:list'
    }
  | {
      type: 'accounts:create'
      input: CreateAccountInput
    }
  | {
      type: 'accounts:use'
      accountId: string
    }
  | {
      type: 'accounts:random-ip'
    }

export type AccountMessageResult =
  | {
      type: 'accounts:state'
      state: AccountState
    }
  | {
      type: 'accounts:random-ip'
      ip: string
    }

export type AccountMessageResponse =
  | {
      ok: true
      result: AccountMessageResult
    }
  | {
      ok: false
      error: string
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAccountMessageResult = (value: unknown): value is AccountMessageResult => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false
  }

  return value.type === 'accounts:state' || value.type === 'accounts:random-ip'
}

const isCreateAccountInput = (value: unknown): value is CreateAccountInput =>
  isRecord(value) &&
  typeof value.universe === 'number' &&
  typeof value.username === 'string' &&
  typeof value.password === 'string' &&
  typeof value.ip === 'string'

export const isAccountMessage = (value: unknown): value is AccountMessage => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false
  }

  switch (value.type) {
    case 'accounts:list':
    case 'accounts:random-ip':
      return true

    case 'accounts:create':
      return isCreateAccountInput(value.input)

    case 'accounts:use':
      return typeof value.accountId === 'string' && value.accountId.length > 0

    default:
      return false
  }
}

export const isAccountMessageResponse = (value: unknown): value is AccountMessageResponse => {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false
  }

  if (value.ok) {
    return isAccountMessageResult(value.result)
  }

  return typeof value.error === 'string'
}
