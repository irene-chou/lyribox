import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ObsPreset, ObsUrlParams, UISettings } from '@/types'
import { DEFAULT_OBS_PRESETS, DEFAULT_UI_SETTINGS } from '@/lib/constants'

interface UISettingsState extends UISettings {
  /** Named OBS URL param sets offered when copying the OBS URL (not part of resetAll). */
  obsPresets: ObsPreset[]
  addObsPreset: (name: string, params?: ObsUrlParams) => ObsPreset
  updateObsPreset: (id: string, patch: Partial<Pick<ObsPreset, 'name' | 'params'>>) => void
  removeObsPreset: (id: string) => void
  /** Whether the "顯示設定" panel in the sidebar is expanded (not part of resetAll). */
  displaySettingsOpen: boolean
  /**
   * Whether this browser has opted into OBS sync (set when the OBS URL is copied).
   * Until then no PieSocket connection is opened at all. Not part of resetAll.
   */
  obsSyncEnabled: boolean
  /** Whether the embedded "OBS 預覽" panel in the sidebar is expanded (not part of resetAll). */
  obsPreviewOpen: boolean

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
  setObsPreviewOpen: (open: boolean) => void
  resetAll: () => void
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_UI_SETTINGS,
      displaySettingsOpen: false,
      obsSyncEnabled: false,
      obsPreviewOpen: false,
      obsPresets: DEFAULT_OBS_PRESETS,

      addObsPreset: (name, params = {}) => {
        const preset: ObsPreset = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`,
          name,
          params,
        }
        set((s) => ({ obsPresets: [...s.obsPresets, preset] }))
        return preset
      },
      updateObsPreset: (id, patch) =>
        set((s) => ({ obsPresets: s.obsPresets.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removeObsPreset: (id) => set((s) => ({ obsPresets: s.obsPresets.filter((p) => p.id !== id) })),

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
      setObsPreviewOpen: (open: boolean) => set({ obsPreviewOpen: open }),
      resetAll: () => set({ ...DEFAULT_UI_SETTINGS }),
    }),
    {
      name: 'lb-ui-settings',
    },
  ),
)
