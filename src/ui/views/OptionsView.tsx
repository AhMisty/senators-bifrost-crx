import styles from './OptionsView.module.css'

import { Show, createSignal, onMount, type Component, type JSX } from 'solid-js'

import { CardFrame } from '@/ui/components/CardFrame'
import { BifrostButton, BifrostInput, BifrostSwitch } from '@/ui/components/FormControls'
import {
  defaultBifrostOptions,
  loadBifrostOptions,
  sanitizeBifrostOptions,
  saveBifrostOptions,
  type BifrostOptions,
} from '@/shared/bifrostOptions'

type OptionsCardFrameProps = {
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
    >
      <CardFrame class="w-full">{props.children}</CardFrame>
    </div>
  )
}

export const OptionsView: Component = () => {
  const [savedOptions, setSavedOptions] = createSignal<BifrostOptions>(defaultBifrostOptions)
  const [draftOptions, setDraftOptions] = createSignal<BifrostOptions>(defaultBifrostOptions)
  const [isReady, setIsReady] = createSignal(false)
  const [isEditing, setIsEditing] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const [feedback, setFeedback] = createSignal('')

  onMount(() => {
    void (async () => {
      try {
        const options = await loadBifrostOptions()
        setSavedOptions(options)
        setDraftOptions(options)
      } catch {
        setFeedback('配置加载失败，请重新保存')
      }

      setIsReady(true)
    })()
  })

  const updateDraft = (options: Partial<BifrostOptions>): void => {
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
      const nextOptions = sanitizeBifrostOptions(draftOptions())

      setIsSaving(true)
      setFeedback('')

      try {
        await saveBifrostOptions(nextOptions)
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
      <section class={`${styles.cardList} mx-auto flex w-full max-w-screen-lg flex-col`}>
        <OptionsCardFrame>
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
                  <BifrostInput
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
                  <span class={styles.fieldLabel}>是否加速</span>
                  <BifrostSwitch
                    aria-label="是否加速"
                    checked={draftOptions().isAccelerationEnabled}
                    disabled={!isEditing() || isSaving()}
                    onChange={(checked) => updateDraft({ isAccelerationEnabled: checked })}
                  />
                </div>

                <Show when={draftOptions().isAccelerationEnabled}>
                  <label
                    class={`${styles.field} ${styles.accelerationField}`}
                    data-control="input"
                    data-disabled={!isEditing() || isSaving() ? 'true' : 'false'}
                  >
                    <span class={styles.fieldLabel}>加速地址</span>
                    <BifrostInput
                      type="url"
                      inputmode="url"
                      autocomplete="url"
                      placeholder="https://"
                      value={draftOptions().accelerationAddress}
                      disabled={!isEditing() || isSaving()}
                      onInput={(event) =>
                        updateDraft({ accelerationAddress: event.currentTarget.value })
                      }
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
                      <BifrostButton
                        variant="primary"
                        type="button"
                        disabled={!isReady()}
                        onClick={startEditing}
                      >
                        配置
                      </BifrostButton>
                    }
                  >
                    <BifrostButton variant="primary" type="submit" disabled={isSaving()}>
                      {isSaving() ? '保存中' : '保存'}
                    </BifrostButton>
                    <BifrostButton type="button" disabled={isSaving()} onClick={cancelEditing}>
                      取消
                    </BifrostButton>
                  </Show>
                </div>
              </div>
            </form>
          </div>
        </OptionsCardFrame>
      </section>
    </main>
  )
}
