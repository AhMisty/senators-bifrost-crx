import styles from './BifrostBrand.module.css'

import { type Component } from 'solid-js'

import {
  bifrostMarkSegments,
  bifrostMarkViewBox,
  bifrostTitleGlyphs,
  bifrostTitleViewBox,
} from '@/ui/components/IntroOverlay/introOverlayData'

type BifrostBrandProps = {
  active?: boolean
  class?: string
}

export const BifrostBrand: Component<BifrostBrandProps> = (props) => {
  return (
    <div
      class={`${styles.brand} flex items-center gap-1.5 ${props.class ?? ''}`}
      data-active={props.active ?? true}
      aria-label="BIFROST"
      role="img"
    >
      <svg
        class={`${styles.mark} h-6 w-6 overflow-visible md:h-7 md:w-7 xl:h-8 xl:w-8`}
        viewBox={bifrostMarkViewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g class={styles.cross}>
          {bifrostMarkSegments.map((segment) => (
            <path
              d={segment.path}
              class={`${styles.armShape} ${styles.markSegment}`}
              style={{ '--bifrost-brand-delay': `${segment.delaySeconds}s` }}
            />
          ))}
        </g>
      </svg>

      <svg
        class={`${styles.title} h-4 w-auto overflow-visible md:h-[1.125rem] xl:h-5`}
        viewBox={bifrostTitleViewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {bifrostTitleGlyphs.map((glyph) => (
          <g
            class={styles.titleGlyph}
            style={{ '--bifrost-brand-delay': `${glyph.delaySeconds}s` }}
            transform={glyph.transform}
          >
            {glyph.paths.map((path) => (
              <path d={path.d} class={styles.titleFill} fill-rule={path.fillRule} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}
