import styles from './CardFrame.module.css'

import {
  createFrameNeroSettings,
  createFrameOctagonSettings,
  styleFrameClipOctagon,
  type FrameSettings,
} from '@arwes/solid'
import { onCleanup, onMount, splitProps, type Component, type JSX } from 'solid-js'

import { createSafeFrame } from '@/ui/libs/createSafeFrame'

const squareSize = 16
const frameClipPath = styleFrameClipOctagon({
  leftBottom: false,
  rightTop: false,
  squareSize,
})
const frameOctagonSettings = createFrameOctagonSettings({
  leftBottom: false,
  rightTop: false,
  squareSize,
})
const frameNeroSettings = createFrameNeroSettings()
const frameBaseClass =
  'absolute inset-0 z-[1] block size-full overflow-visible border-0 m-0 p-0 arwes-frames-frame'

type CardFrameProps = {
  class?: string
  children: JSX.Element
}

type FrameBaseProps = {
  class: string
  settings: FrameSettings
}

const FrameBase: Component<FrameBaseProps> = (props) => {
  let svgElement: SVGSVGElement | undefined

  onMount(() => {
    if (!svgElement) {
      return
    }

    const frame = createSafeFrame(svgElement, props.settings)
    onCleanup(() => frame.remove())
  })

  return (
    <svg
      ref={(element) => {
        svgElement = element
      }}
      role="presentation"
      aria-hidden="true"
      class={`${frameBaseClass} ${props.class}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    />
  )
}

export const CardFrame: Component<CardFrameProps> = (props) => {
  const [localProps] = splitProps(props, ['children', 'class'])

  return (
    <article
      class={`${styles.root} relative flex flex-col ${localProps.class ?? ''}`}
      style={{
        background: 'var(--arwes-frames-bg-color)',
        'clip-path': frameClipPath,
      }}
    >
      <FrameBase
        class="arwes-frames-frameoctagon pointer-events-none"
        settings={frameOctagonSettings}
      />
      <FrameBase class="arwes-frames-framenero pointer-events-none" settings={frameNeroSettings} />

      {localProps.children}
    </article>
  )
}
