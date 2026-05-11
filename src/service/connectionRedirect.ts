import {
  connectionOptionsStorageAreaName,
  connectionOptionsStorageKey,
  loadConnectionOptions,
  normalizeConnectionOptions,
  type ConnectionOptions,
} from '@/shared/connectionOptions'
import { dnrResourceTypes, escapeDnrRegex, parseHttpUrl } from '@/service/dnrRules'
import { createTaskQueue } from '@/service/libs/createTaskQueue'

const connectionRedirectRuleId = 1
const redirectRuleTaskQueue = createTaskQueue()

type ConnectionAddressMap = {
  regexFilter: string
  redirectSubstitution: string
}

const normalizeBasePath = (pathname: string): string => {
  const normalizedPathname = pathname.replace(/\/+$/g, '')

  return normalizedPathname === '' ? '' : normalizedPathname
}

const createAddressBase = (url: URL): string =>
  `${url.protocol}//${url.host}${normalizeBasePath(url.pathname)}`

const isSameAddressBase = (firstUrl: URL, secondUrl: URL): boolean =>
  firstUrl.protocol === secondUrl.protocol &&
  firstUrl.host === secondUrl.host &&
  normalizeBasePath(firstUrl.pathname) === normalizeBasePath(secondUrl.pathname)

const isAddressBaseInside = (parentUrl: URL, childUrl: URL): boolean => {
  if (parentUrl.protocol !== childUrl.protocol || parentUrl.host !== childUrl.host) {
    return false
  }

  const parentPath = normalizeBasePath(parentUrl.pathname)
  const childPath = normalizeBasePath(childUrl.pathname)

  return parentPath === '' || childPath === parentPath || childPath.startsWith(`${parentPath}/`)
}

const areStringSetsEqual = (
  firstValues: readonly string[],
  secondValues: readonly string[],
): boolean => {
  if (firstValues.length !== secondValues.length) {
    return false
  }

  const secondValueSet = new Set(secondValues)

  return firstValues.every((value) => secondValueSet.has(value))
}

const createConnectionAddressMap = (options: ConnectionOptions): ConnectionAddressMap | null => {
  if (!options.isGameAddressProxyAddress) {
    return null
  }

  const originUrl = parseHttpUrl(options.originAddress)
  const gameUrl = parseHttpUrl(options.gameAddress)

  if (!originUrl || !gameUrl || isSameAddressBase(originUrl, gameUrl)) {
    return null
  }

  if (isAddressBaseInside(originUrl, gameUrl)) {
    return null
  }

  return {
    regexFilter: `^${escapeDnrRegex(createAddressBase(originUrl))}((?:[/?].*)?)$`,
    redirectSubstitution: `${createAddressBase(gameUrl)}\\1`,
  }
}

const createConnectionRedirectRule = (
  options: ConnectionOptions,
): chrome.declarativeNetRequest.Rule | null => {
  const addressMap = createConnectionAddressMap(options)

  if (!addressMap) {
    return null
  }

  return {
    id: connectionRedirectRuleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        regexSubstitution: addressMap.redirectSubstitution,
      },
    },
    condition: {
      regexFilter: addressMap.regexFilter,
      isUrlFilterCaseSensitive: true,
      resourceTypes: dnrResourceTypes,
    },
  }
}

const getCurrentConnectionRedirectRule = async (): Promise<
  chrome.declarativeNetRequest.Rule | undefined
> => {
  const rules = await chrome.declarativeNetRequest.getDynamicRules()

  return rules.find((rule) => rule.id === connectionRedirectRuleId)
}

const areConnectionRedirectRulesEqual = (
  currentRule: chrome.declarativeNetRequest.Rule | undefined,
  nextRule: chrome.declarativeNetRequest.Rule | null,
): boolean => {
  if (!currentRule || !nextRule) {
    return !currentRule && !nextRule
  }

  return (
    currentRule.priority === nextRule.priority &&
    currentRule.action.type === nextRule.action.type &&
    currentRule.action.redirect?.regexSubstitution ===
      nextRule.action.redirect?.regexSubstitution &&
    currentRule.condition.regexFilter === nextRule.condition.regexFilter &&
    currentRule.condition.isUrlFilterCaseSensitive ===
      nextRule.condition.isUrlFilterCaseSensitive &&
    areStringSetsEqual(
      currentRule.condition.resourceTypes ?? [],
      nextRule.condition.resourceTypes ?? [],
    )
  )
}

const updateConnectionRedirectRule = async (options: ConnectionOptions): Promise<void> => {
  const rule = createConnectionRedirectRule(options)
  const currentRule = await getCurrentConnectionRedirectRule()

  if (areConnectionRedirectRulesEqual(currentRule, rule)) {
    return
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [connectionRedirectRuleId],
    addRules: rule ? [rule] : [],
  })
}

const queueConnectionRedirectRuleUpdate = (options?: ConnectionOptions): void => {
  void redirectRuleTaskQueue
    .run(async () => updateConnectionRedirectRule(options ?? (await loadConnectionOptions())))
    .catch(() => undefined)
}

chrome.runtime.onInstalled.addListener(() => {
  queueConnectionRedirectRuleUpdate()
})

chrome.runtime.onStartup.addListener(() => {
  queueConnectionRedirectRuleUpdate()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  const optionsChange = changes[connectionOptionsStorageKey]

  if (areaName !== connectionOptionsStorageAreaName || !optionsChange) {
    return
  }

  queueConnectionRedirectRuleUpdate(normalizeConnectionOptions(optionsChange.newValue))
})
