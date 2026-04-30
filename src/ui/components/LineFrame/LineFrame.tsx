import styles from './LineFrame.module.css'

import { createFrameHeaderSettings, type FrameSettings } from '@arwes/solid'
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
  type JSX,
} from 'solid-js'

import { ScrollArea } from '@/ui/components/ScrollArea'
import { createSafeFrame } from '@/ui/libs/createSafeFrame'

const verticalHeaderSettings = createFrameHeaderSettings({
  direction: 'vertical',
  align: 'top',
})

type LineFrameProps = {
  active?: boolean
  title: JSX.Element
  children: JSX.Element
}

type FrameHeaderProps = {
  active: boolean
  class?: string
  placement: 'horizontal' | 'vertical'
  settings: FrameSettings
}

const FrameHeader: Component<FrameHeaderProps> = (props) => {
  let svgElement: SVGSVGElement | undefined
  let frame: ReturnType<typeof createSafeFrame> | undefined

  createEffect(() => {
    const settings = props.settings

    if (!svgElement) {
      return
    }

    if (frame) {
      frame.update(settings)
      return
    }

    frame = createSafeFrame(svgElement, settings)
  })

  onCleanup(() => frame?.remove())

  return (
    <svg
      ref={(element) => {
        svgElement = element
      }}
      role="presentation"
      aria-hidden="true"
      data-active={props.active}
      data-placement={props.placement}
      class={`${styles.frame} arwes-frames-frame arwes-frames-frameheader ${props.class ?? ''}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    />
  )
}

export const LineFrame: Component<LineFrameProps> = (props) => {
  let headingElement: HTMLDivElement | undefined
  const [contentWidth, setContentWidth] = createSignal(0)
  const isActive = (): boolean => props.active ?? true
  const horizontalHeaderSettings = createMemo(() =>
    createFrameHeaderSettings({ contentLength: contentWidth() }),
  )

  onMount(() => {
    if (!headingElement) {
      return
    }

    let animationFrame = 0
    const updateContentWidth = (): void => {
      animationFrame = 0
      setContentWidth(headingElement?.offsetWidth ?? 0)
    }
    const scheduleContentWidthUpdate = (): void => {
      if (animationFrame) {
        return
      }

      animationFrame = requestAnimationFrame(updateContentWidth)
    }
    const resizeObserver = new ResizeObserver(scheduleContentWidthUpdate)

    resizeObserver.observe(headingElement)
    setContentWidth(headingElement.offsetWidth)

    onCleanup(() => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
    })
  })

  return (
    <div
      class={`${styles.root} flex h-full min-h-0 min-w-0 flex-1 justify-center`}
      data-line-frame-active={isActive() ? 'true' : 'false'}
    >
      <div
        class={`${styles.panel} relative flex h-full w-full max-w-[1980px] min-h-0 min-w-0 flex-col`}
      >
        <header class={`${styles.header} relative flex flex-row items-center`}>
          <FrameHeader
            active={isActive()}
            placement="horizontal"
            settings={horizontalHeaderSettings()}
          />

          <div
            ref={(element) => {
              headingElement = element
            }}
            class={`${styles.title} m-0 flex items-center font-[var(--app-font-family-header)] leading-none font-light text-[hsl(180_68.14%_44.31%)]`}
          >
            {props.title}
          </div>
        </header>

        <div class={`${styles.body} flex min-h-0 min-w-0 flex-1 flex-row`}>
          <aside class={`${styles.sideRail} relative flex h-full shrink-0`}>
            <FrameHeader
              active={isActive()}
              placement="vertical"
              settings={verticalHeaderSettings}
            />
          </aside>

          <ScrollArea
            class="min-h-0 min-w-0 flex-1"
            contentClass="flex min-h-full min-w-0 flex-col py-4"
          >
            {props.children}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
