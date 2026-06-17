import { cdxIconAdd, cdxIconEdit, cdxIconTrash } from '@wikimedia/codex-icons'
import type { ChipInputItem, MenuItemData, SearchResult, TableColumn, TableRow } from '@wikimedia/codex'

export const menuItems: MenuItemData[] = [
  { label: 'Edit', value: 'edit', icon: cdxIconEdit },
  { label: 'Delete', value: 'delete', icon: cdxIconTrash },
  { label: 'Add', value: 'add', icon: cdxIconAdd },
]

export const selectOptions = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]

export const lookupResults: MenuItemData[] = [
  { label: 'Albert Einstein', value: 'Albert Einstein' },
  { label: 'Albert Camus', value: 'Albert Camus' },
  { label: 'Alberta', value: 'Alberta' },
]

export const chipItems: ChipInputItem[] = [
  { value: 'alpha' },
  { value: 'beta' },
]

export const tableColumns: TableColumn[] = [
  { id: 'title', label: 'Title', sortable: true },
  { id: 'status', label: 'Status', sortable: true },
  { id: 'views', label: 'Views', sortable: true },
]

export const tableRows: TableRow[] = [
  { id: '1', title: 'Mont Blanc', status: 'Published', views: 1200 },
  { id: '2', title: 'Lake Geneva', status: 'Draft', views: 340 },
  { id: '3', title: 'Rhine', status: 'Published', views: 890 },
]

export const searchResults: SearchResult[] = [
  { label: 'Albert Einstein', title: 'Albert Einstein', description: 'German-born theoretical physicist' },
  { label: 'Albert Camus', title: 'Albert Camus', description: 'French philosopher and author' },
]

const wetLegImageUrl = `${import.meta.env.BASE_URL}images/wet-leg-o2-infobox.jpg`

export const thumbnailUrl = wetLegImageUrl

export const imageUrl = wetLegImageUrl

export const buttonGroupItems = [
  { value: 'edit', label: 'Edit' },
  { value: 'history', label: 'History' },
  { value: 'watch', label: 'Watch' },
]

export const buttonGroupLongItems = [
  { value: 'all', label: 'All' },
  { value: 'newcomers', label: 'Newcomers' },
  { value: 'mobile', label: 'Mobile edits' },
  { value: 'needs-review', label: 'Needs review' },
]

export const toggleGroupItems = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]
