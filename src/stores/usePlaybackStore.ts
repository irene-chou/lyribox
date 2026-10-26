import { create } from 'zustand'
import type { PlaybackStatus } from '@/types'

interface PlaybackState {
  status: PlaybackStatus
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  audioFileObjectUrl: string | null
  /** Normalized peaks of the decoded local file (null for YouTube / manual / not yet decoded). */
  waveform: Float32Array | null

  // Actions
  setStatus: (status: PlaybackStatus) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  toggleMute: () => void
  setAudioFileObjectUrl: (url: string | null) => void
  setWaveform: (waveform: Float32Array | null) => void
  reset: () => void
}

const initialState = {
  status: 'IDLE' as PlaybackStatus,
  currentTime: 0,
  duration: 0,
  volume: 100,
  muted: false,
  audioFileObjectUrl: null,
  waveform: null as Float32Array | null,
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setMuted: (muted) => set({ muted }),
  toggleMute: () => {
    const { muted } = get()
    set({ muted: !muted })
  },
  setAudioFileObjectUrl: (audioFileObjectUrl) => {
    // Revoke previous URL to prevent memory leaks
    const prev = get().audioFileObjectUrl
    if (prev) {
      URL.revokeObjectURL(prev)
    }
    // A new (or no) file means the old waveform no longer applies
    set({ audioFileObjectUrl, waveform: null })
  },
  setWaveform: (waveform) => set({ waveform }),
  reset: () => {
    const prev = get().audioFileObjectUrl
    if (prev) {
      URL.revokeObjectURL(prev)
    }
    set({ ...initialState })
  },
}))
