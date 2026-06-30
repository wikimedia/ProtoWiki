import type { WikitaChromeHeaderVariant } from './headerVariantPreference'
import { wikitaColor } from './wikitaPalette'

const INVERTED_FG = 'var(--color-inverted-fixed)'

export type WikitaChromeHeaderVariantStyle = {
  bg: string
  border: string
  fg: string
  /** Light backgrounds use a dark translucent hover overlay. */
  lightHover: boolean
}

export const WIKITA_CHROME_HEADER_VARIANT_STYLES: Record<
  WikitaChromeHeaderVariant,
  WikitaChromeHeaderVariantStyle
> = {
  black: {
    bg: 'var(--background-color-inverted)',
    border: wikitaColor('gray', 800),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'off-black': {
    bg: wikitaColor('gray', 800),
    border: 'var(--color-base)',
    fg: INVERTED_FG,
    lightHover: false,
  },
  gray: {
    bg: wikitaColor('gray', 50),
    border: wikitaColor('gray', 200),
    fg: wikitaColor('gray', 500),
    lightHover: true,
  },
  'gray-bold': {
    bg: wikitaColor('gray', 500),
    border: wikitaColor('gray', 600),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'red-light': {
    bg: wikitaColor('red', 200),
    border: wikitaColor('red', 300),
    fg: wikitaColor('red', 500),
    lightHover: true,
  },
  'red-dark': {
    bg: wikitaColor('red', 500),
    border: wikitaColor('red', 600),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'orange-light': {
    bg: wikitaColor('orange', 100),
    border: wikitaColor('orange', 200),
    fg: wikitaColor('orange', 400),
    lightHover: true,
  },
  'orange-dark': {
    bg: wikitaColor('orange', 600),
    border: wikitaColor('orange', 700),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'brown-light': {
    bg: wikitaColor('orange', 400),
    border: wikitaColor('orange', 500),
    fg: wikitaColor('orange', 800),
    lightHover: true,
  },
  'orange-bold': {
    bg: wikitaColor('orange', 400),
    border: wikitaColor('orange', 300),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'yellow-light': {
    bg: wikitaColor('yellow', 50),
    border: wikitaColor('yellow', 100),
    fg: wikitaColor('yellow', 400),
    lightHover: true,
  },
  'yellow-bold': {
    bg: wikitaColor('yellow', 200),
    border: wikitaColor('yellow', 300),
    fg: wikitaColor('gray', 900),
    lightHover: true,
  },
  'lime-light': {
    bg: wikitaColor('lime', 100),
    border: wikitaColor('lime', 200),
    fg: wikitaColor('lime', 500),
    lightHover: true,
  },
  'lime-bold': {
    bg: wikitaColor('lime', 400),
    border: wikitaColor('lime', 500),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'green-light': {
    bg: wikitaColor('green', 200),
    border: wikitaColor('green', 300),
    fg: wikitaColor('green', 600),
    lightHover: true,
  },
  'green-dark': {
    bg: wikitaColor('green', 400),
    border: wikitaColor('green', 500),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'blue-light': {
    bg: wikitaColor('blue', 300),
    border: wikitaColor('blue', 400),
    fg: wikitaColor('blue', 600),
    lightHover: true,
  },
  'blue-bold': {
    bg: wikitaColor('blue', 500),
    border: wikitaColor('blue', 600),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'purple-light': {
    bg: wikitaColor('purple', 300),
    border: wikitaColor('purple', 400),
    fg: wikitaColor('purple', 700),
    lightHover: true,
  },
  'purple-bold': {
    bg: wikitaColor('purple', 500),
    border: wikitaColor('purple', 600),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'pink-light': {
    bg: wikitaColor('pink', 300),
    border: wikitaColor('pink', 400),
    fg: wikitaColor('pink', 800),
    lightHover: true,
  },
  'pink-bold': {
    bg: wikitaColor('pink', 500),
    border: wikitaColor('pink', 600),
    fg: INVERTED_FG,
    lightHover: false,
  },
  'maroon-light': {
    bg: wikitaColor('maroon', 300),
    border: wikitaColor('maroon', 400),
    fg: wikitaColor('maroon', 600),
    lightHover: true,
  },
  'maroon-bold': {
    bg: wikitaColor('maroon', 500),
    border: wikitaColor('maroon', 600),
    fg: INVERTED_FG,
    lightHover: false,
  },
}

export const WIKITA_CHROME_HEADER_LIGHT_HOVER_BG = 'rgba(0, 0, 0, 0.08)'
export const WIKITA_CHROME_HEADER_BOLD_HOVER_BG = 'rgba(255, 255, 255, 0.12)'
