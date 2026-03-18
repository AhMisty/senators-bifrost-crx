import './Background.css'

import { useLocation } from '@solidjs/router'
import { Animator, createBackgroundDots, createBackgroundPuffs, useGetAnimator } from '@arwes/solid'
import { onCleanup, onMount, type Component } from 'solid-js'

import backgroundImageLargeWebp from '@/assets/background/large.webp'
import backgroundImageMediumWebp from '@/assets/background/medium.webp'
import backgroundImageSmallWebp from '@/assets/background/small.webp'
import { redirectRoutePaths } from '@/routes/routePaths'
import { introExitTransitionDurationMs } from '@/components/IntroOverlay/introOverlayTimings'

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
const indexPaths = new Set<string>(redirectRoutePaths)

type BackgroundLayerKind = 'dots' | 'puffs'
type BackgroundAnimator = Parameters<typeof createBackgroundDots>[0]['animator']
type BackgroundProps = {
  isBlurred: boolean
}
type BackgroundImageProps = Pick<BackgroundProps, 'isBlurred'>
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
) => {
  if (kind === 'dots') {
    return createBackgroundDots({
      canvas,
      animator,
      settingsRef: { current: backgroundDotsSettings },
    })
  }

  return createBackgroundPuffs({
    canvas,
    animator,
    settingsRef: { current: backgroundPuffsSettings },
  })
}

const BackgroundImage: Component<BackgroundImageProps> = (props) => {
  const location = useLocation()
  let pictureElement: HTMLPictureElement | undefined

  onMount(() => {
    if (!pictureElement) {
      return
    }

    onCleanup(animateBackgroundImageReveal(pictureElement))
  })

  const getBackgroundImageFilter = (): string => {
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
      class="background__image absolute inset-0"
      style={{
        [backgroundImageScaleVarName]: `${backgroundImageInitialScale}`,
        [backgroundBlurTransitionDurationVarName]: `${introExitTransitionDurationMs}ms`,
        filter: getBackgroundImageFilter(),
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
      class="background fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <div class="absolute inset-0 overflow-hidden">
        <div class="background__gradient absolute inset-0" />

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
