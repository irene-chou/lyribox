import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'

/**
 * Snapshot of everything `obs.html` needs to render from scratch — the payload of a
 * `FULL_STATE` message. Shared by the PieSocket broadcast and the in-app preview.
 */
export function buildFullState(): Record<string, unknown> {
  const song = useSongStore.getState()
  const ui = useUISettingsStore.getState()
  const sync = useSyncStore.getState()

  return {
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
  }
}
