export const motionDurationMs = {
  fast: 120,
  control: 160,
  panel: 220,
  collapse: 260,
  compact: 320,
  logoMark: 420,
  intro: 540,
  introArm: 560,
  cardEnter: 800,
  backgroundReveal: 1_000,
  halo: 4_800,
  orbit: 18_000,
  orbitInner: 14_000,
  pulse: 2_400,
} as const

export const motionEase = {
  standard: 'ease',
  in: 'ease-in',
  out: 'ease-out',
  inOut: 'ease-in-out',
  linear: 'linear',
  emphatic: 'cubic-bezier(0.12, 0.78, 0.24, 1)',
  intro: 'cubic-bezier(0.18, 0.78, 0.24, 1)',
} as const

export const motionDelayMs = {
  introStart: 250,
  introExit: 1_550,
  introComplete: 2_150,
} as const

export const introExitTransitionDurationMs = motionDelayMs.introComplete - motionDelayMs.introExit

export const reducedMotionMediaQuery = '(prefers-reduced-motion: reduce)'

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(reducedMotionMediaQuery).matches

export const easeOutExpo = (value: number): number => (value === 1 ? 1 : 1 - 2 ** (-10 * value))
