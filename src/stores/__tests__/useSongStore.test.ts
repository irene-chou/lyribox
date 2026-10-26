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

describe('useSongStore – edge cases', () => {
  it('falls back to the [ti:] tag, then to 未命名歌曲, when the song has no name', () => {
    useSongStore.getState().loadSong({ ...song, name: '', lrcText: '[ti:From Tag]\n[00:01.00]x' })
    expect(useSongStore.getState().currentSongTitle).toBe('From Tag')
    useSongStore.getState().loadSong({ ...song, name: '', lrcText: '[00:01.00]x' })
    expect(useSongStore.getState().currentSongTitle).toBe('未命名歌曲')
  })

  it('defaults folderId to null for songs saved before folders existed', () => {
    const legacy = { ...song } as Partial<Song>
    delete legacy.folderId
    useSongStore.getState().loadSong(legacy as Song)
    expect(useSongStore.getState().folderId).toBeNull()
  })

  it('setters update fields; lrcText and lyrics are independent until re-parsed by the caller', () => {
    const s = useSongStore.getState()
    s.loadSong(song)
    s.setLrcText('[00:09.00]new')
    expect(useSongStore.getState().lyrics.map((l) => l.text)).toEqual(['first', 'second'])
    s.setLyrics([{ time: 9, text: 'new' }])
    s.setAudioSource('local')
    s.setYoutubeId(null)
    s.setAudioFileName('x.mp3')
    s.setFolderId(3)
    s.setPitch(-1)
    expect(useSongStore.getState()).toMatchObject({
      lyrics: [{ time: 9, text: 'new' }],
      audioSource: 'local',
      youtubeId: null,
      audioFileName: 'x.mp3',
      folderId: 3,
      pitch: -1,
    })
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(true)
  })

  it('clearSong wipes the song and resets playback/sync', () => {
    useSongStore.getState().loadSong(song)
    usePlaybackStore.getState().setCurrentTime(5)
    useSyncStore.getState().setCurrentLineIndex(1)
    useSongStore.getState().clearSong()
    expect(useSongStore.getState()).toMatchObject({
      currentSongId: null,
      currentSongTitle: '',
      lyrics: [],
      lrcText: '',
      lastSavedState: null,
    })
    expect(usePlaybackStore.getState().currentTime).toBe(0)
    expect(useSyncStore.getState().currentLineIndex).toBe(-1)
  })
})
