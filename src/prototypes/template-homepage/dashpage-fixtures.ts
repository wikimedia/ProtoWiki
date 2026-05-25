import type { MostViewedArticle } from './ImpactModule.vue'

/** App gallery home — placeholder target for other mobile link cards. */
export const APP_HOME = '/'

/** Dashpage prototype route (template-homepage). */
export const HOMEPAGE = '/template-homepage'

/** Full-page mobile drill-down for the Your impact module. */
export const IMPACT_PAGE = '/template-homepage/impact'

/** Full-page mobile drill-down for the Get help with editing module. */
export const HELP_PAGE = '/template-homepage/help'

/** Full-page mobile drill-down for the Your mentor module. */
export const MENTOR_PAGE = '/template-homepage/mentor'

/** Full-page mobile drill-down for the Suggested edits module. */
export const SUGGESTED_EDITS_PAGE = '/template-homepage/suggested-edits'

/** Full-page mobile drill-down for the Recent changes module. */
export const RECENT_CHANGES_PAGE = '/template-homepage/recent-changes'

/** Mobile link-card preview copy (title is also the full-page header). */
export const HELP_MODULE = {
  title: 'Get help with editing',
  summary: 'Ask the help desk or read help pages.',
} as const

export const HELP_LINKS = [
  { label: 'How to edit a page', href: '#' },
  { label: 'How to add an image', href: '#' },
  { label: 'How to edit a citation', href: '#' },
  { label: 'Simplified Manual of Style', href: '#' },
  { label: 'How to write a good article', href: '#' },
  { label: 'How to create a new article', href: '#' },
]

export const MENTOR = {
  name: 'Samwalton9',
  editCount: 12596,
  lastActiveDaysAgo: 451,
  note: 'Welcome to Wikipedia! Let me know if you have any questions',
  learnMoreHref: '#',
  conversationsHref: '#',
} as const

export const IMPACT = {
  viewCount: '10.8K',
  sparklineData: [
    420, 390, 410, 430, 400, 380, 415, 440, 425, 405, 390, 420, 435, 410, 395, 430, 450, 420, 400,
    415, 440, 425, 410, 395, 380, 400, 420, 410, 390, 405, 430, 415, 395, 380, 400, 420, 440, 410,
    390, 380, 350, 360,
  ],
  lastEdited: '5 months ago',
  longestStreak: '1 day',
} as const

export const IMPACT_DESKTOP: {
  totalEdits: number
  thanksReceived: number
  lastEdited: string
  longestStreak: string
  viewCount: string
  sparklineData: number[]
  recentActivityData: number[]
  activityStartDate: string
  activityEndDate: string
  mostViewed: MostViewedArticle[]
  viewAllEditsHref: string
} = {
  totalEdits: 52,
  thanksReceived: 0,
  lastEdited: '5 months ago',
  longestStreak: '1 day',
  viewCount: '10,754',
  sparklineData: [
    420, 390, 410, 430, 400, 380, 415, 440, 425, 405, 390, 420, 435, 410, 395, 430, 450, 420, 400,
    415, 440, 425, 410, 395, 380, 400, 420, 410, 390, 405, 430, 415, 395, 380, 400, 420, 440, 410,
    390, 380, 350, 360,
  ],
  recentActivityData: [
    0, 0, 2, 0, 1, 0, 0, 3, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0,
    0, 2, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
  ],
  activityStartDate: 'Mar 17',
  activityEndDate: 'May 15',
  mostViewed: [
    {
      title: 'Bora Bora',
      views: 4821,
      sparklineData: [300, 320, 280, 350, 310, 290, 340, 360, 330, 300],
      href: '#',
    },
    {
      title: 'Wikipedia',
      views: 3104,
      sparklineData: [200, 210, 195, 220, 205, 215, 200, 210, 205, 195],
      href: '#',
    },
    {
      title: 'Atlantic Ocean',
      views: 2187,
      sparklineData: [150, 160, 145, 170, 155, 140, 160, 155, 145, 150],
      href: '#',
    },
  ],
  viewAllEditsHref: '#',
}

/** Static structured-tasks mock — shared by homepage module and fullscreen subpage. */
export const STRUCTURED_TASKS = {
  currentIndex: 1,
  totalCount: 173450,
  topicFilter: 'Music',
  difficultyFilter: 'Easy, Medium, …',
  articleTitle: 'Okta Logue',
  articleDescription:
    'Okta Logue are a four-piece rock band based in Griesheim, Hessen Germany. The members consist o',
  /** Action API `pageimages` + `pithumbsize=640` for [[Okta Logue]] (Commons serves 960px rendition) */
  thumbnailSrc:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Okta_Logue_Moltow_HH_2019.jpg/960px-Okta_Logue_Moltow_HH_2019.jpg',
  pageviewsLabel: '258 visits (past 60 days)',
  taskHeading: 'Add links between articles',
  taskDifficulty: 'easy' as const,
  taskTimeEstimate: '3–5 minutes',
  taskDescription: 'Make words from one article link to another article.',
  editHref: '#',
} as const
