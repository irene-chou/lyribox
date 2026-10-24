import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db'
import { saveAudioFile } from '@/lib/audio-file-store'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSongStore } from '@/stores/useSongStore'
import { restoreLocalAudio } from '../useLocalAudioRestore'

beforeEach(async () => {
  await db.audioFiles.clear()
  URL.createObjectURL = vi.fn(() => 'blob:restored')
  URL.revokeObjectURL = vi.fn()
  usePlaybackStore.setState({ audioFileObjectUrl: null })
  useSongStore.setState({ currentSongId: 5, audioFileName: 'old.mp3' })
})

describe('restoreLocalAudio', () => {
  it('loads the stored file into the playback store', async () => {
    await saveAudioFile(5, new File(['x'], 'song.mp3', { type: 'audio/mpeg' }))

    const restored = await restoreLocalAudio(5)

    expect(restored).toBe(true)
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBe('blob:restored')
    expect(useSongStore.getState().audioFileName).toBe('song.mp3')
  })

  it('returns false and leaves the store alone when nothing is stored', async () => {
    const restored = await restoreLocalAudio(5)

    expect(restored).toBe(false)
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBeNull()
  })

  it('ignores the result if the current song changed meanwhile', async () => {
    await saveAudioFile(5, new File(['x'], 'song.mp3', { type: 'audio/mpeg' }))
    const pending = restoreLocalAudio(5)
    useSongStore.setState({ currentSongId: 6 })

    expect(await pending).toBe(false)
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBeNull()
  })
})
