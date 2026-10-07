import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

const REVERT_RISK_URL =
  'https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-language-agnostic:predict'

/** Model-card high-precision band for surfacing a chip. */
export const HIGH_REVERT_RISK_THRESHOLD = 0.9

const revertRiskByRevid = new Map<number, boolean>()

type RevertRiskResponse = {
  output?: {
    probabilities?: {
      true?: number
    }
  }
}

export function getCachedHighRevertRisk(revid: number): boolean | undefined {
  return revertRiskByRevid.get(revid)
}

export async function fetchHighRevertRisk(
  revid: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const cached = revertRiskByRevid.get(revid)
  if (cached !== undefined) return cached

  const response = await fetchWikimedia(REVERT_RISK_URL, {
    method: 'POST',
    signal,
    headers: {
      ...wikimediaApiFetchHeaders('wikitab-revert-risk'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ rev_id: revid, lang: 'en' }),
  })

  if (!response.ok) return false

  const json = (await response.json()) as RevertRiskResponse
  const probability = json.output?.probabilities?.true ?? 0
  const highRisk = probability >= HIGH_REVERT_RISK_THRESHOLD

  revertRiskByRevid.set(revid, highRisk)
  return highRisk
}
