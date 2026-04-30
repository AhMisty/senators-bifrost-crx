import 'overlayscrollbars/overlayscrollbars.css'
import styles from './ScrollArea.module.css'

import type { EventListeners, OverlayScrollbars, PartialOptions } from 'overlayscrollbars'
import { createOverlayScrollbars } from 'overlayscrollbars-solid'
import { createSignal, onMount, splitProps, type Component, type JSX } from 'solid-js'

const scrollAreaOptions: PartialOptions = {
  overflow: {
    x: 'hidden',
    y: 'scroll',
  },
  scrollbars: {
    theme: 'os-theme-bifrost',
    visibility: 'auto',
    autoHide: 'never',
    dragScroll: true,
    clickScroll: true,
  },
}

type ScrollAreaProps = {
  class?: string
  contentClass?: string
  children: JSX.Element
}

export const ScrollArea: Component<ScrollAreaProps> = (props) => {
  let viewportElement: HTMLDivElement | undefined
  let scrollbarSlotElement: HTMLDivElement | undefined
  const [localProps] = splitProps(props, ['children', 'class', 'contentClass'])
  const [hasVerticalOverflow, setHasVerticalOverflow] = createSignal(false)

  const syncOverflowState = (instance: OverlayScrollbars): void => {
    setHasVerticalOverflow(instance.state().hasOverflow.y)
  }

  const scrollAreaEvents: EventListeners = {
    initialized: syncOverflowState,
    updated: syncOverflowState,
  }

  const [initializeScrollbars] = createOverlayScrollbars({
    options: scrollAreaOptions,
    events: scrollAreaEvents,
    defer: true,
  })

  onMount(() => {
    if (!viewportElement || !scrollbarSlotElement) {
      return
    }

    initializeScrollbars({
      target: viewportElement,
      scrollbars: {
        slot: scrollbarSlotElement,
      },
    })
  })

  return (
    <div
      class={`${styles.root} ${localProps.class ?? ''}`}
      data-overflow-y={hasVerticalOverflow() ? 'true' : 'false'}
    >
      <div
        ref={(element) => {
          viewportElement = element
        }}
        class={styles.viewport}
        data-overlayscrollbars-initialize=""
      >
        <div class={`${styles.content} ${localProps.contentClass ?? ''}`}>
          {localProps.children}
        </div>
      </div>
      <div
        ref={(element) => {
          scrollbarSlotElement = element
        }}
        class={styles.rail}
        aria-hidden="true"
      />
    </div>
  )
}
