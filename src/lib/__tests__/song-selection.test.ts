import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

const { track } = await import('@/lib/analytics')
const { db } = await import('@/lib/db')
const { saveAudioFile } = await import('@/lib/audio-file-store')
const { useSongStore } = await import('@/stores/useSongStore')
const { usePlaybackStore } = await import('@/stores/usePlaybackStore')
const { useUISettingsStore } = await import('@/stores/useUISettingsStore')
const { selectSong, navigateSong, pickLocalAudioFile } = await import('../song-selection')
type Song = import('@/types').Song

function makeSong(partial: Partial<Song> & { id: number; name: string }): Song {
  return {
    lrcText: `[00:01.00]${partial.name}`,
    offset: 0,
    pitch: 0,
    vocalRemoval: false,
    audioSource: 'youtube',
    youtubeId: 'yt',
    audioFileName: null,
    folderId: null,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

function fileInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('input[type="file"]'))
}

function choose(input: HTMLInputElement, file: File | null) {
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true })
  input.onchange?.(new Event('change'))
}

beforeEach(async () => {
  await db.songs.clear()
  await db.folders.clear()
  await db.audioFiles.clear()
  useSongStore.getState().clearSong()
  usePlaybackStore.getState().reset()
  useUISettingsStore.setState({ persistLocalAudio: true })
  fileInputs().forEach((el) => el.remove())
  URL.createObjectURL = vi.fn(() => 'blob:picked')
  URL.revokeObjectURL = vi.fn()
  vi.mocked(track).mockClear()
})

describe('selectSong', () => {
  it('loads a YouTube song and tracks it without opening a picker', async () => {
    const song = makeSong({ id: 1, name: 'YT' })
    await selectSong(song)
    expect(useSongStore.getState().currentSongId).toBe(1)
    expect(useSongStore.getState().lyrics[0].text).toBe('YT')
    expect(track).toHaveBeenCalledWith('song_load', { source: 'youtube', title: 'YT', youtube_id: 'yt' })
    expect(fileInputs()).toHaveLength(0)
  })

  it('opens a file picker for a local song without a stored copy', async () => {
    const song = makeSong({ id: 2, name: 'Local', audioSource: 'local', youtubeId: null, audioFileName: 'a.mp3' })
    await selectSong(song)
    expect(fileInputs()).toHaveLength(1)
    expect(fileInputs()[0].accept).toBe('audio/*')
  })

  it('does not open a picker when the file is already stored', async () => {
    const song = makeSong({ id: 3, name: 'Stored', audioSource: 'local', youtubeId: null })
    await saveAudioFile(3, new File(['x'], 'stored.mp3', { type: 'audio/mpeg' }))
    await selectSong(song)
    expect(fileInputs()).toHaveLength(0)
  })

  it('does not open a picker if another song was selected meanwhile', async () => {
    const song = makeSong({ id: 4, name: 'Slow', audioSource: 'local', youtubeId: null })
    const pending = selectSong(song)
    useSongStore.getState().loadSong(makeSong({ id: 5, name: 'Other' }))
    await pending
    expect(fileInputs()).toHaveLength(0)
  })
})

describe('pickLocalAudioFile', () => {
  const song = makeSong({ id: 10, name: 'Pick', audioSource: 'local', youtubeId: null, audioFileName: 'old.mp3' })

  beforeEach(() => {
    useSongStore.getState().loadSong(song)
  })

  it('loads the chosen file, updates the file name and persists it', async () => {
    pickLocalAudioFile(song)
    const [input] = fileInputs()
    choose(input, new File(['x'], 'new.mp3', { type: 'audio/mpeg' }))

    expect(usePlaybackStore.getState().audioFileObjectUrl).toBe('blob:picked')
    expect(useSongStore.getState().audioFileName).toBe('new.mp3')
    expect(document.body.contains(input)).toBe(false)
    await vi.waitFor(async () => {
      expect(await db.audioFiles.get(10)).toMatchObject({ name: 'new.mp3' })
    })
  })

  it('keeps the file name when the same file is re-picked', () => {
    pickLocalAudioFile(song)
    const setName = vi.spyOn(useSongStore.getState(), 'setAudioFileName')
    choose(fileInputs()[0], new File(['x'], 'old.mp3', { type: 'audio/mpeg' }))
    expect(setName).not.toHaveBeenCalled()
    expect(useSongStore.getState().audioFileName).toBe('old.mp3')
  })

  it('does not persist when persistLocalAudio is off', async () => {
    useUISettingsStore.setState({ persistLocalAudio: false })
    pickLocalAudioFile(song)
    choose(fileInputs()[0], new File(['x'], 'new.mp3', { type: 'audio/mpeg' }))
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBe('blob:picked')
    await new Promise((r) => setTimeout(r, 20))
    expect(await db.audioFiles.get(10)).toBeUndefined()
  })

  it('ignores a cancelled picker', () => {
    pickLocalAudioFile(song)
    choose(fileInputs()[0], null)
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBeNull()
  })

  it('ignores the file if the user switched songs while the picker was open', () => {
    pickLocalAudioFile(song)
    useSongStore.getState().loadSong(makeSong({ id: 11, name: 'Other' }))
    choose(fileInputs()[0], new File(['x'], 'new.mp3', { type: 'audio/mpeg' }))
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBeNull()
    expect(useSongStore.getState().audioFileName).toBeNull()
  })
})

describe('navigateSong', () => {
  it('returns null for an empty library', async () => {
    expect(await navigateSong(1)).toBeNull()
    expect(useSongStore.getState().currentSongId).toBeNull()
  })

  it('moves through the library in display order and wraps around', async () => {
    await db.folders.put({ id: 100, name: 'F', createdAt: 1, updatedAt: 1 })
    await db.songs.bulkPut([
      makeSong({ id: 1, name: 'B' }),
      makeSong({ id: 2, name: 'A' }),
      makeSong({ id: 3, name: 'In folder', folderId: 100 }),
    ])
    // Display order: folder songs first (3), then uncategorized A→Z (2, 1)
    useSongStore.getState().loadSong(makeSong({ id: 3, name: 'In folder', folderId: 100 }))

    expect((await navigateSong(1))?.id).toBe(2)
    expect(useSongStore.getState().currentSongId).toBe(2)
    expect((await navigateSong(1))?.id).toBe(1)
    expect((await navigateSong(1))?.id).toBe(3)
    expect((await navigateSong(-1))?.id).toBe(1)
  })

  it('picks the first song when nothing is loaded', async () => {
    await db.songs.bulkPut([makeSong({ id: 1, name: 'B' }), makeSong({ id: 2, name: 'A' })])
    expect((await navigateSong(1))?.id).toBe(2)
  })
})
