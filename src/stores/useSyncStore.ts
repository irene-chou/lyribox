import { create } from 'zustand'

interface SyncState {
  currentLineIndex: number
  /**
   * Offset-applied playback time, refreshed every sync tick but only while the
   * active line has word-level timing (Enhanced LRC); null otherwise. Used to
   * drive word highlighting on the OBS page.
   */
  syncTime: number | null
  isSyncing: boolean

  setCurrentLineIndex: (index: number) => void
  setSyncTime: (time: number | null) => void
  setSyncing: (syncing: boolean) => void
  reset: () => void
}

export const useSyncStore = create<SyncState>((set) => ({
  currentLineIndex: -1,
  syncTime: null,
  isSyncing: false,

  setCurrentLineIndex: (currentLineIndex) => set({ currentLineIndex }),
  setSyncTime: (syncTime) => set({ syncTime }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  reset: () => set({ currentLineIndex: -1, syncTime: null, isSyncing: false }),
}))
