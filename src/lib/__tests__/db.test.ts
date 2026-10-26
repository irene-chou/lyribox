/**
 * Schema upgrade path: a database created by an old build (v1, songs only)
 * must open with the current schema and get the new fields back-filled.
 * Lives in its own file so the fake IndexedDB starts empty.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import Dexie from 'dexie'

describe('lyribox-db upgrades', () => {
  it('back-fills pitch and folderId for songs saved by schema v1', async () => {
    const legacy = new Dexie('lyribox-db')
    legacy.version(1).stores({ songs: 'id' })
    await legacy.table('songs').put({
      id: 1,
      name: 'Old',
      lrcText: '[00:01.00]x',
      offset: 0.2,
      audioSource: 'youtube',
      youtubeId: 'abc',
      audioFileName: null,
      createdAt: 1,
      updatedAt: 1,
    })
    legacy.close()

    const { db } = await import('@/lib/db')
    const song = await db.songs.get(1)

    expect(db.verno).toBe(4)
    expect(song).toMatchObject({ id: 1, name: 'Old', offset: 0.2, pitch: 0, folderId: null })
    expect(await db.folders.toArray()).toEqual([])
    expect(await db.audioFiles.toArray()).toEqual([])
  })
})
