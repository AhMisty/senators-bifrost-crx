import styles from './OptionsView.module.css'

import {
  For,
  Show,
  children as resolveChildren,
  createSignal,
  onMount,
  type Component,
  type JSX,
} from 'solid-js'

import { CardFrame } from '@/ui/components/CardFrame'
import { ControlButton, ControlInput, ControlSwitch } from '@/ui/components/FormControls'
import {
  defaultConnectionOptions,
  loadConnectionOptions,
  sanitizeConnectionOptions,
  saveConnectionOptions,
  type ConnectionOptions,
} from '@/shared/connectionOptions'

type OptionsCardFrameProps = {
  children: JSX.Element
  enterIndex: number
}

type OptionsCardListProps = {
  children: JSX.Element
}

const OptionsCardFrame: Component<OptionsCardFrameProps> = (props) => {
  const [hasEntered, setHasEntered] = createSignal(false)

  const completeEnter = (event: AnimationEvent): void => {
    if (event.currentTarget !== event.target) {
      return
    }

    setHasEntered(true)
  }

  return (
    <div
      class={styles.cardItem}
      data-entered={hasEntered() ? 'true' : 'false'}
      onAnimationEnd={completeEnter}
      style={{ '--options-card-enter-index': `${props.enterIndex}` }}
    >
      <CardFrame class="w-full">{props.children}</CardFrame>
    </div>
  )
}

const OptionsCardList: Component<OptionsCardListProps> = (props) => {
  const cardItems = resolveChildren(() => props.children)

  return (
    <section class={`${styles.cardList} mx-auto flex w-full max-w-screen-lg flex-col`}>
      <For each={cardItems.toArray()}>
        {(cardItem, index) => <OptionsCardFrame enterIndex={index()}>{cardItem}</OptionsCardFrame>}
      </For>
    </section>
  )
}

export const OptionsView: Component = () => {
  const [savedOptions, setSavedOptions] = createSignal<ConnectionOptions>(defaultConnectionOptions)
  const [draftOptions, setDraftOptions] = createSignal<ConnectionOptions>(defaultConnectionOptions)
  const [isReady, setIsReady] = createSignal(false)
  const [isEditing, setIsEditing] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const [feedback, setFeedback] = createSignal('')

  onMount(() => {
    void (async () => {
      try {
        const options = await loadConnectionOptions()
        setSavedOptions(options)
        setDraftOptions(options)
      } catch {
        setFeedback('配置加载失败，请重新保存')
      }

      setIsReady(true)
    })()
  })

  const updateDraft = (options: Partial<ConnectionOptions>): void => {
    setDraftOptions((currentOptions) => ({ ...currentOptions, ...options }))
  }

  const startEditing = (): void => {
    setDraftOptions(savedOptions())
    setFeedback('')
    setIsEditing(true)
  }

  const cancelEditing = (): void => {
    setDraftOptions(savedOptions())
    setFeedback('')
    setIsEditing(false)
  }

  const submitOptions = (event: SubmitEvent): void => {
    event.preventDefault()

    if (!isEditing()) {
      return
    }

    void (async () => {
      const nextOptions = sanitizeConnectionOptions(draftOptions())

      setIsSaving(true)
      setFeedback('')

      try {
        await saveConnectionOptions(nextOptions)
        setSavedOptions(nextOptions)
        setDraftOptions(nextOptions)
        setIsEditing(false)
        setFeedback('已保存')
      } catch {
        setFeedback('保存失败，请重试')
      } finally {
        setIsSaving(false)
      }
    })()
  }

  return (
    <main class="flex w-full flex-col">
      <OptionsCardList>
        <div class={styles.cardContent}>
          <h1 class={styles.title}>连接配置</h1>

          <form
            class={styles.form}
            aria-busy={isSaving() ? 'true' : 'false'}
            onSubmit={submitOptions}
          >
            <div class={styles.fieldGroup}>
              <label
                class={styles.field}
                data-control="input"
                data-disabled={!isEditing() || isSaving() ? 'true' : 'false'}
              >
                <span class={styles.fieldLabel}>游戏地址</span>
                <ControlInput
                  type="url"
                  inputmode="url"
                  autocomplete="url"
                  placeholder="https://"
                  value={draftOptions().gameAddress}
                  disabled={!isEditing() || isSaving()}
                  onInput={(event) => updateDraft({ gameAddress: event.currentTarget.value })}
                />
              </label>

              <div
                class={styles.field}
                data-control="switch"
                data-disabled={!isEditing() || isSaving() ? 'true' : 'false'}
              >
                <span class={styles.fieldLabel}>是否为代理地址</span>
                <ControlSwitch
                  aria-label="是否为代理地址"
                  checked={draftOptions().isGameAddressProxyAddress}
                  disabled={!isEditing() || isSaving()}
                  onChange={(checked) => updateDraft({ isGameAddressProxyAddress: checked })}
                />
              </div>

              <Show when={draftOptions().isGameAddressProxyAddress}>
                <label
                  class={`${styles.field} ${styles.originField}`}
                  data-control="input"
                  data-disabled={!isEditing() || isSaving() ? 'true' : 'false'}
                >
                  <span class={styles.fieldLabel}>源地址</span>
                  <ControlInput
                    type="url"
                    inputmode="url"
                    autocomplete="url"
                    placeholder="https://"
                    value={draftOptions().originAddress}
                    disabled={!isEditing() || isSaving()}
                    onInput={(event) => updateDraft({ originAddress: event.currentTarget.value })}
                  />
                </label>
              </Show>
            </div>

            <div class={styles.formFooter}>
              <div class={styles.actions}>
                <div class={styles.feedback} aria-live="polite">
                  {feedback()}
                </div>

                <Show
                  when={isEditing()}
                  fallback={
                    <ControlButton
                      variant="primary"
                      type="button"
                      disabled={!isReady()}
                      onClick={startEditing}
                    >
                      配置
                    </ControlButton>
                  }
                >
                  <ControlButton variant="primary" type="submit" disabled={isSaving()}>
                    {isSaving() ? '保存中' : '保存'}
                  </ControlButton>
                  <ControlButton type="button" disabled={isSaving()} onClick={cancelEditing}>
                    取消
                  </ControlButton>
                </Show>
              </div>
            </div>
          </form>
        </div>
      </OptionsCardList>
    </main>
  )
}
