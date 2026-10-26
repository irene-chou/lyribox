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
  /** Whether the "雲端備份" panel is expanded (not part of resetAll). */
  cloudBackupOpen: boolean
  /** Id of the GitHub Gist holding the library backup (not part of resetAll). */
  gistId: string | null
  /** Auto-backup to the gist ~30s after library changes (not part of resetAll). */
  autoBackup: boolean
  /** Epoch ms of the last successful backup (not part of resetAll). */
  lastBackupAt: number | null

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
  setCloudBackupOpen: (open: boolean) => void
  setGistId: (id: string | null) => void
  setAutoBackup: (enabled: boolean) => void
  setLastBackupAt: (at: number | null) => void
  resetAll: () => void
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_UI_SETTINGS,
      displaySettingsOpen: false,
      obsSyncEnabled: false,
      cloudBackupOpen: false,
      gistId: null,
      autoBackup: false,
      lastBackupAt: null,

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
      setCloudBackupOpen: (open: boolean) => set({ cloudBackupOpen: open }),
      setGistId: (id: string | null) => set({ gistId: id }),
      setAutoBackup: (enabled: boolean) => set({ autoBackup: enabled }),
      setLastBackupAt: (at: number | null) => set({ lastBackupAt: at }),
      resetAll: () => set({ ...DEFAULT_UI_SETTINGS }),
    }),
    {
      name: 'lb-ui-settings',
    },
  ),
)
