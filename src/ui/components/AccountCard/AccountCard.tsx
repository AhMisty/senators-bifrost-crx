import styles from './AccountCard.module.css'

import { Show, createEffect, createSignal, onCleanup, type Component } from 'solid-js'

import { ControlButton, ControlInput } from '@/ui/components/FormControls'
import {
  isValidIPv4,
  type AccountFormDraft,
  type AccountRecord,
  type AccountValidity,
  type UpdateAccountInput,
} from '@/shared/accounts'
import { DiceIcon } from './AccountCardIcons'

type AccountCardCreateProps = {
  mode: 'create'
  draft: AccountFormDraft
  isExiting: boolean
  isRandomizingIp: boolean
  isSaving: boolean
  onCancel: () => void
  onChange: (value: Partial<AccountFormDraft>) => void
  onRandomIp: () => Promise<string | null>
  onSubmit: (event: SubmitEvent) => void
}

type AccountCardStoredProps = {
  mode?: 'stored'
  account: AccountRecord
  isExpanded: boolean
  isActive: boolean
  isDeletePending: boolean
  isPasswordVisible: boolean
  isUsePending: boolean
  isUsing: boolean
  onDeleteStart: (accountId: string) => void
  onRandomIp: () => Promise<string | null>
  onToggleExpanded: (accountId: string) => void
  onTogglePassword: (accountId: string) => void
  onUpdate: (accountId: string, input: UpdateAccountInput) => Promise<void>
  onUse: (accountId: string) => void
}

type AccountCardProps = AccountCardCreateProps | AccountCardStoredProps

type AccountFormField = 'username' | 'password' | 'ip'

const defaultEditDraft: AccountFormDraft = {
  universe: '1',
  username: '',
  password: '',
  ip: '',
  token: '',
}

const requiredAccountFields: AccountFormField[] = ['username', 'password', 'ip']

const accountValidityLabels = {
  unknown: '未知',
  valid: '有效',
  invalid: '无效',
} as const satisfies Record<AccountValidity, string>

const createAccountEditDraft = (account: AccountRecord): AccountFormDraft => ({
  universe: String(account.universe),
  username: account.username,
  password: account.password,
  ip: account.ip,
  token: account.token,
})

const createPasswordMask = (): string => '******'

const isAccountDraftFieldInvalid = (draft: AccountFormDraft, field: AccountFormField): boolean => {
  switch (field) {
    case 'username':
      return draft.username.trim().length === 0
    case 'password':
      return draft.password.length === 0
    case 'ip':
      return !isValidIPv4(draft.ip)
  }
}

const EyeIcon: Component<{ isOpen: boolean }> = (props) => (
  <svg
    class={styles.icon}
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

const CopyIcon: Component = () => (
  <svg
    class={styles.icon}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="8" y="8" width="11" height="11" rx="1.5" />
    <path d="M5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
)

const CheckIcon: Component = () => (
  <svg
    class={styles.icon}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export const AccountCard: Component<AccountCardProps> = (props) => {
  const [isEditing, setIsEditing] = createSignal(false)
  const [editDraft, setEditDraft] = createSignal<AccountFormDraft>(defaultEditDraft)
  const [isSavingEdit, setIsSavingEdit] = createSignal(false)
  const [isRandomizingIp, setIsRandomizingIp] = createSignal(false)
  const [hasCopiedToken, setHasCopiedToken] = createSignal(false)
  const [hasValidationAttempted, setHasValidationAttempted] = createSignal(false)
  let copyResetTimeout: ReturnType<typeof setTimeout> | undefined

  const storedAccount = (): AccountRecord | null =>
    props.mode === 'create' ? null : props.account
  const isFormMode = (): boolean => props.mode === 'create' || isEditing()
  const formDraft = (): AccountFormDraft => (props.mode === 'create' ? props.draft : editDraft())
  const isFormSaving = (): boolean => (props.mode === 'create' ? props.isSaving : isSavingEdit())
  const isIpBusy = (): boolean =>
    props.mode === 'create' ? props.isRandomizingIp || isRandomizingIp() : isRandomizingIp()
  const isCardBusy = (): boolean =>
    props.mode === 'create'
      ? props.isSaving || props.isExiting || isIpBusy()
      : isSavingEdit() || props.isDeletePending || isRandomizingIp()
  const isBodyExpanded = (): boolean => {
    if (props.mode === 'create') {
      return true
    }

    return isEditing() || props.isExpanded
  }
  const canToggleBody = (): boolean => {
    if (props.mode === 'create' || isEditing()) {
      return false
    }

    return !props.isUsePending && !isCardBusy()
  }
  const cardTitle = (): string => storedAccount()?.username || '新账号'
  const isFormFieldWarning = (field: AccountFormField): boolean =>
    hasValidationAttempted() && isAccountDraftFieldInvalid(formDraft(), field)
  const getFieldTone = (field: AccountFormField): 'warning' | undefined =>
    isFormFieldWarning(field) ? 'warning' : undefined
  const displayedPassword = (): string => {
    if (props.mode === 'create') {
      return ''
    }

    return props.isPasswordVisible ? props.account.password : createPasswordMask()
  }

  createEffect(() => {
    const account = storedAccount()

    if (account && !isEditing()) {
      setEditDraft(createAccountEditDraft(account))
    }
  })

  onCleanup(() => {
    if (copyResetTimeout) {
      clearTimeout(copyResetTimeout)
    }
  })

  const updateCurrentDraft = (value: Partial<AccountFormDraft>): void => {
    if (props.mode === 'create') {
      props.onChange(value)
      return
    }

    setEditDraft((currentDraft) => ({ ...currentDraft, ...value }))
  }

  const startEditing = (): void => {
    const account = storedAccount()

    if (!account) {
      return
    }

    setEditDraft(createAccountEditDraft(account))
    setHasValidationAttempted(false)
    setIsEditing(true)
  }

  const cancelEditing = (): void => {
    const account = storedAccount()

    if (!account) {
      return
    }

    setEditDraft(createAccountEditDraft(account))
    setHasValidationAttempted(false)
    setIsEditing(false)
  }

  const copyToken = (): void => {
    const account = storedAccount()

    if (!account?.token) {
      return
    }

    void (async () => {
      if (!navigator.clipboard) {
        return
      }

      await navigator.clipboard.writeText(account.token)
      setHasCopiedToken(true)

      if (copyResetTimeout) {
        clearTimeout(copyResetTimeout)
      }

      copyResetTimeout = setTimeout(() => setHasCopiedToken(false), 1200)
    })().catch(() => undefined)
  }

  const randomizeIp = (): void => {
    if (isCardBusy() || isIpBusy() || (props.mode !== 'create' && !isEditing())) {
      return
    }

    void (async () => {
      setIsRandomizingIp(true)

      try {
        const ip = await props.onRandomIp()

        if (ip) {
          updateCurrentDraft({ ip })
        }
      } catch {
        return
      } finally {
        setIsRandomizingIp(false)
      }
    })()
  }

  const submitStoredEdit = (event: SubmitEvent): void => {
    event.preventDefault()

    if (props.mode === 'create' || !isEditing() || isCardBusy()) {
      return
    }

    const draft = editDraft()

    if (requiredAccountFields.some((field) => isAccountDraftFieldInvalid(draft, field))) {
      setHasValidationAttempted(true)
      return
    }

    void (async () => {
      setIsSavingEdit(true)

      try {
        await props.onUpdate(props.account.id, {
          universe: Number(draft.universe),
          username: draft.username,
          password: draft.password,
          ip: draft.ip,
          token: draft.token,
        })
        setIsEditing(false)
        setHasValidationAttempted(false)
      } catch {
        return
      } finally {
        setIsSavingEdit(false)
      }
    })()
  }

  const submitCard = (event: SubmitEvent): void => {
    if (props.mode === 'create') {
      if (isCardBusy()) {
        event.preventDefault()
        return
      }

      const draft = formDraft()

      if (requiredAccountFields.some((field) => isAccountDraftFieldInvalid(draft, field))) {
        event.preventDefault()
        setHasValidationAttempted(true)
        return
      }

      props.onSubmit(event)
      return
    }

    submitStoredEdit(event)
  }

  const startDelete = (): void => {
    if (props.mode === 'create' || isCardBusy()) {
      return
    }

    props.onDeleteStart(props.account.id)
  }

  const toggleBody = (): void => {
    if (!canToggleBody()) {
      return
    }

    props.onToggleExpanded(props.account.id)
  }

  const handleHeaderKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    toggleBody()
  }

  const renderBadges = () => {
    if (props.mode === 'create') {
      return null
    }

    return (
      <div class={styles.badges}>
        <Show when={props.isActive}>
          <span class={`${styles.badge} ${styles.activeBadge}`}>当前</span>
        </Show>
        <span class={styles.badge} data-validity={props.account.validity}>
          {accountValidityLabels[props.account.validity]}
        </span>
      </div>
    )
  }

  const renderTokenRow = () => {
    return (
      <div class={styles.detail}>
        <dt class={styles.detailLabel}>Token</dt>
        <dd class={`${styles.detailValue} ${isFormMode() ? '' : styles.tokenValue}`}>
          <Show
            when={isFormMode()}
            fallback={
              <>
                <span class={styles.detailText}>{storedAccount()?.token || '未获取'}</span>
                <button
                  class={styles.iconButton}
                  type="button"
                  aria-label={hasCopiedToken() ? '已复制 Token' : '复制 Token'}
                  disabled={!storedAccount()?.token || isCardBusy()}
                  onClick={copyToken}
                >
                  <Show when={hasCopiedToken()} fallback={<CopyIcon />}>
                    <CheckIcon />
                  </Show>
                </button>
              </>
            }
          >
            <ControlInput
              class={`${styles.detailInput} ${styles.tokenInput}`}
              type="text"
              autocomplete="off"
              value={formDraft().token}
              disabled={isFormSaving()}
              onInput={(event) => updateCurrentDraft({ token: event.currentTarget.value })}
            />
          </Show>
        </dd>
      </div>
    )
  }

  const renderActions = () => {
    if (props.mode === 'create') {
      return (
        <>
          <ControlButton variant="primary" type="submit" disabled={isCardBusy()}>
            {props.isSaving ? '添加中' : '添加'}
          </ControlButton>
          <ControlButton type="button" disabled={isCardBusy()} onClick={props.onCancel}>
            取消
          </ControlButton>
        </>
      )
    }

    return (
      <Show
        when={isEditing()}
        fallback={
          <>
            <ControlButton
              variant="primary"
              type="button"
              disabled={props.isUsePending || isCardBusy()}
              onClick={() => props.onUse(props.account.id)}
            >
              {props.isUsing ? '使用中' : '使用'}
            </ControlButton>
            <ControlButton
              type="button"
              disabled={props.isUsePending || isCardBusy()}
              onClick={startEditing}
            >
              修改
            </ControlButton>
            <ControlButton
              type="button"
              disabled={props.isUsePending || isCardBusy()}
              onClick={startDelete}
            >
              {props.isDeletePending ? '删除中' : '删除'}
            </ControlButton>
          </>
        }
      >
        <ControlButton variant="primary" type="submit" disabled={isCardBusy()}>
          {isSavingEdit() ? '保存中' : '保存'}
        </ControlButton>
        <ControlButton type="button" disabled={isCardBusy()} onClick={cancelEditing}>
          取消
        </ControlButton>
        <ControlButton type="button" disabled={isCardBusy()} onClick={startDelete}>
          {props.isDeletePending ? '删除中' : '删除'}
        </ControlButton>
      </Show>
    )
  }

  return (
    <form class={styles.cardContent} aria-busy={isCardBusy()} onSubmit={submitCard}>
      <header
        class={styles.accountHeader}
        role={props.mode === 'create' ? undefined : 'button'}
        tabIndex={canToggleBody() ? 0 : undefined}
        aria-expanded={props.mode === 'create' ? undefined : isBodyExpanded()}
        data-clickable={canToggleBody() ? 'true' : 'false'}
        onClick={toggleBody}
        onKeyDown={handleHeaderKeyDown}
      >
        <div class={styles.accountHeading}>
          <h2 class={styles.accountName}>{cardTitle()}</h2>
        </div>

        {renderBadges()}
      </header>

      <div
        class={styles.accountBody}
        data-expanded={isBodyExpanded() ? 'true' : 'false'}
        aria-hidden={isBodyExpanded() ? undefined : 'true'}
        inert={isBodyExpanded() ? undefined : true}
      >
        <div class={styles.accountBodyInner}>
          <dl class={styles.detailList}>
            <div class={styles.detail}>
              <dt class={styles.detailLabel}>宇宙</dt>
              <dd class={styles.detailValue}>
                <Show
                  when={isFormMode()}
                  fallback={<span class={styles.detailText}>{storedAccount()?.universe}</span>}
                >
                  <ControlInput
                    class={styles.detailInput}
                    type="number"
                    min="1"
                    step="1"
                    value={formDraft().universe}
                    disabled={isFormSaving()}
                    aria-label="宇宙"
                    onInput={(event) => updateCurrentDraft({ universe: event.currentTarget.value })}
                  />
                </Show>
              </dd>
            </div>

            <div class={styles.detail}>
              <dt class={styles.detailLabel}>用户名</dt>
              <dd class={styles.detailValue}>
                <Show
                  when={isFormMode()}
                  fallback={<span class={styles.detailText}>{storedAccount()?.username}</span>}
                >
                  <ControlInput
                    class={styles.detailInput}
                    tone={getFieldTone('username')}
                    type="text"
                    autocomplete="username"
                    value={formDraft().username}
                    disabled={isFormSaving()}
                    aria-label="用户名"
                    onInput={(event) => updateCurrentDraft({ username: event.currentTarget.value })}
                  />
                </Show>
              </dd>
            </div>

            <div class={styles.detail}>
              <dt class={styles.detailLabel}>密码</dt>
              <dd class={`${styles.detailValue} ${isFormMode() ? '' : styles.secretValue}`}>
                <Show
                  when={isFormMode()}
                  fallback={
                    <>
                      <span class={`${styles.detailText} ${styles.secretText}`}>
                        {displayedPassword()}
                      </span>
                      <Show when={props.mode !== 'create'}>
                        <button
                          class={styles.iconButton}
                          type="button"
                          aria-label={props.mode !== 'create' && props.isPasswordVisible ? '隐藏密码' : '显示密码'}
                          disabled={isCardBusy()}
                          onClick={() => {
                            if (props.mode !== 'create') {
                              props.onTogglePassword(props.account.id)
                            }
                          }}
                        >
                          <EyeIcon isOpen={props.mode !== 'create' && props.isPasswordVisible} />
                        </button>
                      </Show>
                    </>
                  }
                >
                  <ControlInput
                    class={styles.detailInput}
                    tone={getFieldTone('password')}
                    type="password"
                    autocomplete="current-password"
                    value={formDraft().password}
                    disabled={isFormSaving()}
                    aria-label="密码"
                    onInput={(event) => updateCurrentDraft({ password: event.currentTarget.value })}
                  />
                </Show>
              </dd>
            </div>

            <div class={styles.detail}>
              <dt class={styles.detailLabel}>IP</dt>
              <dd class={`${styles.detailValue} ${isFormMode() ? styles.ipEditor : ''}`}>
                <Show
                  when={isFormMode()}
                  fallback={<span class={styles.detailText}>{storedAccount()?.ip}</span>}
                >
                  <>
                    <ControlInput
                      class={styles.detailInput}
                      tone={getFieldTone('ip')}
                      type="text"
                      inputmode="numeric"
                      value={formDraft().ip}
                      disabled={isFormSaving()}
                      aria-label="IP"
                      onInput={(event) => updateCurrentDraft({ ip: event.currentTarget.value })}
                    />
                    <button
                      class={styles.iconButton}
                      type="button"
                      aria-label="随机 IP"
                      title="随机 IP"
                      disabled={isFormSaving() || isIpBusy()}
                      onClick={randomizeIp}
                    >
                      <DiceIcon class={styles.icon} />
                    </button>
                  </>
                </Show>
              </dd>
            </div>

            {renderTokenRow()}
          </dl>

          <footer class={styles.cardActions}>{renderActions()}</footer>
        </div>
      </div>
    </form>
  )
}
