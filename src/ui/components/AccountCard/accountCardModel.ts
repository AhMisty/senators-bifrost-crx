import {
  isValidIPv4,
  type AccountFormDraft,
  type AccountRecord,
  type AccountValidity,
} from '@/shared/accounts'

export type AccountFormField = 'username' | 'password' | 'ip'

export const defaultEditDraft: AccountFormDraft = {
  universe: '1',
  username: '',
  password: '',
  ip: '',
  token: '',
}

export const requiredAccountFields: readonly AccountFormField[] = ['username', 'password', 'ip']

export const accountValidityLabels = {
  unknown: '未知',
  valid: '有效',
  invalid: '无效',
} as const satisfies Record<AccountValidity, string>

export const createAccountEditDraft = (account: AccountRecord): AccountFormDraft => ({
  universe: String(account.universe),
  username: account.username,
  password: account.password,
  ip: account.ip,
  token: account.token,
})

export const createPasswordMask = (): string => '******'

export const isAccountDraftFieldInvalid = (
  draft: AccountFormDraft,
  field: AccountFormField,
): boolean => {
  switch (field) {
    case 'username':
      return draft.username.trim().length === 0
    case 'password':
      return draft.password.length === 0
    case 'ip':
      return !isValidIPv4(draft.ip)
  }

  return false
}
