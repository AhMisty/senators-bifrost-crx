import styles from './IntroOverlay.module.css'

import { createSignal, onCleanup, onMount, type Component } from 'solid-js'

import {
  bifrostMarkSegments,
  bifrostMarkViewBox,
  bifrostTitleGlyphs,
  bifrostTitleViewBox,
} from './introOverlayData'
import {
  introCompleteDelayMs,
  introExitDelayMs,
  introExitTransitionDurationMs,
  introStartDelayMs,
} from './introOverlayTimings'

type IntroOverlayProps = {
  onExitStart: () => void
  onComplete: () => void
}

export const IntroOverlay: Component<IntroOverlayProps> = (props) => {
  const [isActive, setIsActive] = createSignal(true)

  onMount(() => {
    const exitTimerId = window.setTimeout(() => {
      props.onExitStart()
      setIsActive(false)
    }, introExitDelayMs)
    const completeTimerId = window.setTimeout(props.onComplete, introCompleteDelayMs)

    onCleanup(() => {
      window.clearTimeout(exitTimerId)
      window.clearTimeout(completeTimerId)
    })
  })

  return (
    <div
      class={`${styles.overlay} absolute inset-0 z-[2] overflow-hidden`}
      classList={{ [styles.inactive]: !isActive() }}
      style={{
        '--intro-start-delay': `${introStartDelayMs / 1000}s`,
        '--intro-overlay-transition-duration': `${introExitTransitionDurationMs}ms`,
      }}
    >
      <div class={`${styles.scrim} absolute inset-0`} />

      <div class="absolute inset-0 z-[1] grid place-items-center overflow-hidden p-[clamp(24px,5vw,56px)]">
        <div
          class={`${styles.center} grid w-full max-w-[40rem] justify-items-center gap-3.5 text-center sm:gap-4`}
        >
          <div class="relative aspect-square w-64 max-w-[74vw] sm:w-72 sm:max-w-[72vw]">
            <div class={`${styles.halo} absolute inset-[14%] rounded-full`} />

            <svg
              class={`${styles.symbol} absolute inset-0 h-full w-full overflow-visible`}
              viewBox={bifrostMarkViewBox}
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="intro-overlay-orbit-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="rgb(0 255 255 / 0)" />
                  <stop offset="50%" stop-color="rgb(0 255 255 / 0.72)" />
                  <stop offset="100%" stop-color="rgb(0 255 255 / 0)" />
                </linearGradient>
              </defs>

              <circle class={styles.orbit} cx="285" cy="210" r="172" />
              <circle class={`${styles.orbit} ${styles.orbitInner}`} cx="285" cy="210" r="118" />

              <g class={styles.cross}>
                {bifrostMarkSegments.map((segment) => (
                  <g
                    class={styles.arm}
                    style={{
                      '--intro-delay': `${segment.delaySeconds}s`,
                      '--intro-x': `${segment.offsetX * 0.32}px`,
                      '--intro-y': `${segment.offsetY * 0.32}px`,
                    }}
                  >
                    <path d={segment.path} class={styles.armShape} />
                  </g>
                ))}
              </g>

              <circle class={styles.corePulse} cx="285" cy="210" r="38" />
            </svg>
          </div>

          <h1 class="m-0 flex w-full justify-center sm:w-auto">
            <svg
              class={`${styles.title} h-auto w-[min(18rem,82vw)] overflow-visible sm:w-[min(21rem,72vw)]`}
              viewBox={bifrostTitleViewBox}
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="BIFROST"
            >
              {bifrostTitleGlyphs.map((glyph) => (
                <g
                  class={styles.titleGlyph}
                  style={{ '--intro-title-delay': `${glyph.delaySeconds}s` }}
                  transform={glyph.transform}
                >
                  {glyph.paths.map((path) => (
                    <path
                      d={path.d}
                      class={styles.titleFill}
                      fill-rule={path.fillRule}
                      aria-hidden="true"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </h1>
        </div>
      </div>
    </div>
  )
}
