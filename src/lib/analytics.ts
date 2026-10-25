/**
 * Thin wrapper over Umami custom events (`window.umami.track`).
 *
 * Umami is only injected into production builds when VITE_UMAMI_WEBSITE_ID is
 * set (see `analyticsPlugin` in vite.config.ts), so everywhere else this is a
 * no-op. Payloads are enums/numbers plus the song title / YouTube id (kept on
 * purpose to see what people sing); never lyrics text or local file names.
 */

export type AnalyticsEvent =
  | 'song_create'
  | 'song_edit'
  | 'song_load'
  | 'play'
  | 'pitch_change'
  | 'lyrics_search'
  | 'obs_url_copy'
  | 'songs_export'
  | 'songs_import'
  | 'theme_toggle'
  | 'shortcuts_open'

type Primitive = string | number | boolean

export function track(event: AnalyticsEvent, data?: Record<string, Primitive>): void {
  try {
    window.umami?.track(event, data)
  } catch {
    // analytics must never break the app
  }
}
