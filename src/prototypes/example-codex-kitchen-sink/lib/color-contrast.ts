interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

function parseColor(color: string): Rgba | null {
  if (!color || color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  const rgbaMatch = color.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/,
  )
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    }
  }

  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i)
  if (!hexMatch) return null

  let hex = hexMatch[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (hex.length < 6) return null

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  }
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function compositeOver(fg: Rgba, bg: Rgba): [number, number, number] {
  if (fg.a <= 0) return [bg.r, bg.g, bg.b]
  if (fg.a >= 1) return [fg.r, fg.g, fg.b]

  const backdropAlpha = bg.a * (1 - fg.a)
  const outAlpha = fg.a + backdropAlpha
  if (outAlpha <= 0) return [bg.r, bg.g, bg.b]

  return [
    Math.round((fg.r * fg.a + bg.r * backdropAlpha) / outAlpha),
    Math.round((fg.g * fg.a + bg.g * backdropAlpha) / outAlpha),
    Math.round((fg.b * fg.a + bg.b * backdropAlpha) / outAlpha),
  ]
}

function getCanvasColor(): Rgba | null {
  return parseColor(getComputedStyle(document.documentElement).backgroundColor)
}

function resolvedBackgroundLuminance(element: HTMLElement): number | null {
  const canvasColor = getCanvasColor()
  const backgroundColor = parseColor(getComputedStyle(element).backgroundColor)
  if (!backgroundColor || !canvasColor) return null

  const [r, g, b] = compositeOver(backgroundColor, canvasColor)
  return relativeLuminance(r, g, b)
}

export type SwatchTextTone = 'light' | 'dark'

export function getSwatchTextToneForBackground(element: HTMLElement): SwatchTextTone {
  const luminance = resolvedBackgroundLuminance(element)
  if (luminance === null) return 'dark'

  return luminance > 0.5 ? 'dark' : 'light'
}

export function needsInvertedTextBackground(element: HTMLElement): boolean {
  const color = parseColor(getComputedStyle(element).color)
  if (!color) return false

  return relativeLuminance(color.r, color.g, color.b) > 0.65
}
