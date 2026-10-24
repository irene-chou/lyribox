import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UISettings } from '@/types'
import { DEFAULT_UI_SETTINGS } from '@/lib/constants'

interface UISettingsState extends UISettings {
  setActiveFontSize: (size: number) => void
  setOtherFontSize: (size: number) => void
  setTitleFontSize: (size: number) => void
  setShowTitle: (show: boolean) => void
  setLyricsGap: (height: number) => void
  setVisibleBefore: (count: number) => void
  setVisibleAfter: (count: number) => void
  setActiveColor: (color: string) => void
  setOtherColor: (color: string) => void
  setLyricsBgColor: (color: string) => void
  setSidebarWidth: (width: number) => void
  setPersistLocalAudio: (persist: boolean) => void
  resetAll: () => void
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_UI_SETTINGS,

      setActiveFontSize: (size: number) => set({ activeFontSize: size }),
      setOtherFontSize: (size: number) => set({ otherFontSize: size }),
      setTitleFontSize: (size: number) => set({ titleFontSize: size }),
      setShowTitle: (show: boolean) => set({ showTitle: show }),
      setLyricsGap: (height: number) => set({ lyricsGap: height }),
      setVisibleBefore: (count: number) => set({ visibleBefore: count }),
      setVisibleAfter: (count: number) => set({ visibleAfter: count }),
      setActiveColor: (color: string) => set({ activeColor: color }),
      setOtherColor: (color: string) => set({ otherColor: color }),
      setLyricsBgColor: (color: string) => set({ lyricsBgColor: color }),
      setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
      setPersistLocalAudio: (persist: boolean) => set({ persistLocalAudio: persist }),
      resetAll: () => set({ ...DEFAULT_UI_SETTINGS }),
    }),
    {
      name: 'lb-ui-settings',
    },
  ),
)
