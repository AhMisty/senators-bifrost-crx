import styles from './FormControls.module.css'

import { splitProps, type Component, type JSX } from 'solid-js'

type ControlInputProps = JSX.InputHTMLAttributes<HTMLInputElement>

export const ControlInput: Component<ControlInputProps> = (props) => {
  const [localProps, inputProps] = splitProps(props, ['class'])

  return <input {...inputProps} class={`${styles.input} ${localProps.class ?? ''}`.trim()} />
}
