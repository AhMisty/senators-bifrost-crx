import styles from './IlluminatorButton.module.css'

import { splitProps, createSignal, onCleanup, onMount, type Component, type JSX } from 'solid-js'

const defaultGlowSizePx = 240
const defaultGlowColor = 'hsl(60 68.85% 47.84% / 0.2)'
const frameCornerLengthPx = 8
const frameStrokeWidthPx = 1

type IlluminatorButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: JSX.Element
  glowColor?: string
  glowSizePx?: number
}

export const IlluminatorButton: Component<IlluminatorButtonProps> = (props) => {
  const [localProps, otherProps] = splitProps(props, [
    'children',
    'class',
    'glowColor',
    'glowSizePx',
    'type',
  ])

  let buttonElement: HTMLButtonElement | undefined
  let glowElement: HTMLDivElement | undefined
  const [frameSize, setFrameSize] = createSignal({
    width: frameCornerLengthPx + frameStrokeWidthPx,
    height: frameCornerLengthPx + frameStrokeWidthPx,
  })

  const getGlowSizePx = (): number => localProps.glowSizePx ?? defaultGlowSizePx
  const getFrameOffsetPx = (): number => frameStrokeWidthPx / 2
  const getFrameWidthPx = (): number =>
    Math.max(frameSize().width, frameCornerLengthPx + frameStrokeWidthPx)
  const getFrameHeightPx = (): number =>
    Math.max(frameSize().height, frameCornerLengthPx + frameStrokeWidthPx)

  const hideGlow = (): void => {
    if (!glowElement || glowElement.style.opacity === '0') {
      return
    }

    glowElement.style.opacity = '0'
  }

  onMount(() => {
    if (!buttonElement || !glowElement) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      setFrameSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })

    const initialBounds = buttonElement.getBoundingClientRect()
    setFrameSize({
      width: initialBounds.width,
      height: initialBounds.height,
    })

    resizeObserver.observe(buttonElement)

    const handleMouseMove = (event: MouseEvent): void => {
      if (!buttonElement || !glowElement) {
        return
      }

      const glowSizePx = getGlowSizePx()
      const bounds = buttonElement.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const isVisible =
        x >= -(glowSizePx / 2) &&
        x <= bounds.width + glowSizePx / 2 &&
        y >= -(glowSizePx / 2) &&
        y <= bounds.height + glowSizePx / 2

      glowElement.style.opacity = isVisible ? '1' : '0'

      if (isVisible) {
        glowElement.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', hideGlow)

    onCleanup(() => {
      resizeObserver.disconnect()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', hideGlow)
    })
  })

  return (
    <button
      {...otherProps}
      ref={(element) => {
        buttonElement = element
      }}
      type={localProps.type ?? 'button'}
      class={`${styles.button} relative flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[0.625rem] uppercase select-none md:text-[0.75rem] xl:text-[0.875rem] ${localProps.class ?? ''}`.trim()}
    >
      <svg
        class={`${styles.frame} pointer-events-none absolute inset-0 block h-full w-full`}
        aria-hidden="true"
        viewBox={`0 0 ${getFrameWidthPx()} ${getFrameHeightPx()}`}
        preserveAspectRatio="none"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-width={frameStrokeWidthPx}
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d={`M ${getFrameOffsetPx()} ${getFrameOffsetPx()} L ${getFrameOffsetPx()} ${frameCornerLengthPx}`}
          />
          <path
            d={`M ${getFrameOffsetPx()} ${getFrameOffsetPx()} L ${frameCornerLengthPx} ${getFrameOffsetPx()}`}
          />
          <path
            d={`M ${getFrameWidthPx() - getFrameOffsetPx()} ${getFrameOffsetPx()} L ${getFrameWidthPx() - frameCornerLengthPx} ${getFrameOffsetPx()}`}
          />
          <path
            d={`M ${getFrameWidthPx() - getFrameOffsetPx()} ${getFrameOffsetPx()} L ${getFrameWidthPx() - getFrameOffsetPx()} ${frameCornerLengthPx}`}
          />
          <path
            d={`M ${getFrameWidthPx() - getFrameOffsetPx()} ${getFrameHeightPx() - getFrameOffsetPx()} L ${getFrameWidthPx() - getFrameOffsetPx()} ${getFrameHeightPx() - frameCornerLengthPx}`}
          />
          <path
            d={`M ${getFrameWidthPx() - getFrameOffsetPx()} ${getFrameHeightPx() - getFrameOffsetPx()} L ${getFrameWidthPx() - frameCornerLengthPx} ${getFrameHeightPx() - getFrameOffsetPx()}`}
          />
          <path
            d={`M ${getFrameOffsetPx()} ${getFrameHeightPx() - getFrameOffsetPx()} L ${frameCornerLengthPx} ${getFrameHeightPx() - getFrameOffsetPx()}`}
          />
          <path
            d={`M ${getFrameOffsetPx()} ${getFrameHeightPx() - getFrameOffsetPx()} L ${getFrameOffsetPx()} ${getFrameHeightPx() - frameCornerLengthPx}`}
          />
        </g>
      </svg>
      <div class="pointer-events-none absolute inset-0.5 overflow-hidden" aria-hidden="true">
        <div
          ref={(element) => {
            glowElement = element
          }}
          class={`${styles.glow} pointer-events-none absolute left-0 top-0`}
          style={{
            '--illuminator-button-glow-size': `${getGlowSizePx()}px`,
            background: `radial-gradient(closest-side, ${localProps.glowColor ?? defaultGlowColor}, transparent)`,
          }}
        />
      </div>
      <div
        class={`${styles.content} relative z-[1] flex items-center justify-center gap-1.5 px-3 text-center leading-[1.75rem] sm:gap-2 sm:px-4 sm:leading-[2rem]`}
      >
        {localProps.children}
      </div>
    </button>
  )
}
