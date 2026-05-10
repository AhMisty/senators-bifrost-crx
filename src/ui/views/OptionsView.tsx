import styles from './OptionsView.module.css'

import { Show, createEffect, createSignal, onMount, type Component } from 'solid-js'

import {
  CardFrameList,
  CardFrameListItem,
  CardFrameListMotionItem,
  type CardFrameListItemControlledState,
} from '@/ui/components/CardFrameList'
import { ControlButton, ControlInput } from '@/ui/components/FormControls'
import {
  defaultConnectionOptions,
  loadConnectionOptions,
  sanitizeConnectionOptions,
  saveConnectionOptions,
  type ConnectionOptions,
} from '@/shared/connectionOptions'

export const OptionsView: Component = () => {
  const [savedOptions, setSavedOptions] = createSignal<ConnectionOptions>(defaultConnectionOptions)
  const [draftOptions, setDraftOptions] = createSignal<ConnectionOptions>(defaultConnectionOptions)
  const [isReady, setIsReady] = createSignal(false)
  const [isEditing, setIsEditing] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const [isOriginFieldMounted, setIsOriginFieldMounted] = createSignal(
    draftOptions().isGameAddressProxyAddress,
  )

  onMount(() => {
    void (async () => {
      try {
        const options = await loadConnectionOptions()
        setSavedOptions(options)
        setDraftOptions(options)
      } catch {
        return
      } finally {
        setIsReady(true)
      }
    })()
  })

  const updateDraft = (options: Partial<ConnectionOptions>): void => {
    setDraftOptions((currentOptions) => ({ ...currentOptions, ...options }))
  }

  const isBlank = (value: string): boolean => value.trim().length === 0
  const isGameAddressInvalid = (): boolean => isBlank(draftOptions().gameAddress)
  const isOriginAddressInvalid = (): boolean =>
    draftOptions().isGameAddressProxyAddress && isBlank(draftOptions().originAddress)
  const getGameAddressTone = (): 'warning' | undefined =>
    isGameAddressInvalid() ? 'warning' : undefined
  const getOriginAddressTone = (): 'warning' | undefined =>
    isOriginAddressInvalid() ? 'warning' : undefined

  createEffect(() => {
    if (draftOptions().isGameAddressProxyAddress) {
      setIsOriginFieldMounted(true)
    }
  })

  const originFieldState = (): CardFrameListItemControlledState =>
    draftOptions().isGameAddressProxyAddress ? 'entering' : 'exiting'

  const finishOriginFieldExit = (): void => {
    if (!draftOptions().isGameAddressProxyAddress) {
      setIsOriginFieldMounted(false)
    }
  }

  const startEditing = (): void => {
    setDraftOptions(savedOptions())
    setIsEditing(true)
  }

  const cancelEditing = (): void => {
    setDraftOptions(savedOptions())
    setIsEditing(false)
  }

  const submitOptions = (event: SubmitEvent): void => {
    event.preventDefault()

    if (!isEditing()) {
      return
    }

    void (async () => {
      const currentOptions = draftOptions()

      if (
        isBlank(currentOptions.gameAddress) ||
        (currentOptions.isGameAddressProxyAddress && isBlank(currentOptions.originAddress))
      ) {
        return
      }

      setIsSaving(true)

      try {
        const nextOptions = sanitizeConnectionOptions(currentOptions)

        await saveConnectionOptions(nextOptions)
        setSavedOptions(nextOptions)
        setDraftOptions(nextOptions)
        setIsEditing(false)
      } catch {
        return
      } finally {
        setIsSaving(false)
      }
    })()
  }

  return (
    <main class="flex w-full flex-col">
      <CardFrameList class={`${styles.cardList} mx-auto w-full max-w-screen-lg`}>
        <CardFrameListItem>
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
                    tone={getGameAddressTone()}
                    aria-invalid={isGameAddressInvalid() ? 'true' : 'false'}
                    disabled={!isEditing() || isSaving()}
                    onInput={(event) => updateDraft({ gameAddress: event.currentTarget.value })}
                  />
                </label>

                <label
                  class={styles.field}
                  data-control="checkbox"
                  data-disabled={!isEditing() || isSaving() ? 'true' : 'false'}
                >
                  <span class={styles.fieldLabel}>是否为代理地址</span>
                  <input
                    class={styles.checkbox}
                    type="checkbox"
                    checked={draftOptions().isGameAddressProxyAddress}
                    disabled={!isEditing() || isSaving()}
                    onChange={(event) =>
                      updateDraft({ isGameAddressProxyAddress: event.currentTarget.checked })
                    }
                  />
                </label>

                <Show when={isOriginFieldMounted()}>
                  <CardFrameListMotionItem
                    class={styles.originFieldSlot}
                    motion="collapse"
                    state={originFieldState()}
                    onExitEnd={finishOriginFieldExit}
                  >
                    <label
                      class={styles.field}
                      data-control="input"
                      data-disabled={
                        !isEditing() || isSaving() || !draftOptions().isGameAddressProxyAddress
                          ? 'true'
                          : 'false'
                      }
                    >
                      <span class={styles.fieldLabel}>源地址</span>
                      <ControlInput
                        type="url"
                        inputmode="url"
                        autocomplete="url"
                        placeholder="https://"
                        value={draftOptions().originAddress}
                        tone={getOriginAddressTone()}
                        aria-invalid={isOriginAddressInvalid() ? 'true' : 'false'}
                        disabled={
                          !isEditing() || isSaving() || !draftOptions().isGameAddressProxyAddress
                        }
                        onInput={(event) =>
                          updateDraft({ originAddress: event.currentTarget.value })
                        }
                      />
                    </label>
                  </CardFrameListMotionItem>
                </Show>
              </div>

              <div class={styles.formFooter}>
                <div class={styles.actions}>
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
        </CardFrameListItem>
      </CardFrameList>
    </main>
  )
}
