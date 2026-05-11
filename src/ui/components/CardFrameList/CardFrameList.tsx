import styles from './CardFrameList.module.css'

import {
  createEffect,
  createSignal,
  onCleanup,
  splitProps,
  type Component,
  type JSX,
} from 'solid-js'

import { CardFrame } from '@/ui/components/CardFrame'
import { motionDurationMs } from '@/ui/utils/motion'

export type CardFrameListItemMotion = 'float' | 'collapse'
export type CardFrameListItemControlledState = 'entering' | 'visible' | 'exiting'
type CardFrameListItemState = CardFrameListItemControlledState | 'exited'
const exitAnimationFallbackMs = motionDurationMs.collapse

type CardFrameListProps = {
  children: JSX.Element
  class?: string
}

type CardFrameListItemProps = {
  children: JSX.Element
  enterIndex?: number
  motion?: CardFrameListItemMotion
  state?: CardFrameListItemControlledState
  class?: string
  onEnterEnd?: () => void
  onExitEnd?: () => void
}

export const CardFrameListMotionItem: Component<CardFrameListItemProps> = (props) => {
  let lastControlledState: CardFrameListItemControlledState | undefined = props.state
  const motion = (): CardFrameListItemMotion => props.motion ?? 'float'
  const [state, setState] = createSignal<CardFrameListItemState>(props.state ?? 'entering')
  const enterIndex = props.enterIndex ?? 0

  const completeExit = (): void => {
    if (state() !== 'exiting') {
      return
    }

    setState('exited')
    props.onExitEnd?.()
  }

  const completeTransition = (event: AnimationEvent): void => {
    if (event.currentTarget !== event.target) {
      return
    }

    const currentState = state()

    if (currentState === 'entering') {
      setState('visible')
      props.onEnterEnd?.()
      return
    }

    if (currentState === 'exiting') {
      completeExit()
    }
  }

  const handleRootAnimationEnd = (event: AnimationEvent): void => {
    if (motion() !== 'collapse') {
      return
    }

    completeTransition(event)
  }

  const handleSurfaceAnimationEnd = (event: AnimationEvent): void => {
    if (motion() !== 'float') {
      return
    }

    completeTransition(event)
  }

  createEffect(() => {
    const controlledState = props.state

    if (controlledState && controlledState !== lastControlledState) {
      lastControlledState = controlledState
      setState(controlledState)
    }
  })

  createEffect(() => {
    if (state() !== 'exiting') {
      return
    }

    const fallbackTimer = setTimeout(completeExit, exitAnimationFallbackMs)

    onCleanup(() => clearTimeout(fallbackTimer))
  })

  return (
    <div
      class={`${styles.item} ${props.class ?? ''}`}
      data-motion={motion()}
      data-state={state()}
      onAnimationEnd={handleRootAnimationEnd}
      style={{ '--card-frame-list-enter-index': `${enterIndex}` }}
    >
      <div class={styles.itemSurface} onAnimationEnd={handleSurfaceAnimationEnd}>
        {props.children}
      </div>
    </div>
  )
}

export const CardFrameListItem: Component<CardFrameListItemProps> = (props) => (
  <CardFrameListMotionItem
    class={props.class}
    enterIndex={props.enterIndex}
    motion={props.motion}
    state={props.state}
    onEnterEnd={props.onEnterEnd}
    onExitEnd={props.onExitEnd}
  >
    <CardFrame class="w-full">{props.children}</CardFrame>
  </CardFrameListMotionItem>
)

export const CardFrameList: Component<CardFrameListProps> = (props) => {
  const [localProps] = splitProps(props, ['children', 'class'])

  return <section class={`${styles.root} ${localProps.class ?? ''}`}>{localProps.children}</section>
}
