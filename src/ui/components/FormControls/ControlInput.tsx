import styles from './FormControls.module.css'

import { splitProps, type Component, type JSX } from 'solid-js'

type ControlInputTone = 'default' | 'warning'

type ControlInputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  tone?: ControlInputTone
}

export const ControlInput: Component<ControlInputProps> = (props) => {
  const [localProps, inputProps] = splitProps(props, ['class', 'tone'])

  return (
    <input
      {...inputProps}
      data-tone={localProps.tone ?? 'default'}
      class={`${styles.input} ${localProps.class ?? ''}`.trim()}
    />
  )
}
