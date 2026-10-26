import { create } from 'zustand'
import type { LyricLine, Song, AudioSource } from '@/types'
import { parseLRC } from '@/lib/lrc-parser'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSyncStore } from '@/stores/useSyncStore'

interface SongSavedState {
  name: string
  lrcText: string
  offset: number
  pitch: number
  audioSource: AudioSource
  youtubeId: string | null
  audioFileName: string | null
}

interface SongState {
  // Current song
  currentSongId: number | null
  currentSongTitle: string
  currentSongCreatedAt: number
  lyrics: LyricLine[]
  offset: number
  pitch: number
  lrcText: string
  audioSource: AudioSource
  youtubeId: string | null
  audioFileName: string | null
  folderId: number | null
  /** Title of the next playlist song (derived by useAutoNext); null when playlist mode is off or at the end. */
  nextSongTitle: string | null

  // Saved state for dirty tracking
  lastSavedState: SongSavedState | null

  // Actions
  loadSong: (song: Song) => void
  clearSong: () => void
  setOffset: (offset: number) => void
  setPitch: (pitch: number) => void
  setLyrics: (lyrics: LyricLine[]) => void
  setLrcText: (text: string) => void
  setAudioSource: (source: AudioSource) => void
  setYoutubeId: (id: string | null) => void
  setAudioFileName: (name: string | null) => void
  setFolderId: (folderId: number | null) => void
  setNextSongTitle: (title: string | null) => void
  captureState: () => void
  hasUnsavedChanges: () => boolean
}

export const useSongStore = create<SongState>((set, get) => ({
  currentSongId: null,
  currentSongTitle: '',
  currentSongCreatedAt: 0,
  lyrics: [],
  offset: 0,
  pitch: 0,
  lrcText: '',
  audioSource: 'youtube',
  youtubeId: null,
  audioFileName: null,
  folderId: null,
  nextSongTitle: null,
  lastSavedState: null,

  loadSong: (song: Song) => {
    const { lyrics, title } = parseLRC(song.lrcText)
    const songTitle = song.name || title || '未命名歌曲'

    // Reset playback & sync state before loading new song
    usePlaybackStore.getState().reset()
    useSyncStore.getState().reset()

    set({
      currentSongId: song.id,
      currentSongTitle: songTitle,
      currentSongCreatedAt: song.createdAt,
      lyrics,
      offset: song.offset,
      pitch: song.pitch ?? 0,
      lrcText: song.lrcText,
      audioSource: song.audioSource,
      youtubeId: song.youtubeId,
      audioFileName: song.audioFileName,
      folderId: song.folderId ?? null,
      lastSavedState: {
        name: songTitle,
        lrcText: song.lrcText,
        offset: song.offset,
        pitch: song.pitch ?? 0,
        audioSource: song.audioSource,
        youtubeId: song.youtubeId,
        audioFileName: song.audioFileName,
      },
    })
  },

  clearSong: () => {
    usePlaybackStore.getState().reset()
    useSyncStore.getState().reset()
    set({
      currentSongId: null,
      currentSongTitle: '',
      currentSongCreatedAt: 0,
      lyrics: [],
      offset: 0,
      pitch: 0,
      lrcText: '',
      audioSource: 'youtube',
      youtubeId: null,
      audioFileName: null,
      folderId: null,
      lastSavedState: null,
    })
  },

  setOffset: (offset: number) => set({ offset }),
  setPitch: (pitch: number) => set({ pitch }),
  setLyrics: (lyrics: LyricLine[]) => set({ lyrics }),
  setLrcText: (text: string) => set({ lrcText: text }),
  setAudioSource: (source: AudioSource) => set({ audioSource: source }),
  setYoutubeId: (id: string | null) => set({ youtubeId: id }),
  setAudioFileName: (name: string | null) => set({ audioFileName: name }),
  setFolderId: (folderId: number | null) => set({ folderId }),
  setNextSongTitle: (nextSongTitle: string | null) => set({ nextSongTitle }),

  captureState: () => {
    const state = get()
    set({
      lastSavedState: {
        name: state.currentSongTitle,
        lrcText: state.lrcText,
        offset: state.offset,
        pitch: state.pitch,
        audioSource: state.audioSource,
        youtubeId: state.youtubeId,
        audioFileName: state.audioFileName,
      },
    })
  },

  hasUnsavedChanges: () => {
    const state = get()
    if (!state.lastSavedState) return false
    const saved = state.lastSavedState
    return (
      state.currentSongTitle !== saved.name ||
      state.lrcText !== saved.lrcText ||
      state.offset !== saved.offset ||
      state.pitch !== saved.pitch ||
      state.audioSource !== saved.audioSource ||
      state.youtubeId !== saved.youtubeId ||
      state.audioFileName !== saved.audioFileName
    )
  },
}))
