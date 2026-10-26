import { useEffect, useRef, useCallback, useState } from 'react'
import {
  getSessionId,
  getChannelName,
  PIESOCKET_API_KEY,
  PIESOCKET_CLUSTER_ID,
} from '@/lib/piesocket'
import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { observeReconnects } from '@/lib/piesocket'
import type { SyncMessage, SyncMessageType } from '@/types'

const VALID_SYNC_TYPES = new Set<string>([
  'FULL_STATE', 'LYRICS_LOADED', 'SYNC_UPDATE', 'FONT_SIZE',
  'LYRIC_COLORS', 'TITLE_FONT_SIZE', 'LYRICS_GAP', 'VISIBLE_RANGE',
  'OFFSET', 'NEXT_SONG', 'REQUEST_STATE',
])

function isValidSyncMessage(msg: unknown): msg is SyncMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return (
    typeof m.type === 'string' &&
    VALID_SYNC_TYPES.has(m.type) &&
    (m.data === null || m.data === undefined || typeof m.data === 'object')
  )
}

export function useOBSSync() {
  const channelRef = useRef<{ publish: (event: string, data: unknown) => void } | null>(null)
  const psRef = useRef<PieSocketClass | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const sessionId = getSessionId()
  // Only browsers that copied the OBS URL ever open a PieSocket connection
  const obsSyncEnabled = useUISettingsStore((s) => s.obsSyncEnabled)

  const broadcast = useCallback(
    (type: SyncMessageType, data: Record<string, unknown>) => {
      if (!channelRef.current) return
      try {
        channelRef.current.publish('sync', { type, data })
      } catch (e) {
        console.debug('PieSocket broadcast error:', e)
      }
    },
    [],
  )

  const broadcastFullState = useCallback(() => {
    const song = useSongStore.getState()
    const ui = useUISettingsStore.getState()
    const sync = useSyncStore.getState()

    broadcast('FULL_STATE', {
      lyrics: song.lyrics,
      currentLineIndex: sync.currentLineIndex,
      activeFontSize: ui.activeFontSize,
      otherFontSize: ui.otherFontSize,
      lyricsGap: ui.lyricsGap,
      titleFontSize: ui.titleFontSize,
      showTitle: ui.showTitle,
      visibleBefore: ui.visibleBefore,
      visibleAfter: ui.visibleAfter,
      offset: song.offset,
      activeColor: ui.activeColor,
      otherColor: ui.otherColor,
      passedColor: ui.passedColor,
      lyricsBgColor: ui.lyricsBgColor,
      songTitle: song.currentSongTitle,
      nextSongTitle: song.nextSongTitle,
    })
  }, [broadcast])

  // Initialize PieSocket connection (lazily — see obsSyncEnabled)
  useEffect(() => {
    if (!obsSyncEnabled) return
    if (typeof window === 'undefined' || !window.PieSocket) {
      console.warn('PieSocket not loaded. OBS sync disabled.')
      return
    }

    const channelName = getChannelName()

    const ps = new window.PieSocket.default({
      clusterId: PIESOCKET_CLUSTER_ID,
      apiKey: PIESOCKET_API_KEY,
      notifySelf: 0,
    })
    psRef.current = ps

    ps.subscribe(channelName).then((ch) => {
      channelRef.current = ch
      setIsConnected(true)

      ch.listen('sync', (raw: unknown) => {
        if (!isValidSyncMessage(raw)) {
          console.warn('Invalid sync message received:', raw)
          return
        }
        if (raw.type === 'REQUEST_STATE') {
          broadcastFullState()
        }
      })

      console.log('PieSocket connected:', channelName)

      // An OBS page that was already open sent REQUEST_STATE to nobody — push state now,
      // and again whenever our own socket reconnects after a drop.
      broadcastFullState()
      observeReconnects(ch, broadcastFullState)
    })

    return () => {
      try {
        ps.unsubscribe(channelName)
      } catch {
        // PieSocket may throw if already disconnected
      }
      channelRef.current = null
      psRef.current = null
      setIsConnected(false)
    }
  }, [broadcastFullState, obsSyncEnabled])

  // Auto-broadcast on tab visibility change
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        broadcastFullState()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [broadcastFullState])

  return { broadcast, broadcastFullState, isConnected, sessionId }
}
