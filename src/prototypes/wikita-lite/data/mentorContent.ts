import { t } from '@/i18n'

/** Static Mentor module content — matches Figma T419358-Home. */

export const MENTOR_MODULE_TITLES = {
  get unassigned() {
    return t('modules.mentorUnassigned')
  },
  get assigned() {
    return t('modules.mentor')
  },
}

export const MENTOR_UNASSIGNED = {
  get description() {
    return t('mentor.unassignedDescription')
  },
  get cta() {
    return t('mentor.unassignedCta')
  },
}

export const MENTOR_ASSIGNED = {
  get assignmentNotice() {
    return t('mentor.assignmentNotice')
  },
  get cta() {
    return t('mentor.assignedCta')
  },
  profile: {
    name: 'Samwalton9',
    initial: 'S',
    /** Prototype copy in the mentor's voice — translated; the username stays. */
    get bio() {
      return t('mentor.profileBio')
    },
    get editingSince() {
      return t('mentor.editingSince', 2011)
    },
  },
}
