import styles from './SidePanelView.module.css'

import { For, Show, createSignal, onCleanup, onMount, type Component } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'

import { AccountCard } from '@/ui/components/AccountCard'
import {
  CardFrameList,
  CardFrameListItem,
  type CardFrameListItemControlledState,
  type CardFrameListItemMotion,
} from '@/ui/components/CardFrameList'
import { ControlButton } from '@/ui/components/FormControls'
import {
  accountStorageAreaName,
  accountStorageKey,
  defaultAccountState,
  normalizeAccountState,
  type AccountFormDraft,
  type AccountRecord,
  type AccountState,
  type UpdateAccountInput,
} from '@/shared/accounts'
import {
  isAccountMessageResponse,
  type AccountMessage,
  type AccountMessageResult,
} from '@/shared/accountMessages'

const defaultAccountDraft: AccountFormDraft = {
  universe: '1',
  username: '',
  password: '',
  ip: '',
  token: '',
}

type AccountCardAnimation = {
  motion: CardFrameListItemMotion
  state: CardFrameListItemControlledState
}

const sendAccountMessage = async (message: AccountMessage): Promise<AccountMessageResult> => {
  if (typeof chrome === 'undefined') {
    throw new Error('当前环境无法访问扩展服务')
  }

  const response: unknown = await chrome.runtime.sendMessage(message)

  if (!isAccountMessageResponse(response)) {
    throw new Error('扩展服务无响应')
  }

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.result
}

export const SidePanelView: Component = () => {
  const [accountState, setAccountState] = createStore<AccountState>(defaultAccountState)
  const [draft, setDraft] = createSignal<AccountFormDraft>(defaultAccountDraft)
  const [expandedAccountIds, setExpandedAccountIds] = createSignal(new Set<string>())
  const [visiblePasswordIds, setVisiblePasswordIds] = createSignal(new Set<string>())
  const [isReady, setIsReady] = createSignal(false)
  const [isAdding, setIsAdding] = createSignal(false)
  const [isAddingExiting, setIsAddingExiting] = createSignal(false)
  const [hasAddButtonEntered, setHasAddButtonEntered] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const [isRandomizingIp, setIsRandomizingIp] = createSignal(false)
  const [usingAccountId, setUsingAccountId] = createSignal<string | null>(null)
  const [promotedAccountId, setPromotedAccountId] = createSignal<string | null>(null)
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = createSignal<string | null>(null)
  const [shouldAnimateCards, setShouldAnimateCards] = createSignal(true)
  const [enteredAccountIds, setEnteredAccountIds] = createSignal(new Set<string>())
  const initialAccountIds = new Set<string>()
  let createdAccountCollapseFrame1: number | undefined
  let createdAccountCollapseFrame2: number | undefined
  let randomIpRequestId = 0

  const accounts = (): AccountRecord[] => accountState.accounts
  const promotedAccount = (): AccountRecord | null => {
    const accountId = promotedAccountId()

    if (!accountId) {
      return null
    }

    return accounts().find((account) => account.id === accountId) ?? null
  }
  const listedAccounts = (): AccountRecord[] => {
    const accountId = promotedAccountId()

    return accountId ? accounts().filter((account) => account.id !== accountId) : accounts()
  }
  const hasTopCard = (): boolean => isAdding() || isAddingExiting() || promotedAccount() !== null
  const isUsePending = (): boolean => usingAccountId() !== null
  const isAccountExpanded = (accountId: string): boolean => expandedAccountIds().has(accountId)
  const retainAccountIds = (currentIds: Set<string>, validIds: Set<string>): Set<string> => {
    let nextIds: Set<string> | undefined

    currentIds.forEach((accountId) => {
      if (validIds.has(accountId)) {
        return
      }

      if (!nextIds) {
        nextIds = new Set(currentIds)
      }

      nextIds.delete(accountId)
    })

    return nextIds ?? currentIds
  }
  const syncAnimatedAccountIds = (state: AccountState): void => {
    const validAccountIds = new Set(state.accounts.map((account) => account.id))

    setExpandedAccountIds((currentIds) => retainAccountIds(currentIds, validAccountIds))
    setEnteredAccountIds((currentIds) => retainAccountIds(currentIds, validAccountIds))
  }
  const clearCreatedAccountCollapseFrames = (): void => {
    if (createdAccountCollapseFrame1 !== undefined) {
      cancelAnimationFrame(createdAccountCollapseFrame1)
      createdAccountCollapseFrame1 = undefined
    }

    if (createdAccountCollapseFrame2 !== undefined) {
      cancelAnimationFrame(createdAccountCollapseFrame2)
      createdAccountCollapseFrame2 = undefined
    }
  }
  const scheduleCreatedAccountCollapse = (accountId: string): void => {
    clearCreatedAccountCollapseFrames()

    setExpandedAccountIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(accountId)
      return nextIds
    })

    createdAccountCollapseFrame1 = requestAnimationFrame(() => {
      createdAccountCollapseFrame2 = requestAnimationFrame(() => {
        setExpandedAccountIds((currentIds) => {
          if (!currentIds.has(accountId)) {
            return currentIds
          }

          const nextIds = new Set(currentIds)
          nextIds.delete(accountId)
          return nextIds
        })
        createdAccountCollapseFrame1 = undefined
        createdAccountCollapseFrame2 = undefined
      })
    })
  }
  const toggleAccountExpanded = (accountId: string): void => {
    setExpandedAccountIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(accountId)) {
        nextIds.delete(accountId)
      } else {
        nextIds.add(accountId)
      }

      return nextIds
    })
  }
  const markAccountEntered = (accountId: string): void => {
    setEnteredAccountIds((currentIds) => {
      if (currentIds.has(accountId)) {
        return currentIds
      }

      const nextIds = new Set(currentIds)
      nextIds.add(accountId)
      return nextIds
    })
  }
  const getAccountCardAnimation = (accountId: string): AccountCardAnimation => {
    if (!shouldAnimateCards()) {
      return { motion: 'collapse', state: 'visible' }
    }

    if (pendingDeleteAccountId() === accountId) {
      return { motion: 'collapse', state: 'exiting' }
    }

    const hasEntered = enteredAccountIds().has(accountId)

    return {
      motion: initialAccountIds.has(accountId) && !hasEntered ? 'float' : 'collapse',
      state: hasEntered ? 'visible' : 'entering',
    }
  }
  const getTopCardAnimation = (): AccountCardAnimation => {
    if (!shouldAnimateCards()) {
      return { motion: 'collapse', state: 'visible' }
    }

    if (isAddingExiting()) {
      return { motion: 'collapse', state: 'exiting' }
    }

    const account = promotedAccount()

    if (account) {
      return getAccountCardAnimation(account.id)
    }

    return { motion: 'collapse', state: 'entering' }
  }
  const replaceAccountState = (state: AccountState): void => {
    setAccountState(reconcile(state, { key: 'id' }))
    syncAnimatedAccountIds(state)

    if (
      promotedAccountId() &&
      !state.accounts.some((account) => account.id === promotedAccountId())
    ) {
      setPromotedAccountId(null)
    }

    if (
      pendingDeleteAccountId() &&
      !state.accounts.some((account) => account.id === pendingDeleteAccountId())
    ) {
      setPendingDeleteAccountId(null)
    }
  }

  const applyMessageResult = (result: AccountMessageResult): void => {
    if (result.type === 'accounts:state') {
      replaceAccountState(result.state)
    }
  }

  const updateDraft = (value: Partial<AccountFormDraft>): void => {
    setDraft((currentDraft) => ({ ...currentDraft, ...value }))
  }

  const completeAddButtonEnter = (event: AnimationEvent): void => {
    if (event.currentTarget !== event.target) {
      return
    }

    setHasAddButtonEntered(true)
  }

  const loadAccounts = async (): Promise<void> => {
    const result = await sendAccountMessage({ type: 'accounts:list' })

    if (result.type === 'accounts:state') {
      initialAccountIds.clear()
      result.state.accounts.forEach((account) => initialAccountIds.add(account.id))
    }

    applyMessageResult(result)
  }

  const getRandomIp = async (): Promise<string | null> => {
    const result = await sendAccountMessage({ type: 'accounts:random-ip' })

    return result.type === 'accounts:random-ip' ? result.ip : null
  }

  const fillRandomIp = async (): Promise<void> => {
    const requestId = ++randomIpRequestId

    setIsRandomizingIp(true)

    try {
      const ip = await getRandomIp()

      if (requestId === randomIpRequestId && ip) {
        setDraft((currentDraft) => ({ ...currentDraft, ip }))
      }
    } catch {
      return
    } finally {
      if (requestId === randomIpRequestId) {
        setIsRandomizingIp(false)
      }
    }
  }

  const startAdding = (): void => {
    if (isAdding() || isAddingExiting()) {
      return
    }

    setDraft(defaultAccountDraft)
    setPromotedAccountId(null)
    setIsAddingExiting(false)
    setIsAdding(true)
    void fillRandomIp()
  }

  const cancelAdding = (): void => {
    if (!isAdding() || isAddingExiting()) {
      return
    }

    randomIpRequestId += 1
    setIsRandomizingIp(false)
    if (!shouldAnimateCards()) {
      setDraft(defaultAccountDraft)
      setIsAdding(false)
      return
    }

    setIsAddingExiting(true)
  }

  const submitAccount = (event: SubmitEvent): void => {
    event.preventDefault()

    if (isSaving() || isRandomizingIp()) {
      return
    }

    void (async () => {
      setIsSaving(true)

      try {
        const previousAccountIds = new Set(accounts().map((account) => account.id))
        const result = await sendAccountMessage({
          type: 'accounts:create',
          input: {
            universe: Number(draft().universe),
            username: draft().username,
            password: draft().password,
            ip: draft().ip,
            token: draft().token,
          },
        })

        if (result.type === 'accounts:state') {
          const createdAccount = result.state.accounts.find(
            (account) => !previousAccountIds.has(account.id),
          )

          if (createdAccount) {
            markAccountEntered(createdAccount.id)
            setPromotedAccountId(createdAccount.id)
            scheduleCreatedAccountCollapse(createdAccount.id)
          }
        }

        applyMessageResult(result)
        setDraft(defaultAccountDraft)
        setIsAdding(false)
        setIsAddingExiting(false)
      } catch {
        return
      } finally {
        setIsSaving(false)
      }
    })()
  }

  const updateAccount = async (accountId: string, input: UpdateAccountInput): Promise<void> => {
    applyMessageResult(
      await sendAccountMessage({
        type: 'accounts:update',
        accountId,
        input,
      }),
    )
  }

  const deleteAccount = async (accountId: string): Promise<void> => {
    applyMessageResult(
      await sendAccountMessage({
        type: 'accounts:delete',
        accountId,
      }),
    )

    if (promotedAccountId() === accountId) {
      setPromotedAccountId(null)
    }
  }

  const requestDeleteAccount = (accountId: string): void => {
    if (pendingDeleteAccountId() || isUsePending() || isAddingExiting()) {
      return
    }

    if (!shouldAnimateCards()) {
      void deleteAccount(accountId).catch(() => undefined)
      return
    }

    setPendingDeleteAccountId(accountId)
  }

  const completeDeleteAccount = (accountId: string): void => {
    if (pendingDeleteAccountId() !== accountId) {
      return
    }

    void (async () => {
      try {
        await deleteAccount(accountId)
      } catch {
        return
      } finally {
        if (pendingDeleteAccountId() === accountId) {
          setPendingDeleteAccountId(null)
        }
      }
    })()
  }

  const handleAccountCardEnterEnd = (accountId: string): void => {
    if (!shouldAnimateCards()) {
      return
    }

    markAccountEntered(accountId)
  }

  const handleAccountCardExitEnd = (accountId: string): void => {
    if (pendingDeleteAccountId() === accountId) {
      completeDeleteAccount(accountId)
    }
  }

  const handleTopCardEnterEnd = (): void => {
    const account = promotedAccount()

    if (!account || !shouldAnimateCards()) {
      return
    }

    markAccountEntered(account.id)
  }

  const finishCancelAdding = (): void => {
    randomIpRequestId += 1
    setDraft(defaultAccountDraft)
    setIsAdding(false)
    setIsAddingExiting(false)
    setIsRandomizingIp(false)
  }

  const handleTopCardExitEnd = (): void => {
    if (isAddingExiting()) {
      finishCancelAdding()
      return
    }

    const account = promotedAccount()

    if (account && pendingDeleteAccountId() === account.id) {
      completeDeleteAccount(account.id)
    }
  }

  const togglePassword = (accountId: string): void => {
    setVisiblePasswordIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(accountId)) {
        nextIds.delete(accountId)
      } else {
        nextIds.add(accountId)
      }

      return nextIds
    })
  }

  const useAccount = (accountId: string): void => {
    if (isUsePending()) {
      return
    }

    void (async () => {
      setUsingAccountId(accountId)

      try {
        applyMessageResult(await sendAccountMessage({ type: 'accounts:use', accountId }))
      } catch {
        return
      } finally {
        setUsingAccountId(null)
      }
    })()
  }

  onMount(() => {
    setShouldAnimateCards(
      typeof window === 'undefined'
        ? true
        : !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )

    void (async () => {
      try {
        await loadAccounts()
      } catch {
        return
      } finally {
        setIsReady(true)
      }
    })()

    if (typeof chrome === 'undefined') {
      return
    }

    const syncStoredAccountState = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void => {
      const accountChange = changes[accountStorageKey]

      if (areaName !== accountStorageAreaName || !accountChange) {
        return
      }

      replaceAccountState(normalizeAccountState(accountChange.newValue))
    }

    chrome.storage.onChanged.addListener(syncStoredAccountState)
    onCleanup(() => {
      chrome.storage.onChanged.removeListener(syncStoredAccountState)
      clearCreatedAccountCollapseFrames()
    })
  })

  return (
    <main class={styles.root}>
      <section class={styles.content}>
        <header class={styles.toolbar}>
          <ControlButton
            class={styles.addAccountButton}
            variant="primary"
            type="button"
            data-entered={hasAddButtonEntered() ? 'true' : 'false'}
            disabled={!isReady() || isAdding() || pendingDeleteAccountId() !== null}
            onAnimationEnd={completeAddButtonEnter}
            onAnimationCancel={completeAddButtonEnter}
            onClick={startAdding}
          >
            添加账号
          </ControlButton>
        </header>

        <CardFrameList class={styles.cardList}>
          <Show when={hasTopCard()}>
            {() => {
              const topCardAnimation = getTopCardAnimation()

              return (
                <CardFrameListItem
                  enterIndex={1}
                  motion={topCardAnimation.motion}
                  state={topCardAnimation.state}
                  onEnterEnd={handleTopCardEnterEnd}
                  onExitEnd={handleTopCardExitEnd}
                >
                  <Show
                    when={isAdding()}
                    fallback={
                      <Show when={promotedAccount()}>
                        {(account) => (
                          <AccountCard
                            account={account()}
                            isExpanded={isAccountExpanded(account().id)}
                            isActive={accountState.activeAccountId === account().id}
                            isDeletePending={pendingDeleteAccountId() === account().id}
                            isPasswordVisible={visiblePasswordIds().has(account().id)}
                            isUsePending={isUsePending()}
                            isUsing={usingAccountId() === account().id}
                            onDeleteStart={requestDeleteAccount}
                            onRandomIp={getRandomIp}
                            onToggleExpanded={toggleAccountExpanded}
                            onTogglePassword={togglePassword}
                            onUpdate={updateAccount}
                            onUse={useAccount}
                          />
                        )}
                      </Show>
                    }
                  >
                    <AccountCard
                      mode="create"
                      draft={draft()}
                      isExiting={isAddingExiting()}
                      isRandomizingIp={isRandomizingIp()}
                      isSaving={isSaving()}
                      onCancel={cancelAdding}
                      onChange={updateDraft}
                      onRandomIp={getRandomIp}
                      onSubmit={submitAccount}
                    />
                  </Show>
                </CardFrameListItem>
              )
            }}
          </Show>

          <Show when={listedAccounts().length > 0}>
            <For each={listedAccounts()}>
              {(account, index) => {
                const accountAnimation = getAccountCardAnimation(account.id)

                return (
                  <CardFrameListItem
                    enterIndex={index() + (hasTopCard() ? 2 : 1)}
                    motion={accountAnimation.motion}
                    state={accountAnimation.state}
                    onEnterEnd={() => handleAccountCardEnterEnd(account.id)}
                    onExitEnd={() => handleAccountCardExitEnd(account.id)}
                  >
                    <AccountCard
                      account={account}
                      isExpanded={isAccountExpanded(account.id)}
                      isActive={accountState.activeAccountId === account.id}
                      isDeletePending={pendingDeleteAccountId() === account.id}
                      isPasswordVisible={visiblePasswordIds().has(account.id)}
                      isUsePending={isUsePending()}
                      isUsing={usingAccountId() === account.id}
                      onDeleteStart={requestDeleteAccount}
                      onRandomIp={getRandomIp}
                      onToggleExpanded={toggleAccountExpanded}
                      onTogglePassword={togglePassword}
                      onUpdate={updateAccount}
                      onUse={useAccount}
                    />
                  </CardFrameListItem>
                )
              }}
            </For>
          </Show>
        </CardFrameList>
      </section>
    </main>
  )
}
