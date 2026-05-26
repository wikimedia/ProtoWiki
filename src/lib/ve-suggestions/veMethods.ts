import type { FakeWiki } from 'fakewiki'
import type { FWVeSuggestionResponse } from 'fakewiki/types'

export interface VeMethodDescriptor {
  methodName: string
  run: (wiki: FakeWiki, pageTitle: string) => Promise<FWVeSuggestionResponse>
}

export const VE_METHODS: VeMethodDescriptor[] = [
  {
    methodName: 'getVeToneSuggestions',
    run: (client, title) =>
      client.getVeToneSuggestions(title, { threshold: 0.8, maxCandidates: 20 }),
  },
  {
    methodName: 'getVeTextMatchSuggestions',
    run: (client, title) => client.getVeTextMatchSuggestions(title),
  },
  {
    methodName: 'getVeExternalLinkSuggestions',
    run: (client, title) => client.getVeExternalLinkSuggestions(title),
  },
  {
    methodName: 'getVeDuplicateLinkSuggestions',
    run: (client, title) => client.getVeDuplicateLinkSuggestions(title, { scope: 'paragraph' }),
  },
  {
    methodName: 'getVeDisambiguationSuggestions',
    run: (client, title) => client.getVeDisambiguationSuggestions(title),
  },
  {
    methodName: 'getVeAddReferenceSuggestions',
    run: (client, title) => client.getVeAddReferenceSuggestions(title),
  },
  {
    methodName: 'getVeImageCaptionSuggestions',
    run: (client, title) => client.getVeImageCaptionSuggestions(title),
  },
  {
    methodName: 'getVeYearLinkSuggestions',
    run: (client, title) => client.getVeYearLinkSuggestions(title),
  },
  {
    methodName: 'getVeConvertReferenceSuggestions',
    run: (client, title) =>
      client.getVeConvertReferenceSuggestions(title, { strict: 'url-only' }),
  },
  {
    methodName: 'getVeCitationNeededSuggestions',
    run: (client, title) => client.getVeCitationNeededSuggestions(title),
  },
  {
    methodName: 'getVeDoubleBoldSuggestions',
    run: (client, title) => client.getVeDoubleBoldSuggestions(title),
  },
  {
    methodName: 'getVeRequiredTemplateParamSuggestions',
    run: (client, title) => client.getVeRequiredTemplateParamSuggestions(title),
  },
  {
    methodName: 'getVeRedirectSuggestions',
    run: (client, title) => client.getVeRedirectSuggestions(title),
  },
  {
    methodName: 'getVeSuggestedLinkSuggestions',
    run: (client, title) => client.getVeSuggestedLinkSuggestions(title, { threshold: 0.8 }),
  },
  {
    methodName: 'getVeFakeHeadingSuggestions',
    run: (client, title) => client.getVeFakeHeadingSuggestions(title),
  },
]

export const VE_METHOD_COUNT = VE_METHODS.length
