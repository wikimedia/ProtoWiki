/** Static Learn tab content — matches Card 2.0 Learn module (Figma). */

export const LEARN_MENTOR = {
  title: 'Your mentor',
  description: 'Ask your mentor a question about editing.',
  supportingText: 'Yoda101, Active 2 hours ago',
} as const

export const LEARN_GUIDE = {
  title: 'How to edit a page',
  description: 'Introduction to editing on Wikipedia.',
  supportingText: 'Guide',
  href: 'https://en.wikipedia.org/wiki/Help:Introduction',
} as const

export const LEARN_VIDEO = {
  title: 'What makes Wikipedia different from other social media platforms?',
  description: 'Introduction to editing on Wikipedia.',
  supportingText: 'Wikiminute video',
  href: 'https://en.wikipedia.org/wiki/Wikipedia:Wikiminute',
  mediaPath: 'wikita-lite/wikiminute-social-media.png',
  mediaAlt:
    'Wikiminute video thumbnail: What makes Wikipedia different from social media platforms?',
} as const

export function learnVideoMediaUrl(): string {
  return `${import.meta.env.BASE_URL}${LEARN_VIDEO.mediaPath}`
}
