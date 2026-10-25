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

export type Theme = 'light' | 'dark'

export type PlaybackStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'ENDED'

export type SyncMessageType =
  | 'FULL_STATE'
  | 'LYRICS_LOADED'
  | 'SYNC_UPDATE'
  | 'FONT_SIZE'
  | 'LYRIC_COLORS'
  | 'TITLE_FONT_SIZE'
  | 'LYRICS_GAP'
  | 'VISIBLE_RANGE'
  | 'OFFSET'
  | 'REQUEST_STATE'

export type SyncMessage =
  | { type: 'SYNC_UPDATE'; data: { currentLineIndex: number } }
  | { type: 'LYRICS_LOADED'; data: { lyrics: LyricLine[]; songTitle: string } }
  | { type: 'OFFSET'; data: { offset: number } }
  | { type: 'FONT_SIZE'; data: { activeFontSize: number; otherFontSize: number } }
  | { type: 'TITLE_FONT_SIZE'; data: { titleFontSize: number; showTitle: boolean } }
  | { type: 'LYRIC_COLORS'; data: { activeColor: string; otherColor: string; passedColor: string; lyricsBgColor: string } }
  | { type: 'LYRICS_GAP'; data: { lyricsGap: number } }
  | { type: 'VISIBLE_RANGE'; data: { visibleBefore: number; visibleAfter: number } }
  | { type: 'FULL_STATE'; data: Record<string, unknown> }
  | { type: 'REQUEST_STATE'; data: null }
