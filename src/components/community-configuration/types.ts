/**
 * A feature that communities configure through Community Configuration — one
 * "provider" in the extension's terms. Each prototype declares its own; the
 * dashboard lists them, and each one gets an editor page.
 */
export interface CommunityConfigurationFeature {
  /** URL segment of its editor page, e.g. `AutoModerator` (the provider id, as on wiki). */
  id: string
  /** Display name, e.g. "Automoderator". The editor page is "Editing <title>". */
  title: string
  /** One line for the dashboard's feature card. */
  description: string
  /**
   * Where "View history" leads, e.g. the history of
   * `MediaWiki:AutoModeratorConfig.json`. Without it, the tab goes nowhere.
   */
  historyUrl?: string
}
