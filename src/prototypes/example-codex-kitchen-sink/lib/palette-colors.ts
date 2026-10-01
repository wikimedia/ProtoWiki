export interface PaletteColor {
  name: string
  value: string
}

export interface PaletteGroup {
  family: string
  colors: PaletteColor[]
}

/** Raw Codex palette from https://doc.wikimedia.org/codex/latest/style-guide/colors.html */
export const codexPaletteGroups: PaletteGroup[] = [
  {
    family: 'White',
    colors: [{ name: 'white', value: '#fff' }],
  },
  {
    family: 'Black',
    colors: [{ name: 'black', value: '#000' }],
  },
  {
    family: 'Gray',
    colors: [
      { name: 'gray50', value: '#f8f9fa' },
      { name: 'gray100', value: '#eaecf0' },
      { name: 'gray200', value: '#dadde3' },
      { name: 'gray300', value: '#c8ccd1' },
      { name: 'gray400', value: '#a2a9b1' },
      { name: 'gray500', value: '#72777d' },
      { name: 'gray600', value: '#54595d' },
      { name: 'gray700', value: '#404244' },
      { name: 'gray800', value: '#27292d' },
      { name: 'gray900', value: '#202122' },
      { name: 'gray1000', value: '#101418' },
    ],
  },
  {
    family: 'Red',
    colors: [
      { name: 'red50', value: '#ffe9e5' },
      { name: 'red100', value: '#ffdad3' },
      { name: 'red200', value: '#ffc8bd' },
      { name: 'red300', value: '#fea898' },
      { name: 'red400', value: '#fd7865' },
      { name: 'red500', value: '#f54739' },
      { name: 'red600', value: '#d74032' },
      { name: 'red700', value: '#bf3c2c' },
      { name: 'red800', value: '#9f3526' },
      { name: 'red900', value: '#612419' },
      { name: 'red1000', value: '#3c1a13' },
    ],
  },
  {
    family: 'Orange',
    colors: [
      { name: 'orange50', value: '#ffead4' },
      { name: 'orange100', value: '#ffdcb8' },
      { name: 'orange200', value: '#ffc894' },
      { name: 'orange300', value: '#ffa758' },
      { name: 'orange400', value: '#f97f26' },
      { name: 'orange500', value: '#d46926' },
      { name: 'orange600', value: '#bb5c26' },
      { name: 'orange700', value: '#a95226' },
      { name: 'orange800', value: '#8e4424' },
      { name: 'orange900', value: '#572c19' },
      { name: 'orange1000', value: '#361d13' },
    ],
  },
  {
    family: 'Yellow',
    colors: [
      { name: 'yellow50', value: '#fdf2d5' },
      { name: 'yellow100', value: '#ffe49c' },
      { name: 'yellow200', value: '#ffcf4f' },
      { name: 'yellow300', value: '#edb537' },
      { name: 'yellow400', value: '#ca982e' },
      { name: 'yellow500', value: '#ab7f2a' },
      { name: 'yellow600', value: '#987027' },
      { name: 'yellow700', value: '#886425' },
      { name: 'yellow800', value: '#735421' },
      { name: 'yellow900', value: '#453217' },
      { name: 'yellow1000', value: '#2d2212' },
    ],
  },
  {
    family: 'Lime',
    colors: [
      { name: 'lime50', value: '#e3f2e4' },
      { name: 'lime100', value: '#d1e9d2' },
      { name: 'lime200', value: '#b9debc' },
      { name: 'lime300', value: '#94cb9a' },
      { name: 'lime400', value: '#5db26c' },
      { name: 'lime500', value: '#259948' },
      { name: 'lime600', value: '#1f893f' },
      { name: 'lime700', value: '#1f7a39' },
      { name: 'lime800', value: '#1f6631' },
      { name: 'lime900', value: '#183f20' },
      { name: 'lime1000', value: '#142817' },
    ],
  },
  {
    family: 'Green',
    colors: [
      { name: 'green50', value: '#dff2eb' },
      { name: 'green100', value: '#c9eadd' },
      { name: 'green200', value: '#aedfcd' },
      { name: 'green300', value: '#80cdb3' },
      { name: 'green400', value: '#2cb491' },
      { name: 'green500', value: '#099979' },
      { name: 'green600', value: '#14876b' },
      { name: 'green700', value: '#177860' },
      { name: 'green800', value: '#196551' },
      { name: 'green900', value: '#153d31' },
      { name: 'green1000', value: '#132821' },
    ],
  },
  {
    family: 'Blue',
    colors: [
      { name: 'blue50', value: '#e8eeff' },
      { name: 'blue100', value: '#d9e2ff' },
      { name: 'blue200', value: '#b6d4fb' },
      { name: 'blue300', value: '#a6bbf5' },
      { name: 'blue400', value: '#88a3e8' },
      { name: 'blue500', value: '#6485d1' },
      { name: 'blue600', value: '#4b77d6' },
      { name: 'blue700', value: '#36c' },
      { name: 'blue800', value: '#3056a9' },
      { name: 'blue900', value: '#233566' },
      { name: 'blue1000', value: '#1b223d' },
    ],
  },
  {
    family: 'Purple',
    colors: [
      { name: 'purple50', value: '#f0ecf6' },
      { name: 'purple100', value: '#e6e0f0' },
      { name: 'purple200', value: '#d9d0e9' },
      { name: 'purple300', value: '#c5b9dd' },
      { name: 'purple400', value: '#a799cd' },
      { name: 'purple500', value: '#8d7ebd' },
      { name: 'purple600', value: '#7a6db7' },
      { name: 'purple700', value: '#6a60b0' },
      { name: 'purple800', value: '#534fa3' },
      { name: 'purple900', value: '#353262' },
      { name: 'purple1000', value: '#23203b' },
    ],
  },
  {
    family: 'Pink',
    colors: [
      { name: 'pink50', value: '#f5ebf2' },
      { name: 'pink100', value: '#eedeea' },
      { name: 'pink200', value: '#e6cede' },
      { name: 'pink300', value: '#d9b4cd' },
      { name: 'pink400', value: '#c690b4' },
      { name: 'pink500', value: '#b5739e' },
      { name: 'pink600', value: '#ac5c90' },
      { name: 'pink700', value: '#9b527f' },
      { name: 'pink800', value: '#82456a' },
      { name: 'pink900', value: '#4e2c40' },
      { name: 'pink1000', value: '#311e28' },
    ],
  },
  {
    family: 'Maroon',
    colors: [
      { name: 'maroon50', value: '#f6ebeb' },
      { name: 'maroon100', value: '#f0dedd' },
      { name: 'maroon200', value: '#e8cecd' },
      { name: 'maroon300', value: '#dcb5b3' },
      { name: 'maroon400', value: '#c99391' },
      { name: 'maroon500', value: '#b57775' },
      { name: 'maroon600', value: '#ac6262' },
      { name: 'maroon700', value: '#9f5555' },
      { name: 'maroon800', value: '#854848' },
      { name: 'maroon900', value: '#512e2e' },
      { name: 'maroon1000', value: '#321f1e' },
    ],
  },
]

export const codexPaletteColors = codexPaletteGroups.flatMap((group) => group.colors)
