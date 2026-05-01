import styles from './BrandLogo.module.css'

import { type Component } from 'solid-js'

import {
  brandMarkSegments,
  brandMarkViewBox,
  brandTitleGlyphs,
  brandTitleViewBox,
} from './brandLogoData'

type BrandLogoProps = {
  active?: boolean
  class?: string
}

export const BrandLogo: Component<BrandLogoProps> = (props) => {
  return (
    <div
      class={`${styles.brand} flex items-center gap-1.5 ${props.class ?? ''}`}
      data-active={props.active ?? true}
      aria-label="Brand logo"
      role="img"
    >
      <svg
        class={`${styles.mark} overflow-visible`}
        viewBox={brandMarkViewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g class={styles.cross}>
          {brandMarkSegments.map((segment) => (
            <path
              d={segment.path}
              class={`${styles.armShape} ${styles.markSegment}`}
              style={{ '--brand-logo-delay': `${segment.delaySeconds}s` }}
            />
          ))}
        </g>
      </svg>

      <svg
        class={`${styles.title} overflow-visible`}
        viewBox={brandTitleViewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {brandTitleGlyphs.map((glyph) => (
          <g
            class={styles.titleGlyph}
            style={{ '--brand-logo-delay': `${glyph.delaySeconds}s` }}
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
