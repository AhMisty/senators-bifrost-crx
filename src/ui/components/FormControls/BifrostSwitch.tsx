import styles from './FormControls.module.css'

import { createUniqueId, splitProps, type Component, type JSX } from 'solid-js'

type BifrostSwitchProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'children' | 'onChange' | 'type'
> & {
  checkedLabel?: JSX.Element
  uncheckedLabel?: JSX.Element
  onChange?: (checked: boolean, event: Event) => void
}

export const BifrostSwitch: Component<BifrostSwitchProps> = (props) => {
  const fallbackId = createUniqueId()
  const [localProps, inputProps] = splitProps(props, [
    'checked',
    'checkedLabel',
    'class',
    'disabled',
    'id',
    'onChange',
    'uncheckedLabel',
  ])
  const controlId = (): string => localProps.id ?? fallbackId
  const isDisabled = (): boolean => Boolean(localProps.disabled)

  return (
    <span
      class={`${styles.switch} ${localProps.class ?? ''}`.trim()}
      data-disabled={isDisabled() ? 'true' : 'false'}
    >
      <span class={styles.switchStatus}>
        {localProps.checked
          ? (localProps.checkedLabel ?? '开')
          : (localProps.uncheckedLabel ?? '关')}
      </span>

      <label
        class={styles.switchControl}
        data-disabled={isDisabled() ? 'true' : 'false'}
        for={controlId()}
      >
        <input
          {...inputProps}
          id={controlId()}
          class={styles.switchInput}
          type="checkbox"
          checked={localProps.checked}
          disabled={localProps.disabled}
          onChange={(event) => localProps.onChange?.(event.currentTarget.checked, event)}
        />
        <span class={styles.switchTrack} aria-hidden="true">
          <span class={styles.switchThumb} />
        </span>
      </label>
    </span>
  )
}
