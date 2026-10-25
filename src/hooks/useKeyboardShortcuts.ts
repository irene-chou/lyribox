import { useEffect, useRef } from 'react'
import { useSongStore } from '@/stores/useSongStore'
import { saveSongToDB } from '@/lib/song-service'
import {
  adjustOffset,
  adjustActiveFontSize,
  OFFSET_STEP,
  OFFSET_STEP_LARGE,
  SEEK_STEP,
  SEEK_STEP_LARGE,
} from '@/lib/playback-actions'
import { navigateSong } from '@/lib/song-selection'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

interface UseKeyboardShortcutsOptions {
  engine: ReturnType<typeof usePlaybackEngine>
  onCloseDrawer?: () => void
  onOpenSearch?: () => void
  onToggleShortcuts?: () => void
}

/** Save the current song immediately (Cmd/Ctrl+S). */
export function saveCurrentSong(): Promise<void> | undefined {
  const song = useSongStore.getState()
  if (!song.currentSongId) return
  return saveSongToDB({
    id: song.currentSongId,
    name: song.currentSongTitle,
    lrcText: song.lrcText,
    offset: song.offset,
    pitch: song.pitch,
    audioSource: song.audioSource,
    youtubeId: song.youtubeId,
    audioFileName: song.audioFileName,
    folderId: song.folderId,
    createdAt: song.currentSongCreatedAt || Date.now(),
    updatedAt: Date.now(),
  }).then(() => useSongStore.getState().captureState())
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return el.isContentEditable
}

/**
 * Global keyboard shortcuts. The key table lives in `lib/shortcuts.ts`;
 * keep the two in sync.
 */
export function useKeyboardShortcuts({
  engine,
  onCloseDrawer,
  onOpenSearch,
  onToggleShortcuts,
}: UseKeyboardShortcutsOptions) {
  // Latest callbacks without re-binding the listener
  const cbRef = useRef({ onCloseDrawer, onOpenSearch, onToggleShortcuts })
  useEffect(() => {
    cbRef.current = { onCloseDrawer, onOpenSearch, onToggleShortcuts }
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      // Inside an open dialog / drawer, leave keys to Radix (Space activates
      // the focused button, Escape closes it)
      const inDialog = !!(e.target as HTMLElement | null)?.closest?.('[role="dialog"]')
      if (inDialog && e.key !== 'Escape') return
      const isCmd = e.metaKey || e.ctrlKey
      const hasSong = !!useSongStore.getState().currentSongId

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (hasSong) engine.togglePlay()
          return

        case 'Escape':
          cbRef.current.onCloseDrawer?.()
          return

        case 'ArrowLeft':
          e.preventDefault()
          adjustOffset(e.shiftKey ? -OFFSET_STEP_LARGE : -OFFSET_STEP)
          return

        case 'ArrowRight':
          e.preventDefault()
          adjustOffset(e.shiftKey ? OFFSET_STEP_LARGE : OFFSET_STEP)
          return

        case 'ArrowUp':
          e.preventDefault()
          if (isCmd) adjustActiveFontSize(2)
          else if (hasSong) engine.seekBy(e.shiftKey ? -SEEK_STEP_LARGE : -SEEK_STEP)
          return

        case 'ArrowDown':
          e.preventDefault()
          if (isCmd) adjustActiveFontSize(-2)
          else if (hasSong) engine.seekBy(e.shiftKey ? SEEK_STEP_LARGE : SEEK_STEP)
          return

      }

      // '?' (Shift+/ on most layouts)
      if (!isCmd && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
        e.preventDefault()
        cbRef.current.onToggleShortcuts?.()
        return
      }

      if (!isCmd) return
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault()
          void saveCurrentSong()
          return
        case 'k':
          e.preventDefault()
          cbRef.current.onOpenSearch?.()
          return
        case '[':
          e.preventDefault()
          void navigateSong(-1)
          return
        case ']':
          e.preventDefault()
          void navigateSong(1)
          return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [engine])
}
