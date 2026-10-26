import type { ObsPreset, UISettings } from '@/types'

/** Seeded once into `useUISettingsStore.obsPresets`; users can edit or delete them. */
export const DEFAULT_OBS_PRESETS: ObsPreset[] = [
  { id: 'multi-line', name: '多行歌詞', params: {} },
  { id: 'subtitle', name: '單行字幕', params: { before: 0, after: 0, size: 56, align: 'center', title: false } },
]

export const CONTROL_BTN_CLASS =
  'border border-lb-border bg-lb-bg-input text-lb-text-primary hover:bg-lb-bg-card hover:border-lb-text-dim transition-colors cursor-pointer'

/** Small stepper button (+ / -). Min 26px tall so it stays clickable. */
export const CONTROL_BTN_STYLE: React.CSSProperties = {
  minWidth: '26px',
  height: '26px',
  padding: '0 8px',
  fontSize: '11px',
  fontWeight: 600,
  borderRadius: '4px',
  fontFamily: 'var(--font-sans)',
  lineHeight: 1,
}

export const OFFSET_BTN_STYLE: React.CSSProperties = {
  height: '28px',
  padding: '0 10px',
  fontSize: '11px',
  borderRadius: '6px',
  fontFamily: 'var(--font-sans)',
}

/** Icon-only button: 28×28 hit area, transparent until hover. */
export const ICON_BTN_CLASS =
  'flex items-center justify-center shrink-0 transition-colors cursor-pointer text-lb-text-secondary hover:text-lb-text-primary hover:bg-lb-bg-input'

export const ICON_BTN_STYLE: React.CSSProperties = {
  width: '28px',
  height: '28px',
  padding: 0,
  border: 'none',
  borderRadius: '6px',
  background: 'none',
}

export const DEFAULT_UI_SETTINGS: UISettings = {
  persistLocalAudio: true,
  activeFontSize: 32,
  otherFontSize: 28,
  titleFontSize: 18,
  showTitle: true,
  lyricsGap: 16,
  visibleBefore: 3,
  visibleAfter: 3,
  activeColor: '#ffffff',
  otherColor: '#9090a8',
  passedColor: '#5a5a70',
  lyricsBgColor: 'rgba(0, 0, 0, 0)',
  sidebarWidth: 480,
}
