import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { saveAudioFile } from '@/lib/audio-file-store'
import { getStoredAudioSongIds } from '../useSongLibrary'

beforeEach(async () => {
  await db.audioFiles.clear()
})

describe('getStoredAudioSongIds', () => {
  it('returns the ids of songs that have a stored audio file', async () => {
    await saveAudioFile(3, new File(['a'], 'a.mp3'))
    await saveAudioFile(9, new File(['b'], 'b.mp3'))

    const ids = await getStoredAudioSongIds()

    expect(ids).toEqual(new Set([3, 9]))
  })
})
