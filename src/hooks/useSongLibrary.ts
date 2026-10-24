import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

/**
 * Live query: returns all songs sorted alphabetically by name (zh-TW locale).
 */
export function useSongs() {
  return useLiveQuery(() =>
    db.songs.toArray().then(songs =>
      songs.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
    )
  )
}

/**
 * Live query: returns all folders sorted alphabetically by name (zh-TW locale).
 */
export function useFolders() {
  return useLiveQuery(() =>
    db.folders.toArray().then(folders =>
      folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
    )
  )
}

/** Ids of songs that have an audio file stored in the browser (keys only, no blobs). */
export async function getStoredAudioSongIds(): Promise<Set<number>> {
  const keys = await db.audioFiles.toCollection().primaryKeys()
  return new Set(keys)
}

/** Live query of {@link getStoredAudioSongIds}. */
export function useStoredAudioSongIds() {
  return useLiveQuery(getStoredAudioSongIds)
}

// Re-export service functions for backward compatibility
export {
  saveSongToDB,
  debouncedSaveSong,
  deleteSongFromDB,
  exportSongs,
  importSongs,
  createFolder,
  updateFolder,
  deleteFolder,
  moveSongToFolder,
} from '@/lib/song-service'
