import { useEffect, useRef } from 'react'
import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { pickObsSettings, diffSettings } from '@/lib/obs-settings'
import type { ObsDisplaySettings, SyncMessageType } from '@/types'

type Broadcast = (type: SyncMessageType, data: Record<string, unknown>) => void

interface UseSyncBroadcastOptions {
  broadcast: Broadcast
}

/** Slider drags fire many store updates; coalesce them into one patch. */
const SETTINGS_DEBOUNCE_MS = 50

// Module-level selectors — stable references that never change
const selectSyncUpdate = (s: { currentLineIndex: number }) => ({ currentLineIndex: s.currentLineIndex })
const selectLyricsLoaded = (s: { lyrics: unknown; currentSongTitle: string }) => ({ lyrics: s.lyrics, songTitle: s.currentSongTitle })
// nextSongTitle rides along with LYRICS_LOADED (read at send time, not a trigger — OBS resets the
// active line on LYRICS_LOADED) and gets its own NEXT_SONG message when it changes mid-song.
const extraLyricsLoaded = (s: { nextSongTitle: string | null }) => ({ nextSongTitle: s.nextSongTitle })
const selectNextSong = (s: { nextSongTitle: string | null }) => ({ nextSongTitle: s.nextSongTitle })
const selectOffset = (s: { offset: number }) => ({ offset: s.offset })

/**
 * Generic store watcher: subscribes to a Zustand store and broadcasts
 * when selected fields change.
 */
function useStoreWatcher<T>(
  store: { getState: () => T; subscribe: (cb: (state: T) => void) => () => void },
  selector: (state: T) => Record<string, unknown>,
  messageType: SyncMessageType,
  broadcastRef: React.RefObject<Broadcast>,
  /** Extra payload fields read at send time; changes to them alone do not trigger a broadcast. */
  extra?: (state: T) => Record<string, unknown>,
) {
  useEffect(() => {
    let prev = selector(store.getState())
    const unsub = store.subscribe((state) => {
      const next = selector(state)
      const changed = Object.keys(next).some(
        (k) => next[k] !== prev[k],
      )
      if (changed) {
        prev = next
        broadcastRef.current(messageType, extra ? { ...next, ...extra(state) } : next)
      }
    })
    return unsub
  }, [store, selector, messageType, broadcastRef, extra])
}

/**
 * Watches the OBS-relevant subset of UI settings and sends a single
 * SETTINGS_PATCH containing only the keys that changed since the last send.
 */
function useSettingsWatcher(broadcastRef: React.RefObject<Broadcast>) {
  useEffect(() => {
    let lastSent: ObsDisplaySettings = pickObsSettings(useUISettingsStore.getState())
    let timer: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      timer = null
      const next = pickObsSettings(useUISettingsStore.getState())
      const patch = diffSettings(lastSent, next)
      if (!patch) return
      lastSent = next
      broadcastRef.current('SETTINGS_PATCH', patch)
    }

    const unsub = useUISettingsStore.subscribe(() => {
      if (timer !== null) return
      timer = setTimeout(flush, SETTINGS_DEBOUNCE_MS)
    })

    return () => {
      unsub()
      if (timer !== null) clearTimeout(timer)
    }
  }, [broadcastRef])
}

export function useSyncBroadcast({ broadcast }: UseSyncBroadcastOptions) {
  const broadcastRef = useRef(broadcast)
  broadcastRef.current = broadcast

  useStoreWatcher(useSyncStore, selectSyncUpdate, 'SYNC_UPDATE', broadcastRef)
  useStoreWatcher(useSongStore, selectLyricsLoaded, 'LYRICS_LOADED', broadcastRef, extraLyricsLoaded)
  useStoreWatcher(useSongStore, selectNextSong, 'NEXT_SONG', broadcastRef)
  useStoreWatcher(useSongStore, selectOffset, 'OFFSET', broadcastRef)
  useSettingsWatcher(broadcastRef)
}
