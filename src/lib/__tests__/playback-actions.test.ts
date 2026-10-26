import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/song-service', () => ({
  debouncedSaveSong: vi.fn(),
}))

const { debouncedSaveSong } = await import('@/lib/song-service')
const { useSongStore } = await import('@/stores/useSongStore')
const { usePlaybackStore } = await import('@/stores/usePlaybackStore')
const { useSyncStore } = await import('@/stores/useSyncStore')
const { adjustOffset, resetOffset, adjustPitch, setPitch, toggleVocalRemoval, adjustActiveFontSize } = await import('../playback-actions')
const { useUISettingsStore } = await import('@/stores/useUISettingsStore')

const song = {
  id: 1,
  name: 'S',
  lrcText: '[00:01.00]a\n[00:05.00]b\n[00:10.00]c',
  offset: 0,
  pitch: 0,
  vocalRemoval: false,
  audioSource: 'youtube' as const,
  youtubeId: 'x',
  audioFileName: null,
  folderId: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  useSongStore.getState().loadSong(song)
  usePlaybackStore.getState().setCurrentTime(4)
  useSyncStore.getState().setCurrentLineIndex(0)
  vi.mocked(debouncedSaveSong).mockClear()
})

describe('adjustOffset', () => {
  it('rounds to 0.1 and triggers auto-save', () => {
    adjustOffset(0.1)
    adjustOffset(0.1)
    adjustOffset(0.1)
    expect(useSongStore.getState().offset).toBe(0.3)
    expect(debouncedSaveSong).toHaveBeenCalledTimes(3)
  })

  it('recomputes the active line from the paused time instead of blanking it', () => {
    // currentTime 4 + offset 1 = 5 → line "b" (index 1)
    adjustOffset(1)
    expect(useSyncStore.getState().currentLineIndex).toBe(1)
    // back to 4 → line "a" (index 0)
    resetOffset()
    expect(useSyncStore.getState().currentLineIndex).toBe(0)
  })

  it('does nothing without a current song', () => {
    useSongStore.getState().clearSong()
    adjustOffset(0.5)
    expect(useSongStore.getState().offset).toBe(0)
    expect(debouncedSaveSong).not.toHaveBeenCalled()
  })
})

describe('pitch', () => {
  it('rounds to 0.5 and clamps to ±12', () => {
    adjustPitch(0.3)
    expect(useSongStore.getState().pitch).toBe(0.5)
    setPitch(20)
    expect(useSongStore.getState().pitch).toBe(12)
    setPitch(-20)
    expect(useSongStore.getState().pitch).toBe(-12)
  })
})

describe('toggleVocalRemoval', () => {
  it('flips the flag and triggers auto-save', () => {
    toggleVocalRemoval()
    expect(useSongStore.getState().vocalRemoval).toBe(true)
    toggleVocalRemoval()
    expect(useSongStore.getState().vocalRemoval).toBe(false)
    expect(debouncedSaveSong).toHaveBeenCalledTimes(2)
  })

  it('does nothing without a current song', () => {
    useSongStore.getState().clearSong()
    toggleVocalRemoval()
    expect(useSongStore.getState().vocalRemoval).toBe(false)
    expect(debouncedSaveSong).not.toHaveBeenCalled()
  })
})

describe('adjustActiveFontSize', () => {
  it('clamps between 14 and 60', () => {
    useUISettingsStore.getState().setActiveFontSize(58)
    adjustActiveFontSize(4)
    expect(useUISettingsStore.getState().activeFontSize).toBe(60)
    useUISettingsStore.getState().setActiveFontSize(15)
    adjustActiveFontSize(-4)
    expect(useUISettingsStore.getState().activeFontSize).toBe(14)
  })
})
