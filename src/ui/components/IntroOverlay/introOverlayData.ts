type BifrostMarkSegment = {
  path: string
  offsetX: number
  offsetY: number
  delaySeconds: number
}

type BifrostTitlePath = {
  d: string
  fillRule?: 'evenodd'
}

type BifrostTitleGlyph = {
  delaySeconds: number
  paths: readonly BifrostTitlePath[]
  transform?: string
}

const titleDelayStepSeconds = 0.024

export const bifrostMarkViewBox = '0 0 570 570'

export const bifrostMarkSegments: readonly BifrostMarkSegment[] = [
  {
    path: 'M285 0 L320 100 L285 200 L250 100 Z',
    offsetX: 0,
    offsetY: -78,
    delaySeconds: 0.08,
  },
  {
    path: 'M495 210 L395 245 L295 210 L395 175 Z',
    offsetX: 92,
    offsetY: 0,
    delaySeconds: 0.32,
  },
  {
    path: 'M285 570 L250 320 L285 220 L320 320 Z',
    offsetX: 0,
    offsetY: 96,
    delaySeconds: 0.16,
  },
  {
    path: 'M75 210 L175 175 L275 210 L175 245 Z',
    offsetX: -92,
    offsetY: 0,
    delaySeconds: 0.24,
  },
] as const

export const bifrostTitleViewBox = '67.002 401.522 2425.208 276.8'

export const bifrostTitleGlyphs: readonly BifrostTitleGlyph[] = [
  {
    delaySeconds: 0,
    paths: [
      {
        d: 'M370.202 565.122 L316.602 637.522 L67.002 637.522 L67.002 401.522 L316.602 401.522 L370.202 473.922 L336.602 519.522 Z M292.202 474.109 L275.002 454.322 L138.202 454.322 L138.202 495.922 L275.002 495.922 Z M292.202 565.309 L275.002 543.922 L138.202 543.922 L138.202 584.722 L275.002 584.722 Z',
      },
    ],
  },
  {
    delaySeconds: 4 * titleDelayStepSeconds,
    paths: [
      {
        d: 'M528.404 637.866 L457.204 678.322 L457.204 401.522 L528.404 401.522 Z',
      },
    ],
  },
  {
    delaySeconds: 1 * titleDelayStepSeconds,
    paths: [
      {
        d: 'M897.406 401.522 L845.006 454.322 L686.606 454.322 L686.606 495.922 L863.006 495.922 L815.006 543.922 L686.606 543.922 L686.606 637.922 L615.406 678.322 L615.406 401.522 Z',
      },
    ],
  },
  {
    delaySeconds: 5 * titleDelayStepSeconds,
    paths: [
      {
        d: 'M1284.407 637.522 L1213.208 637.522 L1213.208 579.622 L1191.745 558.722 L1055.608 558.722 L1055.608 637.522 L984.408 678.322 L984.408 401.522 L1230.807 401.522 L1284.407 474.322 L1243.608 529.122 L1284.407 569.922 Z M1211.226 478.828 L1192.689 454.322 L1055.608 454.322 L1055.608 505.122 L1192.157 505.122 Z',
      },
    ],
  },
  {
    delaySeconds: 2 * titleDelayStepSeconds,
    paths: [
      {
        d: 'M1675.008 583.828 L1621.408 637.522 L1425.008 637.522 L1371.408 583.828 L1371.408 455.216 L1425.008 401.522 L1621.408 401.522 L1675.008 455.216 Z M1603.808 584.722 L1603.808 454.322 L1442.609 454.322 L1442.609 584.722 Z',
      },
    ],
  },
  {
    delaySeconds: 6 * titleDelayStepSeconds,
    paths: [
      {
        d: 'M2089.209 565.116 L2035.609 637.522 L1762.01 637.522 L1814.391 584.722 L1993.941 584.722 L2010.734 565.216 L1993.728 543.922 L1813.947 543.922 L1762.01 474.128 L1815.609 401.522 L2089.209 401.522 L2036.41 454.322 L1857.21 454.322 L1840.01 474.516 L1857.21 495.922 L2037.21 495.922 Z',
      },
    ],
  },
  {
    delaySeconds: 3 * titleDelayStepSeconds,
    paths: [
      {
        d: 'M2492.21 401.522 L2439.81 454.322 L2369.81 454.322 L2369.81 637.522 L2298.61 678.322 L2298.61 454.322 L2228.61 454.322 L2176.21 401.522 Z',
      },
    ],
  },
] as const
