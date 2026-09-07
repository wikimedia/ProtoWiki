/**
 * Wikita color palette from Figma.
 * @see https://www.figma.com/design/Nfwe0U9z59oR4CpYO810wF/Wikita?node-id=83-864
 */
export const WIKITA_PALETTE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
] as const

export type WikitaPaletteStep = (typeof WIKITA_PALETTE_STEPS)[number]

export type WikitaPaletteFamily =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'maroon'

export type WikitaPalette = Record<WikitaPaletteFamily, Record<WikitaPaletteStep, string>>

export const WIKITA_PALETTE: WikitaPalette = {
  gray: {
    50: '#f3f3f3',
    100: '#ebebeb',
    200: '#dbdbdb',
    300: '#ccc',
    400: '#a8a8a8',
    500: '#787878',
    600: '#595959',
    700: '#424242',
    800: '#292929',
    900: '#212121',
    1000: '#171717',
  },
  red: {
    50: '#ffeeeb',
    100: '#ffe1db',
    200: '#ffc8bd',
    300: '#fea998',
    400: '#ff7357',
    500: '#ff2b00',
    600: '#e02500',
    700: '#c92200',
    800: '#ad1d00',
    900: '#6b1200',
    1000: '#470c00',
  },
  orange: {
    50: '#ffede0',
    100: '#ffe1cc',
    200: '#ffc8a1',
    300: '#ffa666',
    400: '#ff7a1a',
    500: '#db5b00',
    600: '#c75300',
    700: '#ad4800',
    800: '#963f00',
    900: '#5c2600',
    1000: '#3b1800',
  },
  yellow: {
    50: '#fff0c9',
    100: '#ffe49c',
    200: '#ffcf4f',
    300: '#f2b200',
    400: '#cf9700',
    500: '#a87b00',
    600: '#997000',
    700: '#856100',
    800: '#735400',
    900: '#453200',
    1000: '#2e2200',
  },
  lime: {
    50: '#b8ffcd',
    100: '#85ffa9',
    200: '#00f249',
    300: '#00de43',
    400: '#00ba38',
    500: '#00992e',
    600: '#008a29',
    700: '#007824',
    800: '#00691f',
    900: '#004013',
    1000: '#002b0d',
  },
  green: {
    50: '#c7ffee',
    100: '#76ffd6',
    200: '#00f3aa',
    300: '#00db9a',
    400: '#00b881',
    500: '#009669',
    600: '#00875f',
    700: '#007552',
    800: '#006647',
    900: '#003d2b',
    1000: '#002b1e',
  },
  blue: {
    50: '#edf3ff',
    100: '#dbe7ff',
    200: '#c2d6ff',
    300: '#a3c2ff',
    400: '#709fff',
    500: '#3d7dff',
    600: '#246cff',
    700: '#0052f5',
    800: '#0049db',
    900: '#002d87',
    1000: '#001f5e',
  },
  purple: {
    50: '#f6f0ff',
    100: '#eee3ff',
    200: '#e0ccff',
    300: '#d1b2ff',
    400: '#b787ff',
    500: '#9f5eff',
    600: '#934aff',
    700: '#812bff',
    800: '#6700ff',
    900: '#4100a1',
    1000: '#2c006e',
  },
  pink: {
    50: '#ffedfa',
    100: '#ffdef6',
    200: '#ffc2ee',
    300: '#ffa1e5',
    400: '#ff63d4',
    500: '#f500b1',
    600: '#e000a3',
    700: '#c2008d',
    800: '#a8007a',
    900: '#6b004e',
    1000: '#470034',
  },
  maroon: {
    50: '#ffedf1',
    100: '#ffe0e8',
    200: '#ffc7d5',
    300: '#ffa6bd',
    400: '#ff6e93',
    500: '#ff215a',
    600: '#f0003d',
    700: '#cf0035',
    800: '#b2002e',
    900: '#70001d',
    1000: '#4d0014',
  },
}

export function wikitaColor(family: WikitaPaletteFamily, step: WikitaPaletteStep): string {
  return WIKITA_PALETTE[family][step]
}
