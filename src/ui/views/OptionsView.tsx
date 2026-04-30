import styles from './OptionsView.module.css'

import { Show, createSignal, onMount, type Component } from 'solid-js'

import { CardFrame } from '@/ui/components/CardFrame'
import {
  defaultBifrostOptions,
  loadBifrostOptions,
  sanitizeBifrostOptions,
  saveBifrostOptions,
  type BifrostOptions,
} from '@/shared/bifrostOptions'

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
    <main class="flex w-full flex-col gap-8 md:gap-12">
      <section class="mx-auto flex w-full max-w-screen-lg flex-col">
        <CardFrame class="w-full">
          <div class={styles.cardContent}>
            <h1 class={styles.title}>连接配置</h1>

            <form class={styles.form} onSubmit={submitOptions}>
              <div class={styles.fieldGroup}>
                <label class={styles.field}>
                  <span class={styles.fieldLabel}>游戏地址</span>
                  <input
                    class={styles.input}
                    type="url"
                    inputmode="url"
                    autocomplete="url"
                    placeholder="https://"
                    value={draftOptions().gameAddress}
                    disabled={!isEditing() || isSaving()}
                    onInput={(event) => updateDraft({ gameAddress: event.currentTarget.value })}
                  />
                </label>

                <label class={styles.field}>
                  <span class={styles.fieldLabel}>是否加速</span>
                  <span class={styles.switchValue}>
                    <span class={styles.switchControl}>
                      <input
                        class={styles.switchInput}
                        type="checkbox"
                        checked={draftOptions().isAccelerationEnabled}
                        disabled={!isEditing() || isSaving()}
                        onChange={(event) =>
                          updateDraft({ isAccelerationEnabled: event.currentTarget.checked })
                        }
                      />
                      <span class={styles.switchTrack} aria-hidden="true">
                        <span class={styles.switchThumb} />
                      </span>
                    </span>
                    <span class={styles.switchStatus}>
                      {draftOptions().isAccelerationEnabled ? '开' : '关'}
                    </span>
                  </span>
                </label>

                <Show when={draftOptions().isAccelerationEnabled}>
                  <label class={styles.field}>
                    <span class={styles.fieldLabel}>加速地址</span>
                    <input
                      class={styles.input}
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
                <div class={styles.feedback} aria-live="polite">
                  {feedback()}
                </div>

                <div class={styles.actions}>
                  <Show
                    when={isEditing()}
                    fallback={
                      <button
                        class={`${styles.button} ${styles.buttonPrimary}`}
                        type="button"
                        disabled={!isReady()}
                        onClick={startEditing}
                      >
                        配置
                      </button>
                    }
                  >
                    <button
                      class={`${styles.button} ${styles.buttonPrimary}`}
                      type="submit"
                      disabled={isSaving()}
                    >
                      保存
                    </button>
                    <button
                      class={styles.button}
                      type="button"
                      disabled={isSaving()}
                      onClick={cancelEditing}
                    >
                      取消
                    </button>
                  </Show>
                </div>
              </div>
            </form>
          </div>
        </CardFrame>
      </section>
    </main>
  )
}
