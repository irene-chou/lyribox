import { db } from '@/lib/db'
import type { Song, Folder } from '@/types'
import { useSongStore } from '@/stores/useSongStore'
import { useSaveStatusStore } from '@/stores/useSaveStatusStore'

/**
 * Save (upsert) a song to IndexedDB.
 */
export async function saveSongToDB(song: Song): Promise<void> {
  const status = useSaveStatusStore.getState()
  status.markSaving()
  try {
    await db.songs.put(song)
    status.markSaved()
  } catch (err) {
    status.reset()
    throw err
  }
}

/**
 * Debounced auto-save: saves the current song state to DB after a delay.
 * Repeated calls within the delay window reset the timer.
 */
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null

export function debouncedSaveSong(delay = 600) {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer)
  if (useSongStore.getState().currentSongId) useSaveStatusStore.getState().markPending()
  _autoSaveTimer = setTimeout(async () => {
    _autoSaveTimer = null
    const state = useSongStore.getState()
    if (!state.currentSongId) {
      useSaveStatusStore.getState().reset()
      return
    }
    await saveSongToDB({
      id: state.currentSongId,
      name: state.currentSongTitle,
      lrcText: state.lrcText,
      offset: state.offset,
      pitch: state.pitch,
      vocalRemoval: state.vocalRemoval,
      audioSource: state.audioSource,
      youtubeId: state.youtubeId,
      audioFileName: state.audioFileName,
      folderId: state.folderId,
      createdAt: state.currentSongCreatedAt || Date.now(),
      updatedAt: Date.now(),
    })
    useSongStore.getState().captureState()
  }, delay)
}

/**
 * Delete a song from IndexedDB by id.
 */
export async function deleteSongFromDB(id: number): Promise<void> {
  await db.transaction('rw', db.songs, db.audioFiles, async () => {
    await db.songs.delete(id)
    await db.audioFiles.delete(id)
  })
}

/**
 * Export all songs and folders as a JSON file download.
 */
export async function exportSongs(): Promise<void> {
  const songs = await db.songs.toArray()
  const folders = await db.folders.toArray()
  const json = JSON.stringify({ songs, folders }, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lyribox-songs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isValidSong(obj: unknown): obj is Song {
  if (typeof obj !== 'object' || obj === null) return false
  const s = obj as Record<string, unknown>
  return (
    typeof s.id === 'number' && s.id > 0 &&
    typeof s.name === 'string' && s.name.length > 0 && s.name.length <= 500 &&
    typeof s.lrcText === 'string' &&
    typeof s.offset === 'number' && Number.isFinite(s.offset) &&
    (s.pitch === undefined || (typeof s.pitch === 'number' && Number.isFinite(s.pitch))) &&
    (s.vocalRemoval === undefined || typeof s.vocalRemoval === 'boolean') &&
    (s.audioSource === 'youtube' || s.audioSource === 'local') &&
    (s.youtubeId === null || typeof s.youtubeId === 'string') &&
    (s.audioFileName === null || typeof s.audioFileName === 'string') &&
    (s.folderId === undefined || s.folderId === null || typeof s.folderId === 'number') &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number'
  )
}

function isValidFolder(obj: unknown): obj is Folder {
  if (typeof obj !== 'object' || obj === null) return false
  const f = obj as Record<string, unknown>
  return (
    typeof f.id === 'number' && f.id > 0 &&
    typeof f.name === 'string' && f.name.length > 0 && f.name.length <= 200 &&
    typeof f.createdAt === 'number' &&
    typeof f.updatedAt === 'number'
  )
}

/**
 * Import songs (and optionally folders) from a JSON file, merging into IndexedDB.
 * Supports both old format (array of songs) and new format ({ songs, folders }).
 */
export async function importSongs(file: File): Promise<number> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('無效的 JSON 格式')
  }

  let songList: unknown[]
  let folderList: unknown[] = []

  if (Array.isArray(parsed)) {
    // Legacy format: plain array of songs
    songList = parsed
  } else if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as Record<string, unknown>).songs)) {
    // New format: { songs, folders }
    const p = parsed as Record<string, unknown>
    songList = p.songs as unknown[]
    if (Array.isArray(p.folders)) {
      folderList = p.folders as unknown[]
    }
  } else {
    throw new Error('無效的匯入檔案格式')
  }

  // Import folders first so songs can reference them
  for (const item of folderList) {
    if (isValidFolder(item)) {
      const { id, name, createdAt, updatedAt } = item
      await db.folders.put({ id, name, createdAt, updatedAt })
    }
  }

  let count = 0
  for (const item of songList) {
    if (isValidSong(item)) {
      const { id, name, lrcText, offset, pitch = 0, vocalRemoval = false, audioSource, youtubeId, audioFileName, folderId = null, createdAt, updatedAt } = item
      await db.songs.put({ id, name, lrcText, offset, pitch, vocalRemoval, audioSource, youtubeId, audioFileName, folderId, createdAt, updatedAt })
      count++
    }
  }
  return count
}

// ─── Folder operations ───────────────────────────────────────────────────────

export async function createFolder(name: string): Promise<Folder> {
  const now = Date.now()
  const folder: Folder = { id: now, name, createdAt: now, updatedAt: now }
  await db.folders.put(folder)
  return folder
}

export async function updateFolder(id: number, name: string): Promise<void> {
  await db.folders.update(id, { name, updatedAt: Date.now() })
}

/**
 * Delete a folder and unassign its songs. Returns the ids of the songs that
 * were in it so the deletion can be undone with {@link restoreFolder}.
 */
export async function deleteFolder(id: number): Promise<number[]> {
  // folderId is not an indexed field, so use .filter() for a full-table scan.
  const affected = await db.songs.filter(s => s.folderId === id).primaryKeys()
  await db.transaction('rw', db.songs, db.folders, async () => {
    await db.songs.where('id').anyOf(affected).modify({ folderId: null })
    await db.folders.delete(id)
  })
  return affected as number[]
}

/** Undo {@link deleteFolder}: put the folder back and re-assign its songs. */
export async function restoreFolder(folder: Folder, songIds: number[]): Promise<void> {
  await db.transaction('rw', db.songs, db.folders, async () => {
    await db.folders.put(folder)
    if (songIds.length) {
      await db.songs.where('id').anyOf(songIds).modify({ folderId: folder.id })
    }
  })
}

export async function moveSongToFolder(songId: number, folderId: number | null): Promise<void> {
  await db.songs.update(songId, { folderId, updatedAt: Date.now() })
}
