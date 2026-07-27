/** Wikidata external-id properties treated as social / streaming links. */
export const SOCIAL_PROPERTY_IDS = [
  'P2002', // X (Twitter) username
  'P2003', // Instagram username
  'P2013', // Facebook ID
  'P2397', // YouTube channel ID
  'P7085', // TikTok username
  'P4264', // LinkedIn personal profile
  'P4033', // Mastodon address
  'P12386', // Bluesky handle
  'P1902', // Spotify artist ID
  'P2722', // Deezer artist ID
  'P2850', // Apple Music artist ID (U.S.)
  'P3040', // SoundCloud ID
  'P7192', // Bandcamp profile ID
  'P4576', // Tidal artist ID
] as const

const SOCIAL_PROPERTY_LABELS: Record<string, string> = {
  P2002: 'X',
  P2003: 'Instagram',
  P2013: 'Facebook',
  P2397: 'YouTube',
  P7085: 'TikTok',
  P4264: 'LinkedIn',
  P4033: 'Mastodon',
  P12386: 'Bluesky',
  P1902: 'Spotify',
  P2722: 'Deezer',
  P2850: 'Apple Music',
  P3040: 'SoundCloud',
  P7192: 'Bandcamp',
  P4576: 'Tidal',
}

const SOCIAL_HOST_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /(^|\.)instagram\.com$/i, label: 'Instagram' },
  { pattern: /(^|\.)bandcamp\.com$/i, label: 'Bandcamp' },
  { pattern: /(^|\.)twitter\.com$/i, label: 'X' },
  { pattern: /(^|\.)x\.com$/i, label: 'X' },
  { pattern: /(^|\.)facebook\.com$/i, label: 'Facebook' },
  { pattern: /(^|\.)fb\.com$/i, label: 'Facebook' },
  { pattern: /(^|\.)youtube\.com$/i, label: 'YouTube' },
  { pattern: /(^|\.)youtu\.be$/i, label: 'YouTube' },
  { pattern: /(^|\.)tiktok\.com$/i, label: 'TikTok' },
  { pattern: /(^|\.)linkedin\.com$/i, label: 'LinkedIn' },
  { pattern: /(^|\.)bsky\.app$/i, label: 'Bluesky' },
  { pattern: /(^|\.)spotify\.com$/i, label: 'Spotify' },
  { pattern: /(^|\.)deezer\.com$/i, label: 'Deezer' },
  { pattern: /(^|\.)music\.apple\.com$/i, label: 'Apple Music' },
  { pattern: /(^|\.)soundcloud\.com$/i, label: 'SoundCloud' },
  { pattern: /(^|\.)tidal\.com$/i, label: 'Tidal' },
]

export const socialPropertyRank = new Map<string, number>(
  SOCIAL_PROPERTY_IDS.map((propertyId, index) => [propertyId, index]),
)

export function isSocialPropertyId(propertyId: string): boolean {
  return socialPropertyRank.has(propertyId)
}

export function socialLabelFromHost(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    for (const { pattern, label } of SOCIAL_HOST_LABELS) {
      if (pattern.test(hostname)) return label
    }
  } catch {
    // ignore invalid URLs
  }
  return null
}

export function getSocialPlatformLabel(url: string, propertyId?: string): string | null {
  if (propertyId && SOCIAL_PROPERTY_LABELS[propertyId]) {
    return SOCIAL_PROPERTY_LABELS[propertyId]
  }
  return socialLabelFromHost(url)
}

export function isSocialPlatformUrl(url: string, propertyId?: string): boolean {
  if (propertyId && isSocialPropertyId(propertyId)) return true
  return socialLabelFromHost(url) !== null
}
