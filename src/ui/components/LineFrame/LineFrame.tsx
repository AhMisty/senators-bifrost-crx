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

    frame?.remove()
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

    const resizeObserver = new ResizeObserver(() =>
      setContentWidth(headingElement?.offsetWidth ?? 0),
    )
    resizeObserver.observe(headingElement)
    setContentWidth(headingElement.offsetWidth)

    onCleanup(() => resizeObserver.disconnect())
  })

  return (
    <div class="flex h-full min-h-0 min-w-0 flex-1 justify-center">
      <div class="relative flex h-full w-full max-w-[1980px] min-h-0 min-w-0 flex-col gap-2 p-2 md:gap-4 md:p-4">
        <header class="relative flex flex-row items-center gap-2 pb-2 md:gap-4 md:pb-4">
          <FrameHeader
            active={isActive()}
            placement="horizontal"
            settings={horizontalHeaderSettings()}
          />

          <div
            ref={(element) => {
              headingElement = element
            }}
            class="m-0 flex items-center font-[var(--app-font-family-header)] text-[1.75rem] leading-none font-light text-[hsl(180_68.14%_44.31%)] md:text-[2rem] xl:text-[2.25rem]"
          >
            {props.title}
          </div>
        </header>

        <div class="flex min-h-0 min-w-0 flex-1 flex-row gap-2 md:gap-4">
          <aside class="relative flex h-full w-2 shrink-0">
            <FrameHeader
              active={isActive()}
              placement="vertical"
              settings={verticalHeaderSettings}
            />
          </aside>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-8">
            {props.children}
          </div>
        </div>
      </div>
    </div>
  )
}
