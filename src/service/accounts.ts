import { Config, Operator, randomIPv4 } from '@senators/bifrost'

import { ChromeCourier } from '@/service/courier'
import { dnrResourceTypes, escapeDnrRegex, parseHttpUrl } from '@/service/dnrRules'
import {
  isValidIPv4,
  loadAccountState,
  sanitizeCreateAccountInput,
  saveAccountState,
  type AccountRecord,
  type AccountState,
  type CreateAccountInput,
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

const createAccount = async (input: CreateAccountInput): Promise<AccountState> => {
  const accountInput = sanitizeCreateAccountInput(input)

  if (!accountInput.username) {
    throw new Error('请输入用户名')
  }

  if (!accountInput.password) {
    throw new Error('请输入密码')
  }

  if (!isValidIPv4(accountInput.ip)) {
    throw new Error('请输入有效的 IP')
  }

  const state = await loadAccountState()
  const now = Date.now()
  const account: AccountRecord = {
    ...accountInput,
    id: createAccountId(),
    token: '',
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
        header: 'X-Forwarded-For',
        operation: 'set',
        value: ip,
      },
      {
        header: 'Forwarded',
        operation: 'set',
        value: ip,
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
  await removeGameTokenCookie(gameUrl)

  const didLogin = await operator.login().catch(() => false)
  const now = Date.now()

  if (!didLogin || !operator.token) {
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
  queueActiveAccountSideEffectsRefresh()
})

chrome.runtime.onStartup.addListener(() => {
  queueActiveAccountSideEffectsRefresh()
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
