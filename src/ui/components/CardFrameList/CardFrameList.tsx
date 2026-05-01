import styles from './CardFrameList.module.css'

import { createSignal, splitProps, type Component, type JSX } from 'solid-js'

import { CardFrame } from '@/ui/components/CardFrame'

type CardFrameListProps = {
  children: JSX.Element
  class?: string
}

type CardFrameListItemProps = {
  children: JSX.Element
  enterIndex?: number
  class?: string
}

export const CardFrameListItem: Component<CardFrameListItemProps> = (props) => {
  const [hasEntered, setHasEntered] = createSignal(false)

  const completeEnter = (event: AnimationEvent): void => {
    if (event.currentTarget !== event.target) {
      return
    }

    setHasEntered(true)
  }

  return (
    <div
      class={`${styles.item} ${props.class ?? ''}`}
      data-entered={hasEntered() ? 'true' : 'false'}
      onAnimationEnd={completeEnter}
      style={{ '--card-frame-list-enter-index': `${props.enterIndex ?? 0}` }}
    >
      <CardFrame class="w-full">{props.children}</CardFrame>
    </div>
  )
}

export const CardFrameList: Component<CardFrameListProps> = (props) => {
  const [localProps] = splitProps(props, ['children', 'class'])

  return <section class={`${styles.root} ${localProps.class ?? ''}`}>{localProps.children}</section>
}
