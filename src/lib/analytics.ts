/**
 * Thin wrapper over Umami custom events (`window.umami.track`).
 *
 * Umami is only injected into production builds when VITE_UMAMI_WEBSITE_ID is
 * set (see `analyticsPlugin` in vite.config.ts), so everywhere else this is a
 * no-op. Payloads are enums/numbers plus the song title / YouTube id (kept on
 * purpose to see what people sing); never lyrics text or local file names.
 */

export type AnalyticsEvent = 'song_create' | 'song_edit' | 'song_load' | 'obs_url_copy' | 'shortcuts_open' | 'kofi_click'

/** The Umami website is shared with other projects, so every event name is prefixed. */
const EVENT_PREFIX = 'lyribox_'

type Primitive = string | number | boolean

export function track(event: AnalyticsEvent, data?: Record<string, Primitive>): void {
  try {
    window.umami?.track(EVENT_PREFIX + event, data)
  } catch {
    // analytics must never break the app
  }
}
