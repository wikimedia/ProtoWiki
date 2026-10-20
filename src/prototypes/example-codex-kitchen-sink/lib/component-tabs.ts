export const buttonsSubTabs = [
  { id: 'button', label: 'Button' },
  { id: 'button-group', label: 'ButtonGroup' },
  { id: 'menu-button', label: 'MenuButton' },
  { id: 'toggle-button', label: 'ToggleButton' },
  { id: 'toggle-button-group', label: 'ToggleButtonGroup' },
] as const

export const formElementsSubTabs = [
  { id: 'checkbox', label: 'Checkbox' },
  { id: 'chip-input', label: 'ChipInput' },
  { id: 'combobox', label: 'Combobox' },
  { id: 'field', label: 'Field' },
  { id: 'label', label: 'Label' },
  { id: 'lookup', label: 'Lookup' },
  { id: 'multiselect-lookup', label: 'MultiselectLookup' },
  { id: 'radio', label: 'Radio' },
  { id: 'select', label: 'Select' },
  { id: 'text-area', label: 'TextArea' },
  { id: 'text-input', label: 'TextInput' },
  { id: 'toggle-switch', label: 'ToggleSwitch' },
] as const

export const contentDataSubTabs = [
  { id: 'accordion', label: 'Accordion' },
  { id: 'card', label: 'Card' },
  { id: 'dialog', label: 'Dialog' },
  { id: 'menu', label: 'Menu' },
  { id: 'menu-item', label: 'MenuItem' },
  { id: 'popover', label: 'Popover' },
  { id: 'table', label: 'Table' },
  { id: 'tooltip', label: 'Tooltip' },
] as const

export const feedbackSubTabs = [
  { id: 'info-chip', label: 'InfoChip' },
  { id: 'message', label: 'Message' },
  { id: 'progress-bar', label: 'ProgressBar' },
  { id: 'progress-indicator', label: 'ProgressIndicator' },
  { id: 'toast', label: 'Toast' },
] as const

export const mediaSubTabs = [
  { id: 'image', label: 'Image' },
  { id: 'thumbnail', label: 'Thumbnail' },
] as const

export const navigationSubTabs = [
  { id: 'link', label: 'Link' },
  { id: 'tabs', label: 'Tabs' },
] as const

export const searchSubTabs = [
  { id: 'search-input', label: 'SearchInput' },
  { id: 'typeahead-search', label: 'TypeaheadSearch' },
  { id: 'search-result-title', label: 'SearchResultTitle' },
] as const

export const iconsSubTabs = [
  { id: 'size', label: 'Size' },
  { id: 'type', label: 'Type' },
] as const

/** Codex 2.x IconSizes — xx-small was removed and no longer applies sizing. */
export const iconSizeEntries = [
  { id: 'x-small', deprecated: false },
  { id: 'small', deprecated: false },
  { id: 'medium', deprecated: false },
  { id: 'xx-small', deprecated: true },
] as const
