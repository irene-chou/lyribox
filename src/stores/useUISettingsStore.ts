import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UISettings } from '@/types'
import { DEFAULT_UI_SETTINGS } from '@/lib/constants'

interface UISettingsState extends UISettings {
  /** Whether the "顯示設定" panel in the sidebar is expanded (not part of resetAll). */
  displaySettingsOpen: boolean
  /**
   * Whether this browser has opted into OBS sync (set when the OBS URL is copied).
   * Until then no PieSocket connection is opened at all. Not part of resetAll.
   */
  obsSyncEnabled: boolean
  /** Ordered song ids for tonight's set (see lib/playlist.ts). Not part of resetAll. */
  playlist: number[]
  /** When on, prev/next (buttons + Cmd+[ ]) follow the playlist instead of library order. */
  playlistEnabled: boolean
  /** Auto-load the next playlist song when the current one ends (requires playlistEnabled). */
  autoNext: boolean
  /** Whether the 歌單 section in the song drawer is expanded. */
  playlistOpen: boolean

  setActiveFontSize: (size: number) => void
  setOtherFontSize: (size: number) => void
  setTitleFontSize: (size: number) => void
  setShowTitle: (show: boolean) => void
  setLyricsGap: (height: number) => void
  setVisibleBefore: (count: number) => void
  setVisibleAfter: (count: number) => void
  setActiveColor: (color: string) => void
  setOtherColor: (color: string) => void
  setPassedColor: (color: string) => void
  setLyricsBgColor: (color: string) => void
  setSidebarWidth: (width: number) => void
  setPersistLocalAudio: (persist: boolean) => void
  setDisplaySettingsOpen: (open: boolean) => void
  setObsSyncEnabled: (enabled: boolean) => void
  setPlaylist: (ids: number[]) => void
  setPlaylistEnabled: (enabled: boolean) => void
  setAutoNext: (enabled: boolean) => void
  setPlaylistOpen: (open: boolean) => void
  resetAll: () => void
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_UI_SETTINGS,
      displaySettingsOpen: false,
      obsSyncEnabled: false,
      playlist: [],
      playlistEnabled: false,
      autoNext: false,
      playlistOpen: true,

      setActiveFontSize: (size: number) => set({ activeFontSize: size }),
      setOtherFontSize: (size: number) => set({ otherFontSize: size }),
      setTitleFontSize: (size: number) => set({ titleFontSize: size }),
      setShowTitle: (show: boolean) => set({ showTitle: show }),
      setLyricsGap: (height: number) => set({ lyricsGap: height }),
      setVisibleBefore: (count: number) => set({ visibleBefore: count }),
      setVisibleAfter: (count: number) => set({ visibleAfter: count }),
      setActiveColor: (color: string) => set({ activeColor: color }),
      setOtherColor: (color: string) => set({ otherColor: color }),
      setPassedColor: (color: string) => set({ passedColor: color }),
      setLyricsBgColor: (color: string) => set({ lyricsBgColor: color }),
      setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
      setPersistLocalAudio: (persist: boolean) => set({ persistLocalAudio: persist }),
      setDisplaySettingsOpen: (open: boolean) => set({ displaySettingsOpen: open }),
      setObsSyncEnabled: (enabled: boolean) => set({ obsSyncEnabled: enabled }),
      setPlaylist: (ids: number[]) => set({ playlist: ids }),
      setPlaylistEnabled: (enabled: boolean) => set({ playlistEnabled: enabled }),
      setAutoNext: (enabled: boolean) => set({ autoNext: enabled }),
      setPlaylistOpen: (open: boolean) => set({ playlistOpen: open }),
      resetAll: () => set({ ...DEFAULT_UI_SETTINGS }),
    }),
    {
      name: 'lb-ui-settings',
    },
  ),
)
