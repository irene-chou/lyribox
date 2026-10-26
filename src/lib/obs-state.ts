import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { pickObsSettings } from '@/lib/obs-settings'
import { SYNC_PROTOCOL_VERSION } from '@/types'
import type { FullStateData } from '@/types'

/**
 * Snapshot of everything `obs.html` needs to render from scratch — the payload of a
 * `FULL_STATE` message. Shared by the PieSocket broadcast and the in-app preview.
 */
export function buildFullState(): Record<string, unknown> {
  const song = useSongStore.getState()
  const ui = useUISettingsStore.getState()
  const sync = useSyncStore.getState()

  const settings = pickObsSettings(ui)
  const data: FullStateData = {
    v: SYNC_PROTOCOL_VERSION,
    lyrics: song.lyrics,
    songTitle: song.currentSongTitle,
    currentLineIndex: sync.currentLineIndex,
    offset: song.offset,
    settings,
    // Settings also spread at top level so a v1 obs.html still renders correctly.
    ...settings,
  }
  return data as unknown as Record<string, unknown>
}
