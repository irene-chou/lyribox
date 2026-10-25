import { useSongStore } from '@/stores/useSongStore'
import { track } from '@/lib/analytics'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { debouncedSaveSong } from '@/lib/song-service'
import { findActiveLineIndex } from '@/lib/lyrics-sync'

export const OFFSET_STEP = 0.1
export const OFFSET_STEP_LARGE = 0.5
export const PITCH_MIN = -12
export const PITCH_MAX = 12
export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 60
export const SEEK_STEP = 5
export const SEEK_STEP_LARGE = 15

/**
 * Recompute the active lyric line from the last known playback time so the
 * highlight follows an offset change immediately, even while paused.
 * (The sync worker only ticks while playing.)
 */
function resyncActiveLine() {
  const { lyrics, offset } = useSongStore.getState()
  if (!lyrics.length) return
  const { currentTime } = usePlaybackStore.getState()
  const next = findActiveLineIndex(lyrics, currentTime + offset)
  if (next !== useSyncStore.getState().currentLineIndex) {
    useSyncStore.getState().setCurrentLineIndex(next)
  }
}

/** Set the lyric offset (seconds, rounded to 0.1) and auto-save. */
export function setOffset(value: number) {
  const rounded = Math.round(value * 10) / 10
  useSongStore.getState().setOffset(rounded)
  resyncActiveLine()
  debouncedSaveSong()
}

export function adjustOffset(delta: number) {
  if (!useSongStore.getState().currentSongId) return
  setOffset(useSongStore.getState().offset + delta)
}

export function resetOffset() {
  if (!useSongStore.getState().currentSongId) return
  setOffset(0)
}

/** Set pitch in semitones (rounded to 0.5, clamped) and auto-save. */
export function setPitch(value: number) {
  const rounded = Math.round(value * 2) / 2
  const clamped = Math.max(PITCH_MIN, Math.min(PITCH_MAX, rounded))
  useSongStore.getState().setPitch(clamped)
  debouncedSaveSong()
}

export function adjustPitch(delta: number) {
  if (!useSongStore.getState().currentSongId) return
  setPitch(useSongStore.getState().pitch + delta)
  track('pitch_change', { semitones: useSongStore.getState().pitch })
}

export function resetPitch() {
  if (!useSongStore.getState().currentSongId) return
  setPitch(0)
  track('pitch_change', { semitones: 0 })
}

export function adjustActiveFontSize(delta: number) {
  const current = useUISettingsStore.getState().activeFontSize
  const next = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, current + delta))
  useUISettingsStore.getState().setActiveFontSize(next)
}
