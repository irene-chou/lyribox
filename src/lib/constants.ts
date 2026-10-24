import type { UISettings } from '@/types'

export const CONTROL_BTN_CLASS =
  'border border-lb-border bg-lb-bg-input text-lb-text-primary hover:bg-lb-bg-card hover:border-lb-text-dim transition-colors cursor-pointer'

export const CONTROL_BTN_STYLE: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 600,
  borderRadius: '4px',
  fontFamily: 'var(--font-sans)',
  lineHeight: 1,
}

export const OFFSET_BTN_STYLE: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '11px',
  borderRadius: '6px',
  fontFamily: 'var(--font-sans)',
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
  lyricsBgColor: 'rgba(0, 0, 0, 0)',
  sidebarWidth: 480,
}
