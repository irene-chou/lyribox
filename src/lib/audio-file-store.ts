import { db } from '@/lib/db'
import type { AudioFileRecord } from '@/types'

let persistRequested = false

/** Ask the browser to treat our storage as persistent (best effort, once). */
async function requestPersistentStorage(): Promise<void> {
  if (persistRequested) return
  persistRequested = true
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Not supported or denied; storage still works, just evictable.
  }
}

export async function saveAudioFile(songId: number, file: File): Promise<void> {
  void requestPersistentStorage()
  const record: AudioFileRecord = {
    songId,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    savedAt: Date.now(),
  }
  await db.audioFiles.put(record)
}

/** Put back a previously fetched record (used to undo a delete). */
export async function restoreAudioFile(record: AudioFileRecord): Promise<void> {
  await db.audioFiles.put(record)
}

export async function getAudioFile(songId: number): Promise<AudioFileRecord | undefined> {
  return db.audioFiles.get(songId)
}

export async function deleteAudioFile(songId: number): Promise<void> {
  await db.audioFiles.delete(songId)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
