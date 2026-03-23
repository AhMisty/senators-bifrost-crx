import { type Component } from 'solid-js'

import { IlluminatorButton } from '@/ui/components/IlluminatorButton/IlluminatorButton'

const OptionsDocumentIcon: Component = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M7 3.75H14.5L18 7.25V20.25H7V3.75Z"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linejoin="round"
    />
    <path d="M14 3.75V7.75H18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
    <path d="M9.25 11.25H15.75" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    <path d="M9.25 14.75H15.75" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
  </svg>
)

export const OptionsView: Component = () => (
  <main class="absolute inset-0 grid place-items-center overflow-hidden p-6 sm:p-8">
    <IlluminatorButton title="Docs placeholder button">
      <OptionsDocumentIcon />
      <span>Docs</span>
    </IlluminatorButton>
  </main>
)
