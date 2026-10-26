/**
 * song-service against a real (fake-indexeddb) Dexie instance. The sibling
 * song-service.test.ts mocks the db and only covers import validation.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/lib/db'
import { saveAudioFile } from '@/lib/audio-file-store'
import { useSongStore } from '@/stores/useSongStore'
import { useSaveStatusStore } from '@/stores/useSaveStatusStore'
import {
  saveSongToDB,
  debouncedSaveSong,
  deleteSongFromDB,
  exportSongs,
  importSongs,
  createFolder,
  updateFolder,
  deleteFolder,
  restoreFolder,
  moveSongToFolder,
} from '../song-service'
import type { Song } from '@/types'

/** jsdom's Blob/File lack .text(); read them the old way. */
function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function jsonFile(payload: unknown): File {
  const content = JSON.stringify(payload)
  const file = new File([content], 'lib.json', { type: 'application/json' })
  if (!file.text) file.text = () => Promise.resolve(content)
  return file
}

function makeSong(partial: Partial<Song> & { id: number }): Song {
  return {
    name: `Song ${partial.id}`,
    lrcText: '[00:01.00]hi',
    offset: 0,
    pitch: 0,
    vocalRemoval: false,
    audioSource: 'youtube',
    youtubeId: null,
    audioFileName: null,
    folderId: null,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

beforeEach(async () => {
  await db.songs.clear()
  await db.folders.clear()
  await db.audioFiles.clear()
  useSongStore.getState().clearSong()
  useSaveStatusStore.getState().reset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('saveSongToDB', () => {
  it('upserts the song and ends in the saved state', async () => {
    await saveSongToDB(makeSong({ id: 1, name: 'First' }))
    await saveSongToDB(makeSong({ id: 1, name: 'Renamed' }))
    expect(await db.songs.toArray()).toEqual([expect.objectContaining({ id: 1, name: 'Renamed' })])
    expect(useSaveStatusStore.getState().status).toBe('saved')
  })

  it('resets the status and rethrows when the write fails', async () => {
    vi.spyOn(db.songs, 'put').mockRejectedValueOnce(new Error('quota'))
    await expect(saveSongToDB(makeSong({ id: 1 }))).rejects.toThrow('quota')
    expect(useSaveStatusStore.getState().status).toBe('idle')
  })
})

describe('debouncedSaveSong', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  it('marks pending immediately and writes the current song after the delay', async () => {
    useSongStore.getState().loadSong(makeSong({ id: 7, name: 'Auto', createdAt: 123 }))
    useSongStore.getState().setOffset(0.4)
    expect(useSongStore.getState().hasUnsavedChanges()).toBe(true)

    debouncedSaveSong(200)
    expect(useSaveStatusStore.getState().status).toBe('pending')
    expect(await db.songs.get(7)).toBeUndefined()

    vi.advanceTimersByTime(200)
    vi.useRealTimers()
    await vi.waitFor(async () => {
      expect(await db.songs.get(7)).toMatchObject({ id: 7, name: 'Auto', offset: 0.4, createdAt: 123 })
    })
    await vi.waitFor(() => expect(useSongStore.getState().hasUnsavedChanges()).toBe(false))
    expect(useSaveStatusStore.getState().status).toBe('saved')
  })

  it('collapses rapid calls into one write', async () => {
    useSongStore.getState().loadSong(makeSong({ id: 8 }))
    const put = vi.spyOn(db.songs, 'put')

    debouncedSaveSong(100)
    vi.advanceTimersByTime(60)
    debouncedSaveSong(100)
    vi.advanceTimersByTime(60)
    expect(put).not.toHaveBeenCalled()

    vi.advanceTimersByTime(40)
    vi.useRealTimers()
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
  })

  it('does nothing when no song is loaded', async () => {
    debouncedSaveSong(50)
    expect(useSaveStatusStore.getState().status).toBe('idle')
    vi.advanceTimersByTime(50)
    vi.useRealTimers()
    await new Promise((r) => setTimeout(r, 10))
    expect(await db.songs.count()).toBe(0)
    expect(useSaveStatusStore.getState().status).toBe('idle')
  })
})

describe('deleteSongFromDB', () => {
  it('removes the song together with its stored audio file', async () => {
    await db.songs.put(makeSong({ id: 1 }))
    await db.songs.put(makeSong({ id: 2 }))
    await saveAudioFile(1, new File(['x'], 'a.mp3', { type: 'audio/mpeg' }))

    await deleteSongFromDB(1)

    expect(await db.songs.get(1)).toBeUndefined()
    expect(await db.audioFiles.get(1)).toBeUndefined()
    expect(await db.songs.get(2)).toBeDefined()
  })
})

describe('exportSongs', () => {
  it('downloads a dated JSON file containing songs and folders', async () => {
    await db.songs.put(makeSong({ id: 1, name: 'Exported' }))
    await db.folders.put({ id: 9, name: 'F', createdAt: 1, updatedAt: 1 })

    let exported: Blob | undefined
    URL.createObjectURL = vi.fn((b: Blob) => {
      exported = b
      return 'blob:export'
    })
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:export')
      expect(this.download).toMatch(/^lyribox-songs-\d{4}-\d{2}-\d{2}\.json$/)
    })

    await exportSongs()

    expect(click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export')
    expect(exported?.type).toBe('application/json')
    const parsed = JSON.parse(await readBlobText(exported!))
    expect(parsed.songs).toEqual([expect.objectContaining({ id: 1, name: 'Exported' })])
    expect(parsed.folders).toEqual([expect.objectContaining({ id: 9, name: 'F' })])
  })
})

describe('importSongs (new format)', () => {
  it('imports folders before songs and skips invalid folders', async () => {
    const payload = {
      songs: [makeSong({ id: 1, folderId: 5 }), makeSong({ id: 2 })],
      folders: [
        { id: 5, name: 'Keep', createdAt: 1, updatedAt: 1 },
        { id: 6, name: '', createdAt: 1, updatedAt: 1 },
        { id: 7, name: 'x'.repeat(201), createdAt: 1, updatedAt: 1 },
        'nope',
      ],
    }
    expect(await importSongs(jsonFile(payload))).toBe(2)
    expect(await db.folders.toArray()).toEqual([expect.objectContaining({ id: 5, name: 'Keep' })])
    expect((await db.songs.get(1))?.folderId).toBe(5)
  })

  it('tolerates a payload without a folders array', async () => {
    expect(await importSongs(jsonFile({ songs: [makeSong({ id: 3 })], folders: 'bad' }))).toBe(1)
    expect(await db.folders.count()).toBe(0)
  })

  it('rejects an object without a songs array', async () => {
    await expect(importSongs(jsonFile({ folders: [] }))).rejects.toThrow('無效的匯入檔案格式')
  })
})

describe('folders', () => {
  it('creates a folder keyed by its creation time', async () => {
    const before = Date.now()
    const folder = await createFolder('New')
    expect(folder.id).toBeGreaterThanOrEqual(before)
    expect(folder.createdAt).toBe(folder.id)
    expect(await db.folders.get(folder.id)).toEqual(folder)
  })

  it('renames a folder and bumps updatedAt', async () => {
    await db.folders.put({ id: 1, name: 'Old', createdAt: 1, updatedAt: 1 })
    await updateFolder(1, 'New')
    const f = await db.folders.get(1)
    expect(f?.name).toBe('New')
    expect(f!.updatedAt).toBeGreaterThan(1)
  })

  it('deleteFolder unassigns its songs and returns their ids for undo', async () => {
    await db.folders.put({ id: 1, name: 'F', createdAt: 1, updatedAt: 1 })
    await db.songs.bulkPut([
      makeSong({ id: 10, folderId: 1 }),
      makeSong({ id: 11, folderId: 1 }),
      makeSong({ id: 12, folderId: null }),
    ])

    const moved = await deleteFolder(1)

    expect(moved.sort()).toEqual([10, 11])
    expect(await db.folders.get(1)).toBeUndefined()
    expect((await db.songs.get(10))?.folderId).toBeNull()
    expect((await db.songs.get(11))?.folderId).toBeNull()
    expect((await db.songs.get(12))?.folderId).toBeNull()
  })

  it('restoreFolder puts the folder back and re-assigns the songs', async () => {
    const folder = { id: 1, name: 'F', createdAt: 1, updatedAt: 1 }
    await db.songs.bulkPut([makeSong({ id: 10 }), makeSong({ id: 11 })])

    await restoreFolder(folder, [10])

    expect(await db.folders.get(1)).toEqual(folder)
    expect((await db.songs.get(10))?.folderId).toBe(1)
    expect((await db.songs.get(11))?.folderId).toBeNull()
  })

  it('restoreFolder with no songs only restores the folder', async () => {
    const folder = { id: 2, name: 'Empty', createdAt: 1, updatedAt: 1 }
    await restoreFolder(folder, [])
    expect(await db.folders.get(2)).toEqual(folder)
  })

  it('moveSongToFolder sets folderId (or null) and bumps updatedAt', async () => {
    await db.songs.put(makeSong({ id: 1 }))
    await moveSongToFolder(1, 42)
    expect(await db.songs.get(1)).toMatchObject({ folderId: 42 })
    await moveSongToFolder(1, null)
    const s = await db.songs.get(1)
    expect(s?.folderId).toBeNull()
    expect(s!.updatedAt).toBeGreaterThan(1)
  })
})
