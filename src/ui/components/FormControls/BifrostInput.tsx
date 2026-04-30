import styles from './FormControls.module.css'

import { splitProps, type Component, type JSX } from 'solid-js'

type BifrostInputProps = JSX.InputHTMLAttributes<HTMLInputElement>

export const BifrostInput: Component<BifrostInputProps> = (props) => {
  const [localProps, inputProps] = splitProps(props, ['class'])

  return <input {...inputProps} class={`${styles.input} ${localProps.class ?? ''}`.trim()} />
}
