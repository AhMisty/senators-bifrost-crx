import { useLocation } from '@solidjs/router'
import { Animator, createBackgroundDots, createBackgroundPuffs, useGetAnimator } from '@arwes/solid'
import { onCleanup, onMount, type Component } from 'solid-js'

import backgroundImageLargeWebp from '@/ui/assets/background/large.webp'
import backgroundImageMediumWebp from '@/ui/assets/background/medium.webp'
import backgroundImageSmallWebp from '@/ui/assets/background/small.webp'
import { redirectRoutes } from '@/shared/routes'
import { introExitTransitionDurationMs } from '@/ui/components/IntroOverlay/introOverlayTimings'

const backgroundDotsSettings = {
  color: 'hsla(180, 50%, 70%, 0.15)',
  size: 2,
  distance: 40,
  originInverted: true,
} as const

const backgroundPuffsSettings = {
  color: 'hsla(180, 50%, 70%, 0.25)',
  quantity: 20,
} as const

const backgroundImageInitialOpacity = 0.6
const backgroundImageInitialScale = 1.05
const backgroundImageEnterDurationMs = 1000
const backgroundImageScaleVarName = '--background-image-scale'
const backgroundBlurTransitionDurationVarName = '--background-blur-transition-duration'
const indexPaths = new Set(redirectRoutes)

type BackgroundLayerKind = 'dots' | 'puffs'
type BackgroundAnimator = Parameters<typeof createBackgroundDots>[0]['animator']
type BackgroundProps = {
  isBlurred: boolean
}
type BackgroundLayerProps = {
  kind: BackgroundLayerKind
}

const easeOutExpo = (value: number): number => (value === 1 ? 1 : 1 - 2 ** (-10 * value))

const setBackgroundImageState = (element: HTMLElement, opacity: number, scale: number): void => {
  element.style.opacity = `${opacity}`
  element.style.setProperty(backgroundImageScaleVarName, `${scale}`)
}

const animateBackgroundImageReveal = (element: HTMLElement): (() => void) => {
  let frameId = 0
  const startTime = performance.now()

  const renderFrame = (timestamp: number): void => {
    const progress = Math.min((timestamp - startTime) / backgroundImageEnterDurationMs, 1)
    const easedProgress = easeOutExpo(progress)
    const opacity =
      backgroundImageInitialOpacity + (1 - backgroundImageInitialOpacity) * easedProgress
    const scale = backgroundImageInitialScale + (1 - backgroundImageInitialScale) * easedProgress

    setBackgroundImageState(element, opacity, scale)

    if (progress < 1) {
      frameId = requestAnimationFrame(renderFrame)
    }
  }

  setBackgroundImageState(element, backgroundImageInitialOpacity, backgroundImageInitialScale)
  frameId = requestAnimationFrame(renderFrame)

  return () => cancelAnimationFrame(frameId)
}

const createBackgroundLayer = (
  kind: BackgroundLayerKind,
  canvas: HTMLCanvasElement,
  animator: BackgroundAnimator,
) =>
  kind === 'dots'
    ? createBackgroundDots({
        canvas,
        animator,
        settingsRef: { current: backgroundDotsSettings },
      })
    : createBackgroundPuffs({
        canvas,
        animator,
        settingsRef: { current: backgroundPuffsSettings },
      })

const BackgroundImage: Component<BackgroundProps> = (props) => {
  const location = useLocation()
  let pictureElement: HTMLPictureElement | undefined

  onMount(() => {
    if (!pictureElement) {
      return
    }

    const cancelReveal = animateBackgroundImageReveal(pictureElement)
    onCleanup(cancelReveal)
  })

  const getFilter = (): string => {
    const pathname = location.pathname
    const isIndexPath = indexPaths.has(pathname)
    const shouldBlur = props.isBlurred && !isIndexPath
    const brightness = isIndexPath ? 0.4 : 0.3
    const blur = shouldBlur ? 10 : 0

    return `brightness(${brightness}) blur(${blur}px)`
  }

  return (
    <picture
      ref={(element) => {
        pictureElement = element
      }}
      class="absolute inset-0 op-60 [transform:scale(var(--background-image-scale,1.05))] [transform-origin:top_center] [transition-duration:var(--background-blur-transition-duration,220ms)] transition-[filter] ease-out will-change-[transform,opacity,filter]"
      style={{
        [backgroundImageScaleVarName]: `${backgroundImageInitialScale}`,
        [backgroundBlurTransitionDurationVarName]: `${introExitTransitionDurationMs}ms`,
        filter: getFilter(),
      }}
    >
      <source media="(min-width: 1280px)" srcset={backgroundImageLargeWebp} type="image/webp" />
      <source media="(min-width: 768px)" srcset={backgroundImageMediumWebp} type="image/webp" />
      <source media="(max-width: 767px)" srcset={backgroundImageSmallWebp} type="image/webp" />
      <img
        src={backgroundImageSmallWebp}
        alt=""
        loading="eager"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover object-center"
      />
    </picture>
  )
}

const BackgroundLayer: Component<BackgroundLayerProps> = (props) => {
  let canvasElement: HTMLCanvasElement | undefined

  const getAnimator = useGetAnimator()

  onMount(() => {
    if (!canvasElement) {
      return
    }

    const layer = createBackgroundLayer(props.kind, canvasElement, getAnimator?.()?.node)

    onCleanup(() => layer.cancel())
  })

  return (
    <canvas
      ref={(element) => {
        canvasElement = element
      }}
      role="presentation"
      class="absolute inset-0 m-0 block h-full w-full border-0 p-0"
    />
  )
}

export const Background: Component<BackgroundProps> = (props) => (
  <Animator root combine duration={{ enter: 0.01, exit: 0.01 }}>
    <div
      class="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[var(--app-background-color)]"
      aria-hidden="true"
    >
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,#04252b_0%,#002424_0.01%,#001515_100%)]" />

        <Animator duration={{ enter: 1 }}>
          <BackgroundImage isBlurred={props.isBlurred} />
        </Animator>

        <Animator duration={{ enter: 1 }}>
          <BackgroundLayer kind="dots" />
        </Animator>

        <Animator duration={{ enter: 1, interval: 4 }}>
          <BackgroundLayer kind="puffs" />
        </Animator>
      </div>
    </div>
  </Animator>
)
