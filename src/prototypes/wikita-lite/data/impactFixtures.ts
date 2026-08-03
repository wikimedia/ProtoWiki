import type { MostViewedArticle } from '../../template-homepage/ImpactModule.vue'

/** Mobile link-card preview (Home tab). */
export const WIKITA_LITE_IMPACT = {
  viewCount: '628.7K',
  sparklineData: [
    8200, 7900, 8100, 8300, 8000, 7800, 8150, 8400, 8250, 8050, 7900, 8200, 8350, 8100, 7950,
    8300, 8500, 8200, 8000, 8150, 8400, 8250, 8100, 7950, 7800, 8000, 8200, 8100, 7900, 8050,
    8300, 8150, 7950, 7800, 8000, 8200, 8400, 8100, 7900, 7800, 7500, 7600,
  ],
  lastEdited: 'a month ago',
  longestStreak: '3 days',
} as const

export const WIKITA_LITE_IMPACT_FULL: {
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
  totalEdits: 30,
  thanksReceived: 2,
  lastEdited: 'a month ago',
  longestStreak: '3 days',
  viewCount: '628.7K',
  sparklineData: [...WIKITA_LITE_IMPACT.sparklineData],
  recentActivityData: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1,
  ],
  activityStartDate: 'Jun 5',
  activityEndDate: 'Aug 3',
  mostViewed: [
    {
      title: 'Gorillaz',
      views: 282745,
      thumbnailSrc:
        'https://upload.wikimedia.org/wikipedia/en/thumb/4/4d/Gorillaz_-_Demon_Days.png/120px-Gorillaz_-_Demon_Days.png',
      href: 'https://en.wikipedia.org/wiki/Gorillaz',
      sparklineData: [28000, 29000, 27500, 30000, 28500, 29500, 28000, 29000, 28500, 27500],
    },
    {
      title: 'Wet Leg',
      views: 139863,
      thumbnailSrc:
        'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/Wet_Leg_-_Wet_Leg.png/120px-Wet_Leg_-_Wet_Leg.png',
      href: 'https://en.wikipedia.org/wiki/Wet_Leg',
      sparklineData: [14000, 14500, 13800, 15000, 14200, 14800, 14000, 14500, 14200, 13800],
    },
    {
      title: 'Jesy Nelson',
      views: 105142,
      thumbnailSrc:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Jesy_Nelson_2015.jpg/120px-Jesy_Nelson_2015.jpg',
      href: 'https://en.wikipedia.org/wiki/Jesy_Nelson',
      sparklineData: [10500, 10800, 10200, 11000, 10600, 10900, 10500, 10800, 10600, 10200],
    },
    {
      title: 'Rogue (Marvel Comics)',
      views: 88842,
      thumbnailSrc:
        'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Rogue_%28Marvel_Comics%29.jpg/120px-Rogue_%28Marvel_Comics%29.jpg',
      href: 'https://en.wikipedia.org/wiki/Rogue_(Marvel_Comics)',
      sparklineData: [8800, 9000, 8700, 9200, 8900, 9100, 8800, 9000, 8900, 8700],
    },
    {
      title: 'Trisha Goddard',
      views: 9365,
      thumbnailSrc:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Trisha_Goddard_2010.jpg/120px-Trisha_Goddard_2010.jpg',
      href: 'https://en.wikipedia.org/wiki/Trisha_Goddard',
      sparklineData: [900, 950, 880, 980, 920, 960, 900, 950, 920, 880],
    },
  ],
  viewAllEditsHref: '#',
}
