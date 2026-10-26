import type { ObsDisplaySettings, UISettings } from '@/types'

export const OBS_SETTING_KEYS = [
  'activeFontSize',
  'otherFontSize',
  'titleFontSize',
  'showTitle',
  'lyricsGap',
  'visibleBefore',
  'visibleAfter',
  'activeColor',
  'otherColor',
  'passedColor',
  'lyricsBgColor',
] as const satisfies readonly (keyof ObsDisplaySettings)[]

/** Extract the OBS-relevant subset of UI settings. */
export function pickObsSettings(ui: UISettings): ObsDisplaySettings {
  const out = {} as ObsDisplaySettings
  for (const key of OBS_SETTING_KEYS) {
    ;(out as Record<string, unknown>)[key] = ui[key]
  }
  return out
}

/**
 * Shallow diff: keys in `next` whose value differs from `prev`.
 * Returns null when nothing changed so callers can skip the broadcast.
 */
export function diffSettings(
  prev: ObsDisplaySettings,
  next: ObsDisplaySettings,
): Partial<ObsDisplaySettings> | null {
  let patch: Partial<ObsDisplaySettings> | null = null
  for (const key of OBS_SETTING_KEYS) {
    if (prev[key] !== next[key]) {
      patch ??= {}
      ;(patch as Record<string, unknown>)[key] = next[key]
    }
  }
  return patch
}
