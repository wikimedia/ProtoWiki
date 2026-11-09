import {
  cdxIconEdit,
  cdxIconHistory,
  cdxIconTrash,
} from '@wikimedia/codex-icons'

export const MENU_ITEMS = [
  { value: 'one', label: 'Action one' },
  { value: 'two', label: 'Action two' },
  { value: 'three', label: 'Action three' },
]

export const MENU_ITEMS_WITH_ICONS = [
  { value: 'one', label: 'Action one', icon: cdxIconEdit },
  { value: 'two', label: 'Action two', icon: cdxIconHistory },
  { value: 'three', label: 'Action three', icon: cdxIconTrash },
]

export const MENU_ITEMS_WITH_DESCRIPTIONS = [
  { value: 'one', label: 'Action one', description: 'Description one' },
  { value: 'two', label: 'Action two', description: 'Description two' },
  { value: 'three', label: 'Action three', description: 'Description three' },
]

export const MENU_ITEMS_WITH_ICONS_AND_DESCRIPTIONS = [
  {
    value: 'one',
    label: 'Action one',
    description: 'Description one',
    icon: cdxIconEdit,
  },
  {
    value: 'two',
    label: 'Action two',
    description: 'Description two',
    icon: cdxIconHistory,
  },
  {
    value: 'three',
    label: 'Action three',
    description: 'Description three',
    icon: cdxIconTrash,
  },
]

export const SELECT_MENU_ITEMS = [
  { value: 'one', label: 'Option one' },
  { value: 'two', label: 'Option two' },
  { value: 'three', label: 'Option three' },
]

export const CHIP_SUGGESTIONS = [
  { value: 'one', label: 'Chip one' },
  { value: 'two', label: 'Chip two' },
  { value: 'three', label: 'Chip three' },
  { value: 'four', label: 'Chip four' },
]
