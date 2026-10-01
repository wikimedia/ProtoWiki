import { t } from '@/i18n'

import { capabilityPageUrl, wikiCapabilities } from '../../musical-group/data/wikiCapabilities'

/** Static Learn tab content — matches Card 2.0 Learn module (Figma). */

export const LEARN_MENTOR = {
  get title() {
    return t('modules.mentor')
  },
  get description() {
    return t('learn.mentorDescription')
  },
  /** Two supporting signals: who the mentor is, then when they were last active. */
  mentorName: 'Yoda101',
  get lastActiveLabel() {
    return t('learn.mentorLastActive', 2)
  },
}

export const LEARN_GUIDE = {
  get title() {
    return t('learn.guideTitle')
  },
  get description() {
    return t('learn.guideDescription')
  },
  get supportingText() {
    return t('learn.guideSupportingText')
  },
  /** The content wiki's own guide (`?lang=`). */
  get href() {
    return capabilityPageUrl(wikiCapabilities().editingGuidePage)
  },
}

export const LEARN_VIDEO = {
  get title() {
    return t('learn.videoTitle')
  },
  get description() {
    return t('learn.videoDescription')
  },
  get supportingText() {
    return t('learn.videoSupportingText')
  },
  href: 'https://en.wikipedia.org/wiki/Wikipedia:Wikiminute',
  mediaPath: 'wikita-lite/wikiminute-social-media.png',
  get mediaAlt() {
    return t('learn.videoMediaAlt')
  },
}

export function learnVideoMediaUrl(): string {
  return `${import.meta.env.BASE_URL}${LEARN_VIDEO.mediaPath}`
}
