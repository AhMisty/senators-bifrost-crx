import type { Component } from 'solid-js'

type IconProps = {
  class?: string
}

export const DiceIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M8.8 3.8h6.9a2.2 2.2 0 0 1 2.2 2.2v6.9"
      opacity="0.62"
    />
    <circle cx="12.1" cy="7.1" r="0.72" fill="currentColor" stroke="none" opacity="0.62" />
    <circle cx="15.2" cy="10.2" r="0.72" fill="currentColor" stroke="none" opacity="0.62" />
    <rect x="4.6" y="8.4" width="11.8" height="11.8" rx="2.1" />
    <circle cx="8.2" cy="12" r="0.78" fill="currentColor" stroke="none" />
    <circle cx="12.8" cy="12" r="0.78" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="14.3" r="0.78" fill="currentColor" stroke="none" />
    <circle cx="8.2" cy="16.6" r="0.78" fill="currentColor" stroke="none" />
    <circle cx="12.8" cy="16.6" r="0.78" fill="currentColor" stroke="none" />
  </svg>
)
