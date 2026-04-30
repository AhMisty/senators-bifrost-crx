import type {
  FrameSettings,
  FrameSettingsElement,
  FrameSettingsPathCommand,
  FrameSettingsPathDefinition,
} from '@arwes/solid'

const svgNamespace = 'http://www.w3.org/2000/svg'
const percentagePattern = /(\d{1,}\.)?\d{1,}%/g
const mathOnlyPattern = /^[\d.\-+*/%\s()]+$/

type SafeFrame = {
  update: (settings: FrameSettings, options?: SafeFrameOptions) => void
  remove: () => void
}

type SafeFrameOptions = {
  heightReduction?: number
  widthReduction?: number
}

const parseMathExpression = (expression: string): number => {
  let index = 0

  const skipWhitespace = (): void => {
    while (/\s/.test(expression[index] ?? '')) {
      index += 1
    }
  }

  const parseNumber = (): number => {
    skipWhitespace()

    const match = /^(\d+(\.\d*)?|\.\d+)/.exec(expression.slice(index))

    if (!match) {
      throw new Error(`Invalid frame dimension expression: ${expression}`)
    }

    index += match[0].length
    return Number(match[0])
  }

  const parseFactor = (): number => {
    skipWhitespace()

    const char = expression[index]

    if (char === '+') {
      index += 1
      return parseFactor()
    }

    if (char === '-') {
      index += 1
      return -parseFactor()
    }

    if (char === '(') {
      index += 1
      const value = parseExpression()
      skipWhitespace()

      if (expression[index] !== ')') {
        throw new Error(`Invalid frame dimension expression: ${expression}`)
      }

      index += 1
      return value
    }

    return parseNumber()
  }

  const parseTerm = (): number => {
    let value = parseFactor()

    while (true) {
      skipWhitespace()

      const char = expression[index]

      if (char !== '*' && char !== '/') {
        return value
      }

      index += 1
      const nextValue = parseFactor()
      value = char === '*' ? value * nextValue : value / nextValue
    }
  }

  const parseExpression = (): number => {
    let value = parseTerm()

    while (true) {
      skipWhitespace()

      const char = expression[index]

      if (char !== '+' && char !== '-') {
        return value
      }

      index += 1
      const nextValue = parseTerm()
      value = char === '+' ? value + nextValue : value - nextValue
    }
  }

  const value = parseExpression()
  skipWhitespace()

  if (index !== expression.length || !Number.isFinite(value)) {
    throw new Error(`Invalid frame dimension expression: ${expression}`)
  }

  return value
}

const formatFrameDimension = (size: number, dimension: number | string): string => {
  if (typeof dimension === 'number') {
    return String(dimension)
  }

  if (!mathOnlyPattern.test(dimension)) {
    throw new Error(
      'ARWES frames does not support formulas with text different from math expressions.',
    )
  }

  const expression = dimension.replace(percentagePattern, (percentage) =>
    String(size * (Number(percentage.replace('%', '')) / 100)),
  )

  return String(parseMathExpression(expression))
}

const formatCommand = (
  width: number,
  height: number,
  command: FrameSettingsPathCommand,
): string => {
  if (!Array.isArray(command)) {
    return command
  }

  const [name, ...dimensions] = command

  if (name === 'H' || name === 'h') {
    return `${name} ${formatFrameDimension(width, dimensions[0] ?? 0)}`
  }

  if (name === 'V' || name === 'v') {
    return `${name} ${formatFrameDimension(height, dimensions[0] ?? 0)}`
  }

  if (name === 'A' || name === 'a') {
    const [rx = 0, ry = 0, angle = 0, largeArcFlag = 0, sweepFlag = 0, x = 0, y = 0] = dimensions
    const values = [
      formatFrameDimension(width, rx),
      formatFrameDimension(height, ry),
      angle,
      largeArcFlag,
      sweepFlag,
      formatFrameDimension(width, x),
      formatFrameDimension(height, y),
    ].join(',')

    return `${name} ${values}`
  }

  const values = dimensions
    .map((dimension, dimensionIndex) =>
      formatFrameDimension(dimensionIndex % 2 === 0 ? width : height, dimension),
    )
    .join(',')

  return `${name} ${values}`
}

const formatFramePath = (
  width: number,
  height: number,
  path:
    | string
    | FrameSettingsPathDefinition
    | ((config: { width: number; height: number }) => string),
): string => {
  if (typeof path === 'string') {
    return path
  }

  if (typeof path === 'function') {
    return path({ width, height })
  }

  return path.map((command) => formatCommand(width, height, command)).join(' ')
}

const getStyleValue = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return null
}

const formatTransformValue = (value: unknown, unit: 'deg' | 'px' | ''): string | null => {
  if (typeof value === 'number') {
    return `${value}${unit}`
  }

  if (typeof value === 'string') {
    return value
  }

  return null
}

const formatAnimatedStyle = (style: object): Record<string, string> => {
  const formattedStyle: Record<string, string> = {}
  const transform: string[] = []

  Object.entries(style).forEach(([key, value]) => {
    if (key === 'x' || key === 'y' || key === 'z') {
      const name = key === 'x' ? 'translateX' : key === 'y' ? 'translateY' : 'translateZ'
      const transformValue = formatTransformValue(value, 'px')

      if (transformValue) {
        const variableName = `--motion-${name}`
        formattedStyle[variableName] = transformValue
        transform.push(`${name}(var(${variableName}))`)
      }

      return
    }

    if (
      key === 'rotate' ||
      key === 'rotateX' ||
      key === 'rotateY' ||
      key === 'rotateZ' ||
      key === 'skew' ||
      key === 'skewX' ||
      key === 'skewY'
    ) {
      const transformValue = formatTransformValue(value, 'deg')

      if (transformValue) {
        const variableName = `--motion-${key}`
        formattedStyle[variableName] = transformValue
        transform.push(`${key}(var(${variableName}))`)
      }

      return
    }

    if (key === 'scale' || key === 'scaleX' || key === 'scaleY' || key === 'scaleZ') {
      const transformValue = formatTransformValue(value, '')

      if (transformValue) {
        const variableName = `--motion-${key}`
        formattedStyle[variableName] = transformValue
        transform.push(`${key}(var(${variableName}))`)
      }

      return
    }

    const styleValue = getStyleValue(value)

    if (styleValue !== null) {
      formattedStyle[key] = styleValue
    }
  })

  if (transform.length > 0) {
    formattedStyle.transform = transform.join(' ')
  }

  return formattedStyle
}

const toCSSPropertyName = (key: string): string =>
  key.startsWith('--') ? key : key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)

const applyStyle = (element: SVGElement, style?: object): void => {
  if (!style) {
    return
  }

  Object.entries(formatAnimatedStyle(style)).forEach(([key, value]) => {
    element.style.setProperty(toCSSPropertyName(key), value)
  })
}

const syncFrameElement = (element: SVGElement, settings: FrameSettingsElement): void => {
  if (settings.name) {
    element.dataset.name = settings.name
  } else {
    delete element.dataset.name
  }

  if (settings.name === 'line' && (settings.type === undefined || settings.type === 'path')) {
    element.setAttribute('pathLength', '1')
  } else {
    element.removeAttribute('pathLength')
  }

  if (settings.id) {
    element.id = settings.id
  } else {
    element.removeAttribute('id')
  }

  element.removeAttribute('class')

  if (settings.className) {
    element.classList.value = settings.className
  }

  element.removeAttribute('style')
  applyStyle(element, settings.style)
}

const renderFrameElement = (settings: FrameSettingsElement): SVGElement => {
  const element = document.createElementNS(svgNamespace, settings.type ?? 'path')

  syncFrameElement(element, settings)

  if (settings.type === 'svg') {
    element.setAttribute('xmlns', svgNamespace)
  }

  if (
    settings.type === 'svg' ||
    settings.type === 'g' ||
    settings.type === 'defs' ||
    settings.type === 'clipPath' ||
    settings.type === 'mask'
  ) {
    if (typeof settings.elements === 'string') {
      element.innerHTML = settings.elements
    } else {
      settings.elements.forEach((childSettings) =>
        element.append(renderFrameElement(childSettings)),
      )
    }
  }

  return element
}

const syncFrameElements = (
  parent: SVGElement,
  elementSettingsList: FrameSettingsElement[],
): void => {
  const children = Array.from(parent.children).filter(
    (child): child is SVGElement => child instanceof SVGElement,
  )

  if (children.length !== elementSettingsList.length) {
    parent.replaceChildren(...elementSettingsList.map((settings) => renderFrameElement(settings)))
    return
  }

  for (const [index, settings] of elementSettingsList.entries()) {
    const element = children[index]
    const type = settings.type ?? 'path'

    if (!element || element.tagName.toLowerCase() !== type.toLowerCase()) {
      parent.replaceChildren(...elementSettingsList.map((item) => renderFrameElement(item)))
      return
    }

    syncFrameElement(element, settings)

    if (
      settings.type === 'svg' ||
      settings.type === 'g' ||
      settings.type === 'defs' ||
      settings.type === 'clipPath' ||
      settings.type === 'mask'
    ) {
      if (typeof settings.elements === 'string') {
        if (element.innerHTML !== settings.elements) {
          element.innerHTML = settings.elements
        }
      } else {
        syncFrameElements(element, settings.elements)
      }
    }
  }
}

const drawFrameElements = (
  parent: SVGElement,
  width: number,
  height: number,
  elementSettingsList: FrameSettingsElement[],
): void => {
  const children = Array.from(parent.children).filter(
    (child): child is SVGElement => child instanceof SVGElement,
  )

  elementSettingsList.forEach((settings, index) => {
    const element = children[index]

    if (!element) {
      throw new Error('ARWES frame elements did not match the original setup on drawing.')
    }

    if (settings.type === undefined || settings.type === 'path') {
      element.setAttribute('d', formatFramePath(width, height, settings.path))
      return
    }

    if (settings.type === 'rect') {
      element.setAttribute('x', formatFrameDimension(width, settings.x))
      element.setAttribute('y', formatFrameDimension(height, settings.y))
      element.setAttribute('width', formatFrameDimension(width, settings.width))
      element.setAttribute('height', formatFrameDimension(height, settings.height))

      if (settings.rx !== undefined) {
        element.setAttribute('rx', String(settings.rx))
      }

      if (settings.ry !== undefined) {
        element.setAttribute('ry', String(settings.ry))
      }

      return
    }

    if (settings.type === 'svg') {
      const childWidth = formatFrameDimension(width, settings.width)
      const childHeight = formatFrameDimension(height, settings.height)

      element.setAttribute('viewBox', settings.viewBox)
      element.setAttribute('x', formatFrameDimension(width, settings.x))
      element.setAttribute('y', formatFrameDimension(height, settings.y))
      element.setAttribute('width', childWidth)
      element.setAttribute('height', childHeight)

      if (Array.isArray(settings.elements)) {
        drawFrameElements(element, Number(childWidth), Number(childHeight), settings.elements)
      }

      return
    }

    if (
      settings.type === 'g' ||
      settings.type === 'defs' ||
      settings.type === 'clipPath' ||
      settings.type === 'mask'
    ) {
      if (Array.isArray(settings.elements)) {
        drawFrameElements(element, width, height, settings.elements)
      }
    }
  })
}

export const createSafeFrame = (
  svg: SVGSVGElement,
  settings: FrameSettings,
  options: SafeFrameOptions = {},
): SafeFrame => {
  const container = settings.container ?? document.createElementNS(svgNamespace, 'g')
  let currentSettings = settings
  let currentOptions = options
  let animationFrame = 0
  let observer: ResizeObserver | undefined

  const resize = (): { width: number; height: number } => {
    const width = Math.floor(svg.clientWidth)
    const height = Math.floor(svg.clientHeight)
    const viewBox = `0 0 ${width} ${height}`

    if (svg.getAttribute('viewBox') !== viewBox) {
      svg.setAttribute('viewBox', viewBox)
    }

    return { width, height }
  }

  const draw = (): void => {
    const { width, height } = resize()

    if (width <= 0 || height <= 0) {
      return
    }

    drawFrameElements(
      container,
      Math.max(0, width - (currentOptions.widthReduction ?? 0)),
      Math.max(0, height - (currentOptions.heightReduction ?? 0)),
      currentSettings.elements,
    )
  }

  const scheduleDraw = (): void => {
    if (animationFrame) {
      return
    }

    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0
      draw()
    })
  }

  container.dataset.frame = ''
  container.style.setProperty('vector-effect', 'non-scaling-stroke')
  currentSettings.elements.forEach((elementSettings) =>
    container.append(renderFrameElement(elementSettings)),
  )

  if (!container.parentNode) {
    svg.append(container)
  }

  draw()
  observer = new ResizeObserver(scheduleDraw)
  observer.observe(svg)

  return {
    update: (nextSettings, nextOptions = {}) => {
      currentSettings = nextSettings
      currentOptions = nextOptions
      syncFrameElements(container, currentSettings.elements)
      scheduleDraw()
    },
    remove: () => {
      observer?.disconnect()
      cancelAnimationFrame(animationFrame)
      Array.from(container.children).forEach((child) => child.remove())
      container.remove()
    },
  }
}
