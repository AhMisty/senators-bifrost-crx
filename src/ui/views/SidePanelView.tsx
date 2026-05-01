import styles from './SidePanelView.module.css'

import { For, Show, createSignal, onCleanup, onMount, type Component } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'

import { CardFrameList, CardFrameListItem } from '@/ui/components/CardFrameList'
import { ControlButton, ControlInput } from '@/ui/components/FormControls'
import {
  accountStorageAreaName,
  accountStorageKey,
  defaultAccountState,
  normalizeAccountState,
  type AccountRecord,
  type AccountState,
  type AccountValidity,
} from '@/shared/accounts'
import {
  isAccountMessageResponse,
  type AccountMessage,
  type AccountMessageResult,
} from '@/shared/accountMessages'

type AccountDraft = {
  universe: string
  username: string
  password: string
  ip: string
}

type AccountCardProps = {
  account: AccountRecord
  isActive: boolean
  isPasswordVisible: boolean
  isUsePending: boolean
  isUsing: boolean
  onTogglePassword: (accountId: string) => void
  onUse: (accountId: string) => void
}

const accountValidityLabels = {
  unknown: '未知',
  valid: '有效',
  invalid: '无效',
} as const satisfies Record<AccountValidity, string>

const defaultAccountDraft: AccountDraft = {
  universe: '1',
  username: '',
  password: '',
  ip: '',
}

const createPasswordMask = (password: string): string => '*'.repeat(Math.max(password.length, 6))

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

const EyeIcon: Component<{ isOpen: boolean }> = (props) => (
  <svg
    class={styles.eyeIcon}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <Show
      when={props.isOpen}
      fallback={
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 4.3A10.4 10.4 0 0 1 12 4c5 0 8.8 4.4 10 8a13.7 13.7 0 0 1-2.2 3.7" />
          <path d="M6.5 6.5A13.2 13.2 0 0 0 2 12c1.2 3.6 5 8 10 8 1.3 0 2.5-.3 3.6-.8" />
        </>
      }
    >
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.4" />
    </Show>
  </svg>
)

const AccountCard: Component<AccountCardProps> = (props) => {
  const displayedPassword = (): string =>
    props.isPasswordVisible ? props.account.password : createPasswordMask(props.account.password)

  return (
    <div class={styles.cardContent}>
      <header class={styles.accountHeader}>
        <div class={styles.accountHeading}>
          <h2 class={styles.accountName}>{props.account.username}</h2>
          <span class={styles.universe}>宇宙 {props.account.universe}</span>
        </div>

        <div class={styles.badges}>
          <Show when={props.isActive}>
            <span class={`${styles.badge} ${styles.activeBadge}`}>当前</span>
          </Show>
          <span class={styles.badge} data-validity={props.account.validity}>
            {accountValidityLabels[props.account.validity]}
          </span>
        </div>
      </header>

      <dl class={styles.detailList}>
        <div class={styles.detail}>
          <dt class={styles.detailLabel}>用户名</dt>
          <dd class={styles.detailValue}>{props.account.username}</dd>
        </div>

        <div class={styles.detail}>
          <dt class={styles.detailLabel}>密码</dt>
          <dd class={`${styles.detailValue} ${styles.secretValue}`}>
            <span class={styles.secretText}>{displayedPassword()}</span>
            <button
              class={styles.iconButton}
              type="button"
              aria-label={props.isPasswordVisible ? '隐藏密码' : '显示密码'}
              onClick={() => props.onTogglePassword(props.account.id)}
            >
              <EyeIcon isOpen={props.isPasswordVisible} />
            </button>
          </dd>
        </div>

        <div class={styles.detail}>
          <dt class={styles.detailLabel}>IP</dt>
          <dd class={styles.detailValue}>{props.account.ip}</dd>
        </div>

        <div class={styles.detail}>
          <dt class={styles.detailLabel}>Token</dt>
          <dd class={`${styles.detailValue} ${styles.tokenValue}`}>
            {props.account.token || '未获取'}
          </dd>
        </div>
      </dl>

      <footer class={styles.cardActions}>
        <ControlButton
          variant="primary"
          type="button"
          disabled={props.isUsePending}
          onClick={() => props.onUse(props.account.id)}
        >
          {props.isUsing ? '使用中' : '使用'}
        </ControlButton>
      </footer>
    </div>
  )
}

export const SidePanelView: Component = () => {
  const [accountState, setAccountState] = createStore<AccountState>(defaultAccountState)
  const [draft, setDraft] = createSignal<AccountDraft>(defaultAccountDraft)
  const [visiblePasswordIds, setVisiblePasswordIds] = createSignal(new Set<string>())
  const [isReady, setIsReady] = createSignal(false)
  const [isAdding, setIsAdding] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const [isRandomizingIp, setIsRandomizingIp] = createSignal(false)
  const [usingAccountId, setUsingAccountId] = createSignal<string | null>(null)
  const [feedback, setFeedback] = createSignal('')
  let randomIpRequestId = 0

  const accounts = (): AccountRecord[] => accountState.accounts
  const isUsePending = (): boolean => usingAccountId() !== null
  const replaceAccountState = (state: AccountState): void => {
    setAccountState(reconcile(state, { key: 'id' }))
  }

  const applyMessageResult = (result: AccountMessageResult): void => {
    if (result.type === 'accounts:state') {
      replaceAccountState(result.state)
    }

    if (result.type === 'accounts:random-ip') {
      setDraft((currentDraft) => ({ ...currentDraft, ip: result.ip }))
    }
  }

  const updateDraft = (value: Partial<AccountDraft>): void => {
    setDraft((currentDraft) => ({ ...currentDraft, ...value }))
  }

  const loadAccounts = async (): Promise<void> => {
    applyMessageResult(await sendAccountMessage({ type: 'accounts:list' }))
  }

  const fillRandomIp = async (): Promise<void> => {
    const requestId = ++randomIpRequestId

    setIsRandomizingIp(true)
    setFeedback('')

    try {
      const result = await sendAccountMessage({ type: 'accounts:random-ip' })

      if (requestId === randomIpRequestId) {
        applyMessageResult(result)
      }
    } catch (error) {
      if (requestId === randomIpRequestId) {
        setFeedback(error instanceof Error ? error.message : '生成 IP 失败')
      }
    } finally {
      if (requestId === randomIpRequestId) {
        setIsRandomizingIp(false)
      }
    }
  }

  const startAdding = (): void => {
    setDraft(defaultAccountDraft)
    setFeedback('')
    setIsAdding(true)
    void fillRandomIp()
  }

  const cancelAdding = (): void => {
    randomIpRequestId += 1
    setDraft(defaultAccountDraft)
    setFeedback('')
    setIsAdding(false)
    setIsRandomizingIp(false)
  }

  const submitAccount = (event: SubmitEvent): void => {
    event.preventDefault()

    if (isSaving()) {
      return
    }

    void (async () => {
      setIsSaving(true)
      setFeedback('')

      try {
        applyMessageResult(
          await sendAccountMessage({
            type: 'accounts:create',
            input: {
              universe: Number(draft().universe),
              username: draft().username,
              password: draft().password,
              ip: draft().ip,
            },
          }),
        )
        setDraft(defaultAccountDraft)
        setIsAdding(false)
        setFeedback('账号已添加')
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : '添加账号失败')
      } finally {
        setIsSaving(false)
      }
    })()
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
      setFeedback('')

      try {
        const result = await sendAccountMessage({ type: 'accounts:use', accountId })
        applyMessageResult(result)

        const account =
          result.type === 'accounts:state'
            ? result.state.accounts.find((item) => item.id === accountId)
            : null

        setFeedback(account?.validity === 'valid' ? '账号已启用' : '账号无效')
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : '启用账号失败')
      } finally {
        setUsingAccountId(null)
      }
    })()
  }

  onMount(() => {
    void (async () => {
      try {
        await loadAccounts()
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : '账号加载失败')
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
    onCleanup(() => chrome.storage.onChanged.removeListener(syncStoredAccountState))
  })

  return (
    <main class={styles.root}>
      <section class={styles.content}>
        <header class={styles.toolbar}>
          <ControlButton
            variant="primary"
            type="button"
            disabled={!isReady() || isAdding()}
            onClick={startAdding}
          >
            添加账号
          </ControlButton>
          <div class={styles.feedback} aria-live="polite">
            {feedback()}
          </div>
        </header>

        <CardFrameList class={styles.cardList}>
          <Show when={isAdding()}>
            <CardFrameListItem enterIndex={0}>
              <form class={styles.cardContent} aria-busy={isSaving()} onSubmit={submitAccount}>
                <h2 class={styles.formTitle}>新账号</h2>

                <div class={styles.formFields}>
                  <label class={styles.field}>
                    <span class={styles.fieldLabel}>宇宙</span>
                    <ControlInput
                      type="number"
                      min="1"
                      step="1"
                      value={draft().universe}
                      disabled={isSaving()}
                      onInput={(event) => updateDraft({ universe: event.currentTarget.value })}
                    />
                  </label>

                  <label class={styles.field}>
                    <span class={styles.fieldLabel}>用户名</span>
                    <ControlInput
                      type="text"
                      autocomplete="username"
                      value={draft().username}
                      disabled={isSaving()}
                      onInput={(event) => updateDraft({ username: event.currentTarget.value })}
                    />
                  </label>

                  <label class={styles.field}>
                    <span class={styles.fieldLabel}>密码</span>
                    <ControlInput
                      type="password"
                      autocomplete="current-password"
                      value={draft().password}
                      disabled={isSaving()}
                      onInput={(event) => updateDraft({ password: event.currentTarget.value })}
                    />
                  </label>

                  <label class={styles.field}>
                    <span class={styles.fieldLabel}>IP</span>
                    <span class={styles.ipControl}>
                      <ControlInput
                        type="text"
                        inputmode="numeric"
                        value={draft().ip}
                        disabled={isSaving()}
                        onInput={(event) => updateDraft({ ip: event.currentTarget.value })}
                      />
                      <ControlButton
                        type="button"
                        disabled={isSaving() || isRandomizingIp()}
                        onClick={() => void fillRandomIp()}
                      >
                        随机
                      </ControlButton>
                    </span>
                  </label>
                </div>

                <footer class={styles.formActions}>
                  <ControlButton variant="primary" type="submit" disabled={isSaving()}>
                    {isSaving() ? '添加中' : '添加'}
                  </ControlButton>
                  <ControlButton type="button" disabled={isSaving()} onClick={cancelAdding}>
                    取消
                  </ControlButton>
                </footer>
              </form>
            </CardFrameListItem>
          </Show>

          <Show
            when={accounts().length > 0}
            fallback={
              <Show when={!isAdding()}>
                <CardFrameListItem>
                  <p class={styles.empty}>暂无账号</p>
                </CardFrameListItem>
              </Show>
            }
          >
            <For each={accounts()}>
              {(account, index) => (
                <CardFrameListItem enterIndex={index() + (isAdding() ? 1 : 0)}>
                  <AccountCard
                    account={account}
                    isActive={accountState.activeAccountId === account.id}
                    isPasswordVisible={visiblePasswordIds().has(account.id)}
                    isUsePending={isUsePending()}
                    isUsing={usingAccountId() === account.id}
                    onTogglePassword={togglePassword}
                    onUse={useAccount}
                  />
                </CardFrameListItem>
              )}
            </For>
          </Show>
        </CardFrameList>
      </section>
    </main>
  )
}
