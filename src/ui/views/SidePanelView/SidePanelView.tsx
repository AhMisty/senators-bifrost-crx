import styles from './SidePanelView.module.css'

import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'

import { AccountCard } from '@/ui/components/AccountCard'
import {
  CardFrameList,
  CardFrameListItem,
  type CardFrameListItemControlledState,
  type CardFrameListItemMotion,
} from '@/ui/components/CardFrameList'
import { ControlButton } from '@/ui/components/FormControls'
import { usePrefersReducedMotion } from '@/ui/hooks/usePrefersReducedMotion'
import { sendAccountMessage } from '@/ui/libs/sendAccountMessage'
import { addSetValue, deleteSetValue, retainSetValues, toggleSetValue } from '@/ui/utils/signalSet'
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
import { type AccountMessageResult } from '@/shared/accountMessages'

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

type AccountDeleteTransition = {
  account: AccountRecord
  slot: 'top' | 'list'
  listIndex: number
  isAnimationComplete: boolean
  isDeleteComplete: boolean
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
  const [deleteTransition, setDeleteTransition] = createSignal<AccountDeleteTransition | null>(null)
  const [enteredAccountIds, setEnteredAccountIds] = createSignal(new Set<string>())
  const prefersReducedMotion = usePrefersReducedMotion()
  const initialAccountIds = new Set<string>()
  let createdAccountCollapseFrame1: number | undefined
  let createdAccountCollapseFrame2: number | undefined
  let randomIpRequestId = 0

  createEffect(() => {
    if (prefersReducedMotion()) {
      setHasAddButtonEntered(true)
    }
  })

  const accounts = createMemo(() => accountState.accounts)
  const promotedAccount = createMemo<AccountRecord | null>(() => {
    const accountId = promotedAccountId()
    const transition = deleteTransition()

    if (!accountId) {
      return null
    }

    if (transition?.slot === 'top' && transition.account.id === accountId) {
      return transition.account
    }

    return accounts().find((account) => account.id === accountId) ?? null
  })
  const listedAccounts = createMemo<AccountRecord[]>(() => {
    const accountId = promotedAccountId()
    const transition = deleteTransition()
    const currentAccounts = accounts()
    const baseAccounts = accountId
      ? currentAccounts.filter((account) => account.id !== accountId)
      : currentAccounts

    if (!transition || transition.slot !== 'list') {
      return baseAccounts
    }

    const accountsWithoutDeleting = baseAccounts.filter(
      (account) => account.id !== transition.account.id,
    )
    const nextAccounts = [...accountsWithoutDeleting]

    nextAccounts.splice(
      Math.min(transition.listIndex, accountsWithoutDeleting.length),
      0,
      transition.account,
    )

    return nextAccounts
  })
  const hasTopCard = createMemo(() => isAdding() || isAddingExiting() || promotedAccount() !== null)
  const isUsePending = createMemo(() => usingAccountId() !== null)
  const isAccountExpanded = (accountId: string): boolean => expandedAccountIds().has(accountId)
  const syncAnimatedAccountIds = (state: AccountState): void => {
    const validAccountIds = new Set(state.accounts.map((account) => account.id))
    const transition = deleteTransition()

    if (transition) {
      validAccountIds.add(transition.account.id)
    }

    setExpandedAccountIds((currentIds) => retainSetValues(currentIds, validAccountIds))
    setEnteredAccountIds((currentIds) => retainSetValues(currentIds, validAccountIds))
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

    setExpandedAccountIds((currentIds) => addSetValue(currentIds, accountId))

    createdAccountCollapseFrame1 = requestAnimationFrame(() => {
      createdAccountCollapseFrame2 = requestAnimationFrame(() => {
        setExpandedAccountIds((currentIds) => deleteSetValue(currentIds, accountId))
        createdAccountCollapseFrame1 = undefined
        createdAccountCollapseFrame2 = undefined
      })
    })
  }
  const toggleAccountExpanded = (accountId: string): void => {
    setExpandedAccountIds((currentIds) => toggleSetValue(currentIds, accountId))
  }
  const markAccountEntered = (accountId: string): void => {
    setEnteredAccountIds((currentIds) => addSetValue(currentIds, accountId))
  }
  const getAccountCardAnimation = (accountId: string): AccountCardAnimation => {
    if (prefersReducedMotion()) {
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
    if (prefersReducedMotion()) {
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
    const transitionAccountId = deleteTransition()?.account.id

    if (
      promotedAccountId() &&
      promotedAccountId() !== transitionAccountId &&
      !state.accounts.some((account) => account.id === promotedAccountId())
    ) {
      setPromotedAccountId(null)
    }

    if (
      pendingDeleteAccountId() &&
      pendingDeleteAccountId() !== transitionAccountId &&
      !state.accounts.some((account) => account.id === pendingDeleteAccountId())
    ) {
      setPendingDeleteAccountId(null)
    }
  }

  createEffect(() => {
    const transition = deleteTransition()

    if (!transition || !transition.isAnimationComplete || !transition.isDeleteComplete) {
      return
    }

    if (promotedAccountId() === transition.account.id) {
      setPromotedAccountId(null)
    }

    setPendingDeleteAccountId(null)
    setDeleteTransition(null)
    syncAnimatedAccountIds(accountState)
  })

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
    if (prefersReducedMotion()) {
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
  }

  const requestDeleteAccount = (accountId: string): void => {
    if (pendingDeleteAccountId() || isUsePending() || isAddingExiting()) {
      return
    }

    const account = accounts().find((item) => item.id === accountId)

    if (!account) {
      return
    }

    const transition: AccountDeleteTransition = {
      account: { ...account },
      slot: promotedAccountId() === accountId ? 'top' : 'list',
      listIndex: listedAccounts().findIndex((item) => item.id === accountId),
      isAnimationComplete: prefersReducedMotion(),
      isDeleteComplete: false,
    }

    setPendingDeleteAccountId(accountId)
    setDeleteTransition(transition)

    void (async () => {
      try {
        await deleteAccount(accountId)
        setDeleteTransition((currentTransition) =>
          currentTransition?.account.id === accountId
            ? { ...currentTransition, isDeleteComplete: true }
            : currentTransition,
        )
      } catch {
        if (pendingDeleteAccountId() === accountId) {
          setPendingDeleteAccountId(null)
        }

        if (deleteTransition()?.account.id === accountId) {
          setDeleteTransition(null)
        }

        return
      }
    })()
  }

  const completeDeleteAnimation = (accountId: string): void => {
    setDeleteTransition((currentTransition) =>
      currentTransition?.account.id === accountId
        ? { ...currentTransition, isAnimationComplete: true }
        : currentTransition,
    )
  }

  const handleAccountCardEnterEnd = (accountId: string): void => {
    if (prefersReducedMotion()) {
      return
    }

    markAccountEntered(accountId)
  }

  const handleTopCardEnterEnd = (): void => {
    const account = promotedAccount()

    if (!account || prefersReducedMotion()) {
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

    const transition = deleteTransition()

    if (transition?.slot === 'top') {
      completeDeleteAnimation(transition.account.id)
    }
  }

  const togglePassword = (accountId: string): void => {
    setVisiblePasswordIds((currentIds) => toggleSetValue(currentIds, accountId))
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
            {(_hasTopCard) => {
              return (
                <CardFrameListItem
                  enterIndex={1}
                  motion={getTopCardAnimation().motion}
                  state={getTopCardAnimation().state}
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
                return (
                  <CardFrameListItem
                    enterIndex={index() + (hasTopCard() ? 2 : 1)}
                    motion={getAccountCardAnimation(account.id).motion}
                    state={getAccountCardAnimation(account.id).state}
                    onEnterEnd={() => handleAccountCardEnterEnd(account.id)}
                    onExitEnd={() => completeDeleteAnimation(account.id)}
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
