import { useEffect } from 'react'
import { getAudioFile } from '@/lib/audio-file-store'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSongStore } from '@/stores/useSongStore'

/**
 * Load a song's stored local audio file (if any) into the playback store.
 * Returns true when a file was restored. Ignores the result if the current
 * song changed while the lookup was in flight.
 */
export async function restoreLocalAudio(songId: number): Promise<boolean> {
  const record = await getAudioFile(songId)
  if (!record) return false
  if (useSongStore.getState().currentSongId !== songId) return false

  const objectUrl = URL.createObjectURL(record.blob)
  usePlaybackStore.getState().setAudioFileObjectUrl(objectUrl)
  if (useSongStore.getState().audioFileName !== record.name) {
    useSongStore.getState().setAudioFileName(record.name)
  }
  return true
}

/**
 * Whenever a local-audio song becomes current without a loaded file,
 * try to restore its audio from IndexedDB.
 */
export function useLocalAudioRestore() {
  const currentSongId = useSongStore((s) => s.currentSongId)
  const audioSource = useSongStore((s) => s.audioSource)
  const audioFileObjectUrl = usePlaybackStore((s) => s.audioFileObjectUrl)

  useEffect(() => {
    if (currentSongId === null || audioSource !== 'local' || audioFileObjectUrl) return
    void restoreLocalAudio(currentSongId)
  }, [currentSongId, audioSource, audioFileObjectUrl])
}
