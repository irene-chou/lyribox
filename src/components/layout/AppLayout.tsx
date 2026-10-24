import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { Plus } from 'lucide-react'
import { Header } from './Header'
import { ControlPanel } from './ControlPanel'
import { LyricsDisplay } from '../lyrics/LyricsDisplay'
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { useOBSSync } from '@/hooks/useOBSSync'
import { useSyncBroadcast } from '@/hooks/useSyncBroadcast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Song } from '@/types'

// Loaded on first open to keep them out of the initial bundle
const SongDrawer = lazy(() => import('../song-library/SongDrawer').then((m) => ({ default: m.SongDrawer })))
const SongModal = lazy(() => import('../song-modal/SongModal').then((m) => ({ default: m.SongModal })))

const MIN_SIDEBAR = 320
const MAX_SIDEBAR = 1280

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
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

  // Keyboard shortcuts
  useKeyboardShortcuts({ engine, onCloseDrawer: () => setDrawerOpen(false) })

  // Close mobile panel when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobilePanelOpen(false)
  }, [isMobile])

  function handleOpenDrawer() {
    setDrawerMounted(true)
    setDrawerOpen(true)
  }

  function handleOpenNewSong() {
    setEditSong(null)
    setModalMounted(true)
    setModalOpen(true)
  }

  function handleEditSong(song: Song) {
    setEditSong(song)
    setModalMounted(true)
    setModalOpen(true)
    if (isMobile) setMobilePanelOpen(false)
  }

  const handleSeekToLyric = useCallback(
    (time: number) => {
      engine.seekTo(time)
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

        <LyricsDisplay onSeekToLyric={handleSeekToLyric} isMobile={isMobile} />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && mobilePanelOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobilePanelOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[85vw]"
          >
            <ControlPanel
              onEditSong={handleEditSong}
              engine={engine}
              isMobile
              onClose={() => setMobilePanelOpen(false)}
            />
          </div>
        </>
      )}

      {/* FAB — New Song */}
      <button
        onClick={handleOpenNewSong}
        className="flex items-center justify-center cursor-pointer bg-lb-accent"
        style={{
          position: 'fixed',
          bottom: isMobile ? '20px' : '28px',
          right: isMobile ? '20px' : '28px',
          width: isMobile ? '46px' : '52px',
          height: isMobile ? '46px' : '52px',
          borderRadius: '50%',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 16px rgba(124, 106, 239, 0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 50,
        }}
        title="新增歌曲"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 106, 239, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 106, 239, 0.4)'
        }}
      >
        <Plus size={isMobile ? 20 : 24} />
      </button>

      <Suspense fallback={null}>
        {/* Song Library Drawer */}
        {drawerMounted && (
          <SongDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            isMobile={isMobile}
          />
        )}

        {/* Song Add/Edit Modal */}
        {modalMounted && (
          <SongModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            editSong={editSong}
          />
        )}
      </Suspense>
    </div>
  )
}
