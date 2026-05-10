import { Config, Operator, randomIPv4 } from '@senators/bifrost'

import { ChromeCourier } from '@/service/courier'
import { dnrResourceTypes, escapeDnrRegex, parseHttpUrl } from '@/service/dnrRules'
import {
  isValidIPv4,
  loadAccountState,
  sanitizeCreateAccountInput,
  sanitizeUpdateAccountInput,
  saveAccountState,
  type AccountRecord,
  type AccountState,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '@/shared/accounts'
import {
  isAccountMessage,
  type AccountMessage,
  type AccountMessageResponse,
  type AccountMessageResult,
} from '@/shared/accountMessages'
import {
  connectionOptionsStorageAreaName,
  connectionOptionsStorageKey,
  loadConnectionOptions,
  normalizeConnectionOptions,
  type ConnectionOptions,
} from '@/shared/connectionOptions'

const activeAccountRequestHeaderRuleId = 2
const sharedConfig = new Config()

let sharedCourier: ChromeCourier | null = null
let sharedCourierBase = ''
let pendingAccountTask = Promise.resolve()

const createAccountId = (): string =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const getConfiguredGameUrl = async (): Promise<URL | null> => {
  const options = await loadConnectionOptions()

  return parseHttpUrl(options.gameAddress)
}

const requireGameUrl = async (): Promise<URL> => {
  const gameUrl = await getConfiguredGameUrl()

  if (!gameUrl) {
    throw new Error('请先配置有效的游戏地址')
  }

  return gameUrl
}

const getSharedCourier = (gameUrl: URL): ChromeCourier => {
  const base = `${gameUrl.origin}/`

  if (!sharedCourier || sharedCourierBase !== base) {
    sharedCourier = new ChromeCourier({ base })
    sharedCourierBase = base
  }

  return sharedCourier
}

const forceAccountToken = async (accountId: string, token: string, gameUrl: URL): Promise<void> => {
  if (!token) {
    return
  }

  const state = await loadAccountState()
  const account = state.accounts.find((item) => item.id === accountId)

  if (!account) {
    return
  }

  const now = Date.now()
  const nextAccount = {
    ...account,
    token,
    validity: 'valid' as const,
    updatedAt: now,
  }
  const nextState = replaceAccount(state, accountId, () => nextAccount)

  if (state.activeAccountId === accountId) {
    await applyActiveAccountSideEffects(gameUrl, nextAccount)
  }

  await saveAccountState(nextState)
}

const createOperator = (account: AccountRecord, gameUrl: URL): Operator => {
  const operator = new Operator({
    universe: account.universe,
    username: account.username,
    password: account.password,
    courier: getSharedCourier(gameUrl),
    config: sharedConfig,
  })

  operator.ip = account.ip
  operator.token = account.token
  operator.onLogined = async (event) => {
    await forceAccountToken(account.id, event.operator.token, gameUrl)
  }

  return operator
}

const runAccountTask = <Result>(action: () => Promise<Result>): Promise<Result> => {
  const taskResult = pendingAccountTask.catch(() => undefined).then(action)

  pendingAccountTask = taskResult.then(
    () => undefined,
    () => undefined,
  )

  return taskResult
}

const waitForAccountTasks = async (): Promise<void> => {
  await pendingAccountTask.catch(() => undefined)
}

const assertValidAccountInput = (input: CreateAccountInput | UpdateAccountInput): void => {
  if (!input.username) {
    throw new Error('请输入用户名')
  }

  if (!input.password) {
    throw new Error('请输入密码')
  }

  if (!isValidIPv4(input.ip)) {
    throw new Error('请输入有效的 IP')
  }
}

const createAccount = async (input: CreateAccountInput): Promise<AccountState> => {
  const accountInput = sanitizeCreateAccountInput(input)

  assertValidAccountInput(accountInput)

  const state = await loadAccountState()
  const now = Date.now()
  const account: AccountRecord = {
    ...accountInput,
    id: createAccountId(),
    validity: 'unknown',
    createdAt: now,
    updatedAt: now,
  }
  const nextState = {
    ...state,
    accounts: [account, ...state.accounts],
  }

  await saveAccountState(nextState)

  return nextState
}

const replaceAccount = (
  state: AccountState,
  accountId: string,
  updater: (account: AccountRecord) => AccountRecord,
): AccountState => ({
  ...state,
  accounts: state.accounts.map((account) =>
    account.id === accountId ? updater(account) : account,
  ),
})

const setGameTokenCookie = async (gameUrl: URL, token: string): Promise<void> => {
  const cookie = await chrome.cookies.set({
    url: `${gameUrl.origin}/`,
    name: sharedConfig.token,
    value: token,
    path: '/',
    secure: gameUrl.protocol === 'https:',
  })

  if (!cookie) {
    throw new Error('写入游戏 Cookie 失败')
  }
}

const removeGameTokenCookie = async (gameUrl: URL): Promise<void> => {
  await chrome.cookies.remove({
    url: `${gameUrl.origin}/`,
    name: sharedConfig.token,
  })
}

const getGameTokenCookie = async (gameUrl: URL): Promise<string | null> => {
  const cookie = await chrome.cookies.get({
    url: `${gameUrl.origin}/`,
    name: sharedConfig.token,
  })

  return cookie?.value ?? null
}

const createActiveAccountRequestHeaderRule = (
  gameUrl: URL,
  ip: string,
): chrome.declarativeNetRequest.Rule => ({
  id: activeAccountRequestHeaderRuleId,
  priority: 2,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      {
        header: 'Forwarded',
        operation: 'set',
        value: `for=${ip}`,
      },
    ],
  },
  condition: {
    regexFilter: `^${escapeDnrRegex(gameUrl.origin)}(?:[/?].*)?$`,
    isUrlFilterCaseSensitive: true,
    resourceTypes: dnrResourceTypes,
  },
})

const removeActiveAccountRequestHeaderRule = async (): Promise<void> => {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [activeAccountRequestHeaderRuleId],
  })
}

const updateActiveAccountRequestHeaderRule = async (
  gameUrl: URL,
  account: AccountRecord,
): Promise<void> => {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [activeAccountRequestHeaderRuleId],
    addRules: [createActiveAccountRequestHeaderRule(gameUrl, account.ip)],
  })
}

const applyActiveAccountSideEffects = async (
  gameUrl: URL,
  account: AccountRecord | null,
): Promise<void> => {
  if (!account) {
    await removeActiveAccountRequestHeaderRule()
    await removeGameTokenCookie(gameUrl)
    return
  }

  await updateActiveAccountRequestHeaderRule(gameUrl, account)

  if (account.token) {
    await setGameTokenCookie(gameUrl, account.token)
    return
  }

  await removeGameTokenCookie(gameUrl)
}

const syncActiveAccountFromGameCookie = async (gameUrl: URL): Promise<void> => {
  const state = await loadAccountState()
  const cookieToken = await getGameTokenCookie(gameUrl)
  const matchedAccount = cookieToken
    ? state.accounts.find((account) => account.token === cookieToken) ?? null
    : null
  const nextActiveAccountId = matchedAccount?.id ?? null

  if (state.activeAccountId === nextActiveAccountId) {
    if (matchedAccount) {
      await updateActiveAccountRequestHeaderRule(gameUrl, matchedAccount)
    } else {
      await removeActiveAccountRequestHeaderRule()
    }

    return
  }

  if (matchedAccount) {
    await updateActiveAccountRequestHeaderRule(gameUrl, matchedAccount)
  } else {
    await removeActiveAccountRequestHeaderRule()
  }

  await saveAccountState({
    ...state,
    activeAccountId: nextActiveAccountId,
  })
}

const syncActiveAccountFromConfiguredGameCookie = async (): Promise<void> => {
  const gameUrl = await getConfiguredGameUrl()

  if (!gameUrl) {
    await removeActiveAccountRequestHeaderRule()
    return
  }

  await syncActiveAccountFromGameCookie(gameUrl)
}

const updateAccount = async (
  accountId: string,
  input: UpdateAccountInput,
): Promise<AccountState> => {
  const accountInput = sanitizeUpdateAccountInput(input)

  assertValidAccountInput(accountInput)

  const state = await loadAccountState()
  const account = state.accounts.find((item) => item.id === accountId)

  if (!account) {
    throw new Error('账号不存在')
  }

  const isIdentityChanged =
    account.universe !== accountInput.universe ||
    account.username !== accountInput.username ||
    account.password !== accountInput.password ||
    account.ip !== accountInput.ip ||
    account.token !== accountInput.token
  const nextAccount: AccountRecord = {
    ...account,
    ...accountInput,
    validity: isIdentityChanged ? 'unknown' : account.validity,
    updatedAt: Date.now(),
  }
  const nextState = replaceAccount(state, accountId, () => nextAccount)

  if (state.activeAccountId === accountId) {
    const gameUrl = await getConfiguredGameUrl()

    if (gameUrl) {
      await applyActiveAccountSideEffects(gameUrl, nextAccount)
    } else {
      await removeActiveAccountRequestHeaderRule()
    }
  }

  await saveAccountState(nextState)

  return nextState
}

const deleteAccount = async (accountId: string): Promise<AccountState> => {
  const state = await loadAccountState()
  const account = state.accounts.find((item) => item.id === accountId)

  if (!account) {
    throw new Error('账号不存在')
  }

  const nextState: AccountState = {
    ...state,
    accounts: state.accounts.filter((item) => item.id !== accountId),
    activeAccountId: state.activeAccountId === accountId ? null : state.activeAccountId,
  }

  if (state.activeAccountId === accountId) {
    const gameUrl = await getConfiguredGameUrl()

    await removeActiveAccountRequestHeaderRule()

    if (gameUrl) {
      await removeGameTokenCookie(gameUrl)
    }
  }

  await saveAccountState(nextState)

  return nextState
}

const useAccount = async (accountId: string): Promise<AccountState> => {
  const state = await loadAccountState()
  const account = state.accounts.find((item) => item.id === accountId)
  const previousActiveAccount =
    state.accounts.find((item) => item.id === state.activeAccountId) ?? null

  if (!account) {
    throw new Error('账号不存在')
  }

  const gameUrl = await requireGameUrl()
  const operator = createOperator(account, gameUrl)

  await updateActiveAccountRequestHeaderRule(gameUrl, account)
  if (account.token) {
    await setGameTokenCookie(gameUrl, account.token)
  } else {
    await removeGameTokenCookie(gameUrl)
  }

  const didAuthenticate = await operator.updateControl()
  const now = Date.now()

  if (!didAuthenticate || !operator.token) {
    const nextState = {
      ...replaceAccount(state, account.id, (currentAccount) => ({
        ...currentAccount,
        validity: 'invalid',
        updatedAt: now,
      })),
      activeAccountId: state.activeAccountId === account.id ? null : state.activeAccountId,
    }

    await applyActiveAccountSideEffects(
      gameUrl,
      nextState.activeAccountId === previousActiveAccount?.id ? previousActiveAccount : null,
    )
    await saveAccountState(nextState)

    return nextState
  }

  const activeAccount: AccountRecord = {
    ...account,
    token: operator.token,
    validity: 'valid',
    updatedAt: now,
  }
  const nextState = {
    ...replaceAccount(state, account.id, () => activeAccount),
    activeAccountId: account.id,
  }

  await applyActiveAccountSideEffects(gameUrl, activeAccount)
  await saveAccountState(nextState)

  return nextState
}

const refreshActiveAccountSideEffects = async (
  options?: ConnectionOptions,
  previousOptions?: ConnectionOptions,
): Promise<void> => {
  const state = await loadAccountState()
  const activeAccount =
    state.accounts.find((account) => account.id === state.activeAccountId) ?? null
  const nextOptions = options ?? (await loadConnectionOptions())
  const gameUrl = parseHttpUrl(nextOptions.gameAddress)
  const previousGameUrl = previousOptions ? parseHttpUrl(previousOptions.gameAddress) : null

  if (activeAccount && previousGameUrl && (!gameUrl || previousGameUrl.origin !== gameUrl.origin)) {
    await removeGameTokenCookie(previousGameUrl)
  }

  if (!activeAccount || !gameUrl) {
    await removeActiveAccountRequestHeaderRule()
    return
  }

  await applyActiveAccountSideEffects(gameUrl, activeAccount)
}

const queueActiveAccountSideEffectsRefresh = (
  options?: ConnectionOptions,
  previousOptions?: ConnectionOptions,
): void => {
  void runAccountTask(() => refreshActiveAccountSideEffects(options, previousOptions)).catch(
    () => undefined,
  )
}

const queueActiveAccountCookieSync = (): void => {
  void runAccountTask(syncActiveAccountFromConfiguredGameCookie).catch(() => undefined)
}

const handleAccountMessage = async (message: AccountMessage): Promise<AccountMessageResult> => {
  switch (message.type) {
    case 'accounts:list':
      await waitForAccountTasks()

      return {
        type: 'accounts:state',
        state: await loadAccountState(),
      }

    case 'accounts:create':
      return {
        type: 'accounts:state',
        state: await runAccountTask(() => createAccount(message.input)),
      }

    case 'accounts:update':
      return {
        type: 'accounts:state',
        state: await runAccountTask(() => updateAccount(message.accountId, message.input)),
      }

    case 'accounts:delete':
      return {
        type: 'accounts:state',
        state: await runAccountTask(() => deleteAccount(message.accountId)),
      }

    case 'accounts:use':
      return {
        type: 'accounts:state',
        state: await runAccountTask(() => useAccount(message.accountId)),
      }

    case 'accounts:random-ip':
      return {
        type: 'accounts:random-ip',
        ip: randomIPv4(),
      }

    default:
      throw new Error('未知账号操作')
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isAccountMessage(message)) {
    return false
  }

  void handleAccountMessage(message)
    .then((result) => {
      const response: AccountMessageResponse = { ok: true, result }

      sendResponse(response)
    })
    .catch((error: unknown) => {
      const response: AccountMessageResponse = {
        ok: false,
        error: error instanceof Error ? error.message : '账号操作失败',
      }

      sendResponse(response)
    })

  return true
})

chrome.runtime.onInstalled.addListener(() => {
  queueActiveAccountCookieSync()
})

chrome.runtime.onStartup.addListener(() => {
  queueActiveAccountCookieSync()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  const optionsChange = changes[connectionOptionsStorageKey]

  if (areaName === connectionOptionsStorageAreaName && optionsChange) {
    queueActiveAccountSideEffectsRefresh(
      normalizeConnectionOptions(optionsChange.newValue),
      normalizeConnectionOptions(optionsChange.oldValue),
    )
  }
})

chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (cookie.name !== sharedConfig.token) {
    return
  }

  queueActiveAccountCookieSync()
})
