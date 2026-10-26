import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { db } from '@/lib/db'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSongs } from '@/hooks/useSongLibrary'
import { selectSong } from '@/lib/song-selection'
import { nextInPlaylistNoWrap, pruneMissing } from '@/lib/playlist'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

/** Delay between a song ending and the next one loading. */
export const AUTO_NEXT_DELAY_MS = 1500
/** How long to wait for the next song's audio to become ready before giving up on autoplay. */
const READY_TIMEOUT_MS = 8000
const READY_POLL_MS = 100

/**
 * Wait until the newly selected song's engine reports a duration (YouTube
 * onReady / local decode done / manual timer has none → immediate), then
 * start playback. Gives up silently if the user switches songs, starts
 * playback themselves, or the audio never becomes ready (e.g. a local file
 * that still needs to be picked).
 */
async function playWhenReady(songId: number, engine: ReturnType<typeof usePlaybackEngine>): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    const song = useSongStore.getState()
    if (song.currentSongId !== songId) return
    const playback = usePlaybackStore.getState()
    if (playback.status === 'PLAYING') return

    const hasAudio =
      (song.audioSource === 'youtube' && !!song.youtubeId) ||
      (song.audioSource === 'local' && !!playback.audioFileObjectUrl)
    const ready = hasAudio ? playback.duration > 0 : song.lyrics.length > 0 // manual timer
    if (ready) {
      engine.play()
      return
    }
    await new Promise((r) => setTimeout(r, READY_POLL_MS))
  }
}

/**
 * Playlist glue for the app shell:
 * - keeps `useSongStore.nextSongTitle` in sync (shown in OBS as 「下一首」)
 * - when 歌單模式 + 播完自動下一首 are on, loads and plays the next playlist
 *   song shortly after the current one ends (no wrap at the end)
 */
export function useAutoNext(engine: ReturnType<typeof usePlaybackEngine>) {
  const songs = useSongs()
  const currentSongId = useSongStore((s) => s.currentSongId)
  const status = usePlaybackStore((s) => s.status)
  const { playlist, playlistEnabled, autoNext } = useUISettingsStore(
    useShallow((s) => ({ playlist: s.playlist, playlistEnabled: s.playlistEnabled, autoNext: s.autoNext })),
  )

  // Derive the next song title
  useEffect(() => {
    if (!songs) return
    let title: string | null = null
    if (playlistEnabled) {
      const nextId = nextInPlaylistNoWrap(playlist, currentSongId)
      if (nextId !== null) title = songs.find((s) => s.id === nextId)?.name ?? null
    }
    if (useSongStore.getState().nextSongTitle !== title) useSongStore.getState().setNextSongTitle(title)
  }, [songs, playlist, playlistEnabled, currentSongId])

  // Auto next
  useEffect(() => {
    if (status !== 'ENDED' || !playlistEnabled || !autoNext || currentSongId === null) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const all = await db.songs.toArray()
      const ids = pruneMissing(useUISettingsStore.getState().playlist, all)
      const nextId = nextInPlaylistNoWrap(ids, currentSongId)
      if (cancelled || nextId === null) return
      // Bail if the user did something in the meantime
      const s = useSongStore.getState()
      if (s.currentSongId !== currentSongId || usePlaybackStore.getState().status !== 'ENDED') return
      const next = all.find((song) => song.id === nextId)
      if (!next) return
      await selectSong(next)
      if (cancelled) return
      void playWhenReady(next.id, engine)
    }, AUTO_NEXT_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status, playlistEnabled, autoNext, currentSongId, engine])
}
