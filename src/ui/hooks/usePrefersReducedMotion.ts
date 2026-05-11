import { createSignal, onCleanup, onMount } from 'solid-js'

import { reducedMotionMediaQuery } from '@/ui/utils/motion'

const getInitialPreference = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(reducedMotionMediaQuery).matches

export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(getInitialPreference())

  onMount(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(reducedMotionMediaQuery)
    const syncPreference = (): void => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    syncPreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncPreference)

      onCleanup(() => mediaQuery.removeEventListener('change', syncPreference))
      return
    }

    mediaQuery.addListener(syncPreference)
    onCleanup(() => mediaQuery.removeListener(syncPreference))
  })

  return prefersReducedMotion
}
