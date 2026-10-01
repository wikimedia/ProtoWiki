import { t } from '@/i18n'
import { formatCompactNumber, formatShortDate, usesLocalizedFormat } from '@/lib/contentFormat'
import type { MostViewedArticle } from '../../template-homepage/ImpactModule.vue'

/*
 * Display strings are getters so they read in the interface language when the
 * fixture is spread into props, not when this module is imported. English keeps
 * its hand-written labels.
 */
const fixtureLabels = {
  get viewCount(): string {
    return usesLocalizedFormat() ? formatCompactNumber(628_700) : '628.7K'
  },
  get longestStreak(): string {
    return t('impact.streakDays', 3)
  },
  get lastEdited(): string {
    return t('impact.aMonthAgo')
  },
}

/** "Jun 5" in English; the interface language's short date otherwise. */
function fixtureDate(english: string, month: number, day: number): string {
  return usesLocalizedFormat() ? formatShortDate(new Date(Date.UTC(2026, month, day))) : english
}

/** Mobile link-card preview (Home + Contribute tabs). */
export const WIKITA_LITE_IMPACT = {
  get viewCount(): string {
    return fixtureLabels.viewCount
  },
  get viewLabel(): string {
    return t('impact.viewLabel')
  },
  totalEdits: 30,
  thanksReceived: 2,
  get longestStreak(): string {
    return fixtureLabels.longestStreak
  },
  editsReviewed: 34,
  sparklineData: [
    8200, 7900, 8100, 8300, 8000, 7800, 8150, 8400, 8250, 8050, 7900, 8200, 8350, 8100, 7950,
    8300, 8500, 8200, 8000, 8150, 8400, 8250, 8100, 7950, 7800, 8000, 8200, 8100, 7900, 8050,
    8300, 8150, 7950, 7800, 8000, 8200, 8400, 8100, 7900, 7800, 7500, 7600,
  ],
  get lastEdited(): string {
    return fixtureLabels.lastEdited
  },
} as const

export const WIKITA_LITE_IMPACT_FULL: {
  totalEdits: number
  thanksReceived: number
  editsReviewed: number
  lastEdited: string
  longestStreak: string
  viewCount: string
  viewLabel: string
  sparklineData: number[]
  recentActivityData: number[]
  activityStartDate: string
  activityEndDate: string
  mostViewed: MostViewedArticle[]
  viewAllEditsHref: string
} = {
  totalEdits: 30,
  thanksReceived: 2,
  editsReviewed: 34,
  get lastEdited() {
    return fixtureLabels.lastEdited
  },
  get longestStreak() {
    return fixtureLabels.longestStreak
  },
  get viewCount() {
    return fixtureLabels.viewCount
  },
  get viewLabel() {
    return t('impact.viewLabel')
  },
  sparklineData: [...WIKITA_LITE_IMPACT.sparklineData],
  recentActivityData: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1,
  ],
  get activityStartDate() {
    return fixtureDate('Jun 5', 5, 5)
  },
  get activityEndDate() {
    return fixtureDate('Aug 3', 7, 3)
  },
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
