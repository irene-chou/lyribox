import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { Header } from './Header'
import { ControlPanel } from './ControlPanel'
import { ShortcutsDialog } from './ShortcutsDialog'
import { LyricsDisplay } from '../lyrics/LyricsDisplay'
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { useOBSSync } from '@/hooks/useOBSSync'
import { useSyncBroadcast } from '@/hooks/useSyncBroadcast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Song } from '@/types'
import { track } from '@/lib/analytics'

// Loaded on first open to keep them out of the initial bundle
const SongDrawer = lazy(() => import('../song-library/SongDrawer').then((m) => ({ default: m.SongDrawer })))
const SongModal = lazy(() => import('../song-modal/SongModal').then((m) => ({ default: m.SongModal })))

const MIN_SIDEBAR = 320
const MAX_SIDEBAR = 1280

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // Stay mounted after first open so close animations still play
  const [drawerMounted, setDrawerMounted] = useState(false)
  const [modalMounted, setModalMounted] = useState(false)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  const isMobile = useIsMobile()
  const engine = usePlaybackEngine()

  // Sync engine — uses playback engine to get current time
  useSyncEngine({ getCurrentTime: engine.getCurrentTime })

  // OBS sync — PieSocket broadcast
  const { broadcast } = useOBSSync()
  useSyncBroadcast({ broadcast })

  const handleOpenDrawer = useCallback(() => {
    setDrawerMounted(true)
    setDrawerOpen(true)
  }, [])

  const handleOpenNewSong = useCallback(() => {
    setEditSong(null)
    setModalMounted(true)
    setModalOpen(true)
  }, [])

  const handleToggleShortcuts = useCallback(() => setShortcutsOpen((v) => !v), [])
  useEffect(() => {
    if (shortcutsOpen) track('shortcuts_open')
  }, [shortcutsOpen])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    engine,
    onCloseDrawer: () => setDrawerOpen(false),
    onOpenSearch: handleOpenDrawer,
    onToggleShortcuts: handleToggleShortcuts,
  })

  // Close mobile panel when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobilePanelOpen(false)
  }, [isMobile])

  // Warn before leaving with unsaved changes (auto-save is debounced)
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useSongStore.getState().hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  function handleEditSong(song: Song) {
    setEditSong(song)
    setModalMounted(true)
    setModalOpen(true)
    if (isMobile) setMobilePanelOpen(false)
  }

  // Clicking a lyric line jumps there and starts playback if it isn't already running
  const handleSeekToLyric = useCallback(
    (time: number) => {
      engine.seekTo(time)
      if (usePlaybackStore.getState().status !== 'PLAYING') engine.play()
    },
    [engine],
  )

  // --- Resize handle logic ---
  const draggingRef = useRef(false)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    setIsDragging(true)

    // Prevent text selection & iframe stealing events
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const iframes = document.querySelectorAll('iframe')
    iframes.forEach((f) => (f.style.pointerEvents = 'none'))

    let rafId: number | null = null
    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const newWidth = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, ev.clientX))
        useUISettingsStore.getState().setSidebarWidth(newWidth)
      })
    }

    const onMouseUp = () => {
      draggingRef.current = false
      if (rafId) cancelAnimationFrame(rafId)
      setIsDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      iframes.forEach((f) => (f.style.pointerEvents = ''))
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <Header
        onOpenDrawer={handleOpenDrawer}
        onNewSong={handleOpenNewSong}
        onShowShortcuts={handleToggleShortcuts}
        isMobile={isMobile}
        onToggleMobilePanel={() => setMobilePanelOpen((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && (
          <>
            <ControlPanel onEditSong={handleEditSong} engine={engine} />

            {/* Resize handle */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="調整側欄寬度"
              onMouseDown={handleResizeStart}
              style={{
                width: '4px',
                cursor: 'col-resize',
                flexShrink: 0,
                background: isDragging ? 'var(--lb-accent)' : 'transparent',
                transition: isDragging ? 'none' : 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isDragging) e.currentTarget.style.background = 'var(--lb-border)'
              }}
              onMouseLeave={(e) => {
                if (!isDragging) e.currentTarget.style.background = 'transparent'
              }}
            />
          </>
        )}

        <LyricsDisplay
          engine={engine}
          onSeekToLyric={handleSeekToLyric}
          onNewSong={handleOpenNewSong}
          onOpenDrawer={handleOpenDrawer}
          isMobile={isMobile}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && mobilePanelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobilePanelOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[85vw]">
            <ControlPanel
              onEditSong={handleEditSong}
              engine={engine}
              isMobile
              onClose={() => setMobilePanelOpen(false)}
            />
          </div>
        </>
      )}

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <Suspense fallback={null}>
        {drawerMounted && (
          <SongDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onNewSong={handleOpenNewSong}
            isMobile={isMobile}
          />
        )}

        {modalMounted && (
          <SongModal open={modalOpen} onOpenChange={setModalOpen} editSong={editSong} />
        )}
      </Suspense>
    </div>
  )
}
