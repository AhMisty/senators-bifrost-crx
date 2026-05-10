import styles from './ScrollArea.module.css'

import { splitProps, type Component, type JSX } from 'solid-js'

type ScrollAreaProps = {
  class?: string
  contentClass?: string
  children: JSX.Element
}

export const ScrollArea: Component<ScrollAreaProps> = (props) => {
  const [localProps] = splitProps(props, ['children', 'class', 'contentClass'])

  return (
    <div class={`${styles.root} ${localProps.class ?? ''}`}>
      <div class={styles.viewport}>
        <div class={`${styles.content} ${localProps.contentClass ?? ''}`}>
          {localProps.children}
        </div>
      </div>
    </div>
  )
}
