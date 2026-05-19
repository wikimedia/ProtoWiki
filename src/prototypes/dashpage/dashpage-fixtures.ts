import type { MostViewedArticle } from './ImpactModule.vue'

/** App gallery home — mobile link cards navigate here for now. */
export const APP_HOME = '/'

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
  note: "This experienced user knows you're new and can help you with editing.",
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

export const MODULE = {
  thankTitle: 'Contribute',
  thankBody: 'No suggestions (yet)',
  policiesTitle: 'Learn',
  policiesBody: 'Learn how to edit Wikipedia',
} as const
