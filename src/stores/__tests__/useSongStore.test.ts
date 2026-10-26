import { describe, it, expect, beforeEach } from 'vitest'
import { useSongStore } from '../useSongStore'
import { usePlaybackStore } from '../usePlaybackStore'
import { useSyncStore } from '../useSyncStore'
import type { Song } from '@/types'

const song: Song = {
  id: 1,
  name: 'Test Song',
  lrcText: '[00:02.00]second\n[00:01.00]first',
  offset: 0.5,
  pitch: 2,
  vocalRemoval: false,
  audioSource: 'youtube',
  youtubeId: 'abc',
  audioFileName: null,
  folderId: null,
  createdAt: 100,
  updatedAt: 100,
}

beforeEach(() => {
  useSongStore.getState().clearSong()
})

describe('useSongStore', () => {
  it('loadSong parses lyrics and resets playback/sync state', () => {
    usePlaybackStore.getState().setStatus('PLAYING')
    useSyncStore.getState().setCurrentLineIndex(5)

    useSongStore.getState().loadSong(song)

    const state = useSongStore.getState()
    expect(state.currentSongId).toBe(1)
    expect(state.currentSongTitle).toBe('Test Song')
    expect(state.lyrics.map((l) => l.text)).toEqual(['first', 'second'])
    expect(state.offset).toBe(0.5)
    expect(state.pitch).toBe(2)
    expect(usePlaybackStore.getState().status).toBe('IDLE')
    expect(useSyncStore.getState().currentLineIndex).toBe(-1)
  })

  it('defaults pitch to 0 for songs saved before pitch existed', () => {
    const legacy = { ...song, pitch: undefined } as unknown as Song
    useSongStore.getState().loadSong(legacy)
    expect(useSongStore.getState().pitch).toBe(0)
  })

  it('defaults vocalRemoval to false for songs saved before it existed', () => {
    const legacy = { ...song, vocalRemoval: undefined } as unknown as Song
    useSongStore.getState().loadSong(legacy)
    expect(useSongStore.getState().vocalRemoval).toBe(false)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('tracks vocalRemoval as an unsaved change', () => {
    useSongStore.getState().loadSong(song)
    useSongStore.getState().setVocalRemoval(true)
    expect(useSongStore.getState().vocalRemoval).toBe(true)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(true)
    useSongStore.getState().captureState()
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('has no unsaved changes right after loading', () => {
    useSongStore.getState().loadSong(song)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('detects unsaved changes for tracked fields', () => {
    useSongStore.getState().loadSong(song)
    useSongStore.getState().setOffset(1)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(true)

    useSongStore.getState().setOffset(0.5)
    useSongStore.getState().setPitch(-1)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(true)
  })

  it('captureState clears dirty flag', () => {
    useSongStore.getState().loadSong(song)
    useSongStore.getState().setYoutubeId('xyz')
    useSongStore.getState().captureState()
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('reports no unsaved changes when no song is loaded', () => {
    useSongStore.getState().setOffset(3)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(false)
  })
})
