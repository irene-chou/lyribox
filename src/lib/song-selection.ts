import { db } from '@/lib/db'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { saveAudioFile } from '@/lib/audio-file-store'
import { orderSongs, adjacentSong } from '@/lib/song-order'
import { track } from '@/lib/analytics'
import type { Song } from '@/types'

/**
 * Open the OS file picker for a local-audio song and load the chosen file.
 * Must be called from a user gesture (click / keydown).
 */
export function pickLocalAudioFile(song: Song): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*'
  input.style.display = 'none'
  input.onchange = () => {
    const file = input.files?.[0]
    input.remove()
    if (!file) return
    // Ignore if the user switched songs while the picker was open
    if (useSongStore.getState().currentSongId !== song.id) return
    const objectUrl = URL.createObjectURL(file)
    usePlaybackStore.getState().setAudioFileObjectUrl(objectUrl)
    if (file.name !== song.audioFileName) {
      useSongStore.getState().setAudioFileName(file.name)
    }
    if (useUISettingsStore.getState().persistLocalAudio) {
      void saveAudioFile(song.id, file)
    }
  }
  // Attached to the DOM so it survives until the picker closes
  document.body.appendChild(input)
  input.click()
}

/**
 * Load a song into the player. For local-audio songs without a stored copy,
 * prompt for the file. Stored copies are restored by `useLocalAudioRestore`.
 */
export async function selectSong(song: Song): Promise<void> {
  useSongStore.getState().loadSong(song)
  track('song_load', { source: song.audioSource, title: song.name, youtube_id: song.youtubeId ?? '' })
  if (song.audioSource !== 'local') return
  const stored = await db.audioFiles.get(song.id)
  if (stored) return
  if (useSongStore.getState().currentSongId !== song.id) return
  pickLocalAudioFile(song)
}

/** Switch to the previous (-1) or next (+1) song in library order. */
export async function navigateSong(direction: 1 | -1): Promise<Song | null> {
  const [songs, folders] = await Promise.all([db.songs.toArray(), db.folders.toArray()])
  const target = adjacentSong(orderSongs(songs, folders), useSongStore.getState().currentSongId, direction)
  if (!target) return null
  await selectSong(target)
  return target
}
