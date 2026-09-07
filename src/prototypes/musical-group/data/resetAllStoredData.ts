import { clearWikimediaFetchQueues } from '@/lib/fetchWikimedia'

import { clearCommonsImageCache } from './commonsImages'
import { clearFeaturedTabSessionCache } from './fetchFeaturedFeed'
import { clearFeaturedFeedSessionCache } from './fetchEnwikiFeaturedFeedDay'
import { clearTrendingSessionCache } from './fetchTrending'
import { clearWikitaArticleMemoryCache } from './fetchWikitaArticle'
import { clearHomeTabCache } from './homeTabCache'
import { clearItemThumbnailCache } from './itemThumbnailCache'
import { clearLiftWingCache, clearLiftWingMemoryCache } from './liftWing'
import { clearMusicalGroupCache } from './musicalGroupCache'
import { clearPageSummaryCache } from './pageSummaryCache'

/** Reset button: wipe all stored data and in-memory caches. */
export function resetAllStoredData(): void {
  clearMusicalGroupCache()
  clearHomeTabCache()
  clearPageSummaryCache()
  clearItemThumbnailCache()
  clearCommonsImageCache()
  clearLiftWingCache()
  clearLiftWingMemoryCache()
  clearFeaturedFeedSessionCache()
  clearFeaturedTabSessionCache()
  clearTrendingSessionCache()
  clearWikitaArticleMemoryCache()
  clearWikimediaFetchQueues()
}
