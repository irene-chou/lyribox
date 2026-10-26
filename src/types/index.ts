export interface LyricLine {
  time: number
  text: string
}

export type AudioSource = 'youtube' | 'local'

export interface Folder {
  id: number
  name: string
  createdAt: number
  updatedAt: number
}

export interface Song {
  id: number
  name: string
  lrcText: string
  offset: number
  pitch: number
  audioSource: AudioSource
  youtubeId: string | null
  audioFileName: string | null
  folderId: number | null
  createdAt: number
  updatedAt: number
}

/** Local audio file persisted in IndexedDB so the user need not re-pick it. */
export interface AudioFileRecord {
  songId: number
  name: string
  type: string
  size: number
  blob: Blob
  savedAt: number
}

export interface UISettings {
  /** Store picked local audio files in the browser (IndexedDB). */
  persistLocalAudio: boolean
  activeFontSize: number
  otherFontSize: number
  titleFontSize: number
  showTitle: boolean
  lyricsGap: number
  visibleBefore: number
  visibleAfter: number
  activeColor: string
  otherColor: string
  /** Color for lines that have already been sung. */
  passedColor: string
  lyricsBgColor: string
  sidebarWidth: number
}

export type ObsAlign = 'left' | 'center' | 'right'

/**
 * URL query parameters understood by `public/obs.html` to override the
 * appearance of a single OBS browser source (see `lib/obs-params.ts`).
 */
export interface ObsUrlParams {
  /** Horizontal text alignment of the lyrics block. */
  align?: ObsAlign
  /** Draw a dark text shadow behind lyrics (helps over bright video). */
  shadow?: boolean
  /** Animate size / colour transitions between lines (default on). */
  anim?: boolean
  /** Lines shown before the active line (overrides synced visibleBefore). */
  before?: number
  /** Lines shown after the active line (overrides synced visibleAfter). */
  after?: number
  /** Active line font size in px (overrides synced activeFontSize). */
  size?: number
  /** Other lines font size in px (overrides synced otherFontSize). */
  otherSize?: number
  /** Show the "Now singing" title block (overrides synced showTitle). */
  title?: boolean
  /** CSS colour for the page background (overrides synced lyricsBgColor). */
  bg?: string
}

/** A named set of OBS URL params the user can pick when copying the OBS URL. */
export interface ObsPreset {
  id: string
  name: string
  params: ObsUrlParams
}

export type Theme = 'light' | 'dark'

export type PlaybackStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'ENDED'

/** The subset of UISettings the OBS page renders. Synced as one object. */
export type ObsDisplaySettings = Pick<
  UISettings,
  | 'activeFontSize'
  | 'otherFontSize'
  | 'titleFontSize'
  | 'showTitle'
  | 'lyricsGap'
  | 'visibleBefore'
  | 'visibleAfter'
  | 'activeColor'
  | 'otherColor'
  | 'passedColor'
  | 'lyricsBgColor'
>

/** Bumped when the wire format of FULL_STATE / settings messages changes. */
export const SYNC_PROTOCOL_VERSION = 2

export type SyncMessageType =
  | 'FULL_STATE'
  | 'LYRICS_LOADED'
  | 'SYNC_UPDATE'
  | 'SETTINGS_PATCH'
  | 'OFFSET'
  | 'REQUEST_STATE'
  // Deprecated per-field settings types (protocol v1). The app no longer sends
  // them; obs.html still accepts them for one release. Remove in the next version.
  | 'FONT_SIZE'
  | 'LYRIC_COLORS'
  | 'TITLE_FONT_SIZE'
  | 'LYRICS_GAP'
  | 'VISIBLE_RANGE'

export interface FullStateData extends ObsDisplaySettings {
  v: typeof SYNC_PROTOCOL_VERSION
  lyrics: LyricLine[]
  songTitle: string
  currentLineIndex: number
  offset: number
  settings: ObsDisplaySettings
}

export type SyncMessage =
  | { type: 'SYNC_UPDATE'; data: { currentLineIndex: number } }
  | { type: 'LYRICS_LOADED'; data: { lyrics: LyricLine[]; songTitle: string } }
  | { type: 'OFFSET'; data: { offset: number } }
  | { type: 'SETTINGS_PATCH'; data: Partial<ObsDisplaySettings> }
  | { type: 'FULL_STATE'; data: FullStateData }
  | { type: 'REQUEST_STATE'; data: null }
  /** @deprecated protocol v1 — replaced by SETTINGS_PATCH */
  | { type: 'FONT_SIZE'; data: { activeFontSize: number; otherFontSize: number } }
  /** @deprecated protocol v1 — replaced by SETTINGS_PATCH */
  | { type: 'TITLE_FONT_SIZE'; data: { titleFontSize: number; showTitle: boolean } }
  /** @deprecated protocol v1 — replaced by SETTINGS_PATCH */
  | { type: 'LYRIC_COLORS'; data: { activeColor: string; otherColor: string; passedColor: string; lyricsBgColor: string } }
  /** @deprecated protocol v1 — replaced by SETTINGS_PATCH */
  | { type: 'LYRICS_GAP'; data: { lyricsGap: number } }
  /** @deprecated protocol v1 — replaced by SETTINGS_PATCH */
  | { type: 'VISIBLE_RANGE'; data: { visibleBefore: number; visibleAfter: number } }
