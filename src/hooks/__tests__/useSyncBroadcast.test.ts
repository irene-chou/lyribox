import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSyncBroadcast } from '../useSyncBroadcast'
import { useSongStore } from '@/stores/useSongStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { DEFAULT_UI_SETTINGS } from '@/lib/constants'

const song = {
  id: 1,
  name: 'Broadcast',
  lrcText: '[00:01.00]a\n[00:02.00]b',
  offset: 0.3,
  pitch: 0,
  vocalRemoval: false,
  audioSource: 'youtube' as const,
  youtubeId: null,
  audioFileName: null,
  folderId: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  useSongStore.getState().clearSong()
  useSyncStore.getState().reset()
  useUISettingsStore.setState({ ...DEFAULT_UI_SETTINGS })
})

function mount() {
  const broadcast = vi.fn()
  const hook = renderHook(() => useSyncBroadcast({ broadcast }))
  return { broadcast, ...hook }
}

describe('useSyncBroadcast', () => {
  it('sends nothing on mount', () => {
    const { broadcast } = mount()
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('broadcasts the line index when it changes', () => {
    const { broadcast } = mount()
    act(() => useSyncStore.getState().setCurrentLineIndex(2))
    expect(broadcast).toHaveBeenCalledWith('SYNC_UPDATE', { currentLineIndex: 2 })
    expect(broadcast).toHaveBeenCalledTimes(1)
  })

  it('does not re-broadcast an unchanged value', () => {
    const { broadcast } = mount()
    act(() => useSyncStore.getState().setCurrentLineIndex(-1))
    act(() => useSyncStore.getState().setSyncing(true))
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('broadcasts lyrics + title and offset when a song loads', () => {
    const { broadcast } = mount()
    act(() => useSongStore.getState().loadSong(song))
    expect(broadcast).toHaveBeenCalledWith('LYRICS_LOADED', {
      lyrics: [
        { time: 1, text: 'a' },
        { time: 2, text: 'b' },
      ],
      songTitle: 'Broadcast',
      nextSongTitle: null,
    })
    expect(broadcast).toHaveBeenCalledWith('OFFSET', { offset: 0.3 })
  })

  it('ignores song fields that OBS does not render', () => {
    const { broadcast } = mount()
    act(() => useSongStore.getState().setPitch(3))
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('coalesces display settings into a single SETTINGS_PATCH with only changed keys', () => {
    vi.useFakeTimers()
    try {
      const { broadcast } = mount()
      act(() => useUISettingsStore.getState().setActiveFontSize(40))
      act(() => useUISettingsStore.getState().setPassedColor('#123456'))
      expect(broadcast).not.toHaveBeenCalled()

      act(() => { vi.advanceTimersByTime(100) })
      expect(broadcast).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('SETTINGS_PATCH', { activeFontSize: 40, passedColor: '#123456' })

      act(() => useUISettingsStore.getState().setShowTitle(false))
      act(() => { vi.advanceTimersByTime(100) })
      expect(broadcast).toHaveBeenLastCalledWith('SETTINGS_PATCH', { showTitle: false })
      expect(broadcast).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not broadcast settings that are not synced to OBS', () => {
    const { broadcast } = mount()
    act(() => useUISettingsStore.getState().setSidebarWidth(300))
    act(() => useUISettingsStore.getState().setDisplaySettingsOpen(true))
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('uses the latest broadcast function without re-subscribing', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ b }) => useSyncBroadcast({ broadcast: b }), { initialProps: { b: first } })
    rerender({ b: second })
    act(() => useSyncStore.getState().setCurrentLineIndex(1))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('SYNC_UPDATE', { currentLineIndex: 1 })
  })

  it('stops broadcasting after unmount', () => {
    const { broadcast, unmount } = mount()
    unmount()
    act(() => useSyncStore.getState().setCurrentLineIndex(1))
    expect(broadcast).not.toHaveBeenCalled()
  })
})
