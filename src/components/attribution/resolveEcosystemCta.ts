import type { AttributionCta, AttributionEcosystemCta, AttributionSignals } from './types'

export function resolveEcosystemCta(
  signals: AttributionSignals | null | undefined,
  key: AttributionEcosystemCta,
): AttributionCta | null {
  if (!signals || key === 'none') return null

  const [group, id] = key.split(':') as ['donation' | 'participation', string]
  if (group === 'donation') {
    return signals.calls_to_action?.donation_ctas?.[id] ?? null
  }
  return signals.calls_to_action?.participation_ctas?.[id] ?? null
}
