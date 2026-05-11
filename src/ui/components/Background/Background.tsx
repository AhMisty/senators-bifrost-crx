import { useLocation } from '@solidjs/router'
import { Animator, createBackgroundDots, createBackgroundPuffs, useGetAnimator } from '@arwes/solid'
import { createEffect, createSignal, onCleanup, onMount, type Component } from 'solid-js'

import backgroundImageLargeWebp from '@/ui/assets/background/large.webp'
import backgroundImageMediumWebp from '@/ui/assets/background/medium.webp'
import backgroundImageSmallWebp from '@/ui/assets/background/small.webp'
import { usePrefersReducedMotion } from '@/ui/hooks/usePrefersReducedMotion'
import { easeOutExpo, introExitTransitionDurationMs, motionDurationMs } from '@/ui/utils/motion'
import { redirectRoutes } from '@/shared/routes'

const backgroundDotsSettingsBase = {
  size: 2,
  distance: 40,
  originInverted: true,
} as const

const backgroundPuffsSettingsBase = {
  quantity: 20,
} as const

const backgroundImageInitialOpacity = 0.6
const backgroundImageInitialScale = 1.05
const backgroundImageScaleVarName = '--background-image-scale'
const backgroundBlurTransitionDurationVarName = '--background-blur-transition-duration'
const backgroundPrimaryBrightHslFallback = '180 100% 70%'
const indexPaths = new Set<string>(redirectRoutes)

type BackgroundLayerKind = 'dots' | 'puffs'
type BackgroundAnimator = Parameters<typeof createBackgroundDots>[0]['animator']
type BackgroundProps = {
  isBlurred: boolean
}
type BackgroundImageProps = BackgroundProps & {
  isReducedMotion: boolean
}
type BackgroundLayerProps = {
  kind: BackgroundLayerKind
}

const getThemeHsl = (tokenName: string, fallback: string): string => {
  const tokenValue = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim()

  return tokenValue || fallback
}

const getThemeColor = (tokenName: string, fallback: string, alpha: number): string =>
  `hsl(${getThemeHsl(tokenName, fallback)} / ${alpha})`

const setBackgroundImageState = (element: HTMLElement, opacity: number, scale: number): void => {
  element.style.opacity = `${opacity}`
  element.style.setProperty(backgroundImageScaleVarName, `${scale}`)
}

const animateBackgroundImageReveal = (
  element: HTMLElement,
  onComplete: () => void,
): (() => void) => {
  let frameId = 0
  let isCancelled = false
  const startTime = performance.now()

  const renderFrame = (timestamp: number): void => {
    if (isCancelled) {
      return
    }

    const progress = Math.min((timestamp - startTime) / motionDurationMs.backgroundReveal, 1)
    const easedProgress = easeOutExpo(progress)
    const opacity =
      backgroundImageInitialOpacity + (1 - backgroundImageInitialOpacity) * easedProgress
    const scale = backgroundImageInitialScale + (1 - backgroundImageInitialScale) * easedProgress

    setBackgroundImageState(element, opacity, scale)

    if (progress < 1) {
      frameId = requestAnimationFrame(renderFrame)
    } else {
      onComplete()
    }
  }

  setBackgroundImageState(element, backgroundImageInitialOpacity, backgroundImageInitialScale)
  frameId = requestAnimationFrame(renderFrame)

  return () => {
    isCancelled = true
    cancelAnimationFrame(frameId)
  }
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
        settingsRef: {
          current: {
            ...backgroundDotsSettingsBase,
            color: getThemeColor(
              '--app-primary-bright-hsl',
              backgroundPrimaryBrightHslFallback,
              0.15,
            ),
          },
        },
      })
    : createBackgroundPuffs({
        canvas,
        animator,
        settingsRef: {
          current: {
            ...backgroundPuffsSettingsBase,
            color: getThemeColor(
              '--app-primary-bright-hsl',
              backgroundPrimaryBrightHslFallback,
              0.25,
            ),
          },
        },
      })

const BackgroundImage: Component<BackgroundImageProps> = (props) => {
  const location = useLocation()
  let pictureElement: HTMLPictureElement | undefined
  let didTrackFilterTransition = false
  let filterTransitionTimerId = 0
  const [isRevealActive, setIsRevealActive] = createSignal(true)
  const [isFilterTransitionActive, setIsFilterTransitionActive] = createSignal(false)
  const blurTransitionDurationMs = (): number =>
    props.isReducedMotion ? 0 : introExitTransitionDurationMs

  createEffect(() => {
    if (props.isReducedMotion && pictureElement) {
      setBackgroundImageState(pictureElement, 1, 1)
      setIsRevealActive(false)
    }
  })

  onMount(() => {
    if (!pictureElement) {
      return
    }

    if (props.isReducedMotion) {
      setBackgroundImageState(pictureElement, 1, 1)
      setIsRevealActive(false)
      return
    }

    const cancelReveal = animateBackgroundImageReveal(pictureElement, () => {
      setIsRevealActive(false)
    })
    onCleanup(cancelReveal)
  })

  createEffect(() => {
    void props.isBlurred

    if (!didTrackFilterTransition) {
      didTrackFilterTransition = true
      return
    }

    setIsFilterTransitionActive(true)
    window.clearTimeout(filterTransitionTimerId)
    filterTransitionTimerId = window.setTimeout(() => {
      setIsFilterTransitionActive(false)
    }, introExitTransitionDurationMs)
  })

  onCleanup(() => window.clearTimeout(filterTransitionTimerId))

  const getFilter = (): string => {
    const pathname = location.pathname
    const isIndexPath = indexPaths.has(pathname)
    const shouldBlur = props.isBlurred && !isIndexPath
    const brightness = isIndexPath ? 0.4 : 0.3
    const blur = shouldBlur ? 10 : 0

    return `brightness(${brightness}) blur(${blur}px)`
  }

  const getWillChange = (): string => {
    const properties = [
      isRevealActive() ? 'transform, opacity' : '',
      isFilterTransitionActive() ? 'filter' : '',
    ].filter(Boolean)

    return properties.length > 0 ? properties.join(', ') : 'auto'
  }

  return (
    <picture
      ref={(element) => {
        pictureElement = element
      }}
      class="absolute inset-0 op-60 [transform:scale(var(--background-image-scale,1.05))] [transform-origin:top_center] [transition-duration:var(--background-blur-transition-duration,var(--app-motion-duration-panel))] [transition-timing-function:var(--app-motion-ease-out)] transition-[filter]"
      style={{
        [backgroundImageScaleVarName]: `${backgroundImageInitialScale}`,
        [backgroundBlurTransitionDurationVarName]: `${blurTransitionDurationMs()}ms`,
        filter: getFilter(),
        'will-change': getWillChange(),
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

export const Background: Component<BackgroundProps> = (props) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const layerEnterDuration = (): number => (prefersReducedMotion() ? 0.01 : 1)
  const puffsInterval = (): number => (prefersReducedMotion() ? 0.01 : 4)

  return (
    <Animator root combine duration={{ enter: 0.01, exit: 0.01 }}>
      <div
        class="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[var(--app-background-color)]"
        aria-hidden="true"
      >
        <div class="absolute inset-0 overflow-hidden">
          <div class="absolute inset-0 [background:var(--app-background-radial-image)]" />

          <Animator duration={{ enter: layerEnterDuration() }}>
            <BackgroundImage isBlurred={props.isBlurred} isReducedMotion={prefersReducedMotion()} />
          </Animator>

          <Animator duration={{ enter: layerEnterDuration() }}>
            <BackgroundLayer kind="dots" />
          </Animator>

          <Animator duration={{ enter: layerEnterDuration(), interval: puffsInterval() }}>
            <BackgroundLayer kind="puffs" />
          </Animator>
        </div>
      </div>
    </Animator>
  )
}
