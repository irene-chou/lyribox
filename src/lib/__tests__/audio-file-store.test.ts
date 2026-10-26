import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import {
  saveAudioFile,
  getAudioFile,
  deleteAudioFile,
  formatBytes,
} from '../audio-file-store'
import { deleteSongFromDB, saveSongToDB } from '../song-service'

function makeFile(name: string, bytes = 'abc'): File {
  return new File([bytes], name, { type: 'audio/mpeg' })
}

beforeEach(async () => {
  await db.audioFiles.clear()
  await db.songs.clear()
})

describe('audio-file-store', () => {
  it('saves a file and reads it back by song id', async () => {
    await saveAudioFile(42, makeFile('song.mp3', 'hello'))

    const record = await getAudioFile(42)
    expect(record).toBeDefined()
    expect(record!.name).toBe('song.mp3')
    expect(record!.type).toBe('audio/mpeg')
    expect(record!.size).toBe(5)
    // fake-indexeddb's structured clone under jsdom does not preserve the Blob
    // prototype, so only check the field is present.
    expect(record!.blob).toBeDefined()
  })

  it('returns undefined when no file is stored', async () => {
    expect(await getAudioFile(999)).toBeUndefined()
  })

  it('replaces an existing file for the same song', async () => {
    await saveAudioFile(1, makeFile('old.mp3'))
    await saveAudioFile(1, makeFile('new.mp3'))

    const record = await getAudioFile(1)
    expect(record!.name).toBe('new.mp3')
    expect(await db.audioFiles.count()).toBe(1)
  })

  it('deletes a stored file', async () => {
    await saveAudioFile(1, makeFile('a.mp3'))
    await deleteAudioFile(1)
    expect(await getAudioFile(1)).toBeUndefined()
  })

  it('removes the stored file when its song is deleted', async () => {
    await saveSongToDB({
      id: 7,
      name: 'S',
      lrcText: '',
      offset: 0,
      pitch: 0,
      vocalRemoval: false,
      audioSource: 'local',
      youtubeId: null,
      audioFileName: 'a.mp3',
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    })
    await saveAudioFile(7, makeFile('a.mp3'))

    await deleteSongFromDB(7)

    expect(await getAudioFile(7)).toBeUndefined()
  })
})

describe('formatBytes', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024 + 300 * 1024)).toBe('5.3 MB')
  })
})
