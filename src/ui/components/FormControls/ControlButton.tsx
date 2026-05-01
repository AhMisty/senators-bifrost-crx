import styles from './FormControls.module.css'

import { splitProps, type Component, type JSX } from 'solid-js'

type ControlButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: JSX.Element
  variant?: 'primary' | 'secondary'
}

export const ControlButton: Component<ControlButtonProps> = (props) => {
  const [localProps, buttonProps] = splitProps(props, ['children', 'class', 'type', 'variant'])
  const variantClass = localProps.variant === 'primary' ? styles.buttonPrimary : ''

  return (
    <button
      {...buttonProps}
      type={localProps.type ?? 'button'}
      class={`${styles.button} ${variantClass} ${localProps.class ?? ''}`.trim()}
    >
      {localProps.children}
    </button>
  )
}
