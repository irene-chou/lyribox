import { useEffect, useRef } from 'react'
import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import type { SyncMessageType } from '@/types'

interface UseSyncBroadcastOptions {
  broadcast: (type: SyncMessageType, data: Record<string, unknown>) => void
}

// Module-level selectors — stable references that never change
const selectSyncUpdate = (s: { currentLineIndex: number }) => ({ currentLineIndex: s.currentLineIndex })
const selectLyricsLoaded = (s: { lyrics: unknown; currentSongTitle: string }) => ({ lyrics: s.lyrics, songTitle: s.currentSongTitle })
const selectOffset = (s: { offset: number }) => ({ offset: s.offset })
const selectFontSize = (s: { activeFontSize: number; otherFontSize: number }) => ({ activeFontSize: s.activeFontSize, otherFontSize: s.otherFontSize })
const selectTitleFontSize = (s: { titleFontSize: number; showTitle: boolean }) => ({ titleFontSize: s.titleFontSize, showTitle: s.showTitle })
const selectLyricColors = (s: { activeColor: string; otherColor: string; passedColor: string; lyricsBgColor: string }) => ({ activeColor: s.activeColor, otherColor: s.otherColor, passedColor: s.passedColor, lyricsBgColor: s.lyricsBgColor })
const selectLyricsGap = (s: { lyricsGap: number }) => ({ lyricsGap: s.lyricsGap })
const selectVisibleRange = (s: { visibleBefore: number; visibleAfter: number }) => ({ visibleBefore: s.visibleBefore, visibleAfter: s.visibleAfter })

/**
 * Generic store watcher: subscribes to a Zustand store and broadcasts
 * when selected fields change.
 */
function useStoreWatcher<T>(
  store: { getState: () => T; subscribe: (cb: (state: T) => void) => () => void },
  selector: (state: T) => Record<string, unknown>,
  messageType: SyncMessageType,
  broadcastRef: React.RefObject<(type: SyncMessageType, data: Record<string, unknown>) => void>,
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
        broadcastRef.current(messageType, next)
      }
    })
    return unsub
  }, [store, selector, messageType, broadcastRef])
}

export function useSyncBroadcast({ broadcast }: UseSyncBroadcastOptions) {
  const broadcastRef = useRef(broadcast)
  broadcastRef.current = broadcast

  useStoreWatcher(useSyncStore, selectSyncUpdate, 'SYNC_UPDATE', broadcastRef)
  useStoreWatcher(useSongStore, selectLyricsLoaded, 'LYRICS_LOADED', broadcastRef)
  useStoreWatcher(useSongStore, selectOffset, 'OFFSET', broadcastRef)
  useStoreWatcher(useUISettingsStore, selectFontSize, 'FONT_SIZE', broadcastRef)
  useStoreWatcher(useUISettingsStore, selectTitleFontSize, 'TITLE_FONT_SIZE', broadcastRef)
  useStoreWatcher(useUISettingsStore, selectLyricColors, 'LYRIC_COLORS', broadcastRef)
  useStoreWatcher(useUISettingsStore, selectLyricsGap, 'LYRICS_GAP', broadcastRef)
  useStoreWatcher(useUISettingsStore, selectVisibleRange, 'VISIBLE_RANGE', broadcastRef)
}
