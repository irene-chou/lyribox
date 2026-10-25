import { useSongStore } from '@/stores/useSongStore'
import { EmptyState } from './EmptyState'
import { LyricsContainer } from './LyricsContainer'
import { TransportBar } from '../playback/TransportBar'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

interface LyricsDisplayProps {
  engine: ReturnType<typeof usePlaybackEngine>
  onSeekToLyric?: (time: number) => void
  onNewSong: () => void
  onOpenDrawer: () => void
  isMobile?: boolean
}

export function LyricsDisplay({ engine, onSeekToLyric, onNewSong, onOpenDrawer, isMobile }: LyricsDisplayProps) {
  const currentSongId = useSongStore((s) => s.currentSongId)

  return (
    <main className="relative flex-1 min-w-0 overflow-hidden flex flex-col bg-lb-bg-primary">
      <div className="flex-1 min-h-0 flex flex-col">
        {currentSongId ? (
          <LyricsContainer onSeekToLyric={onSeekToLyric} isMobile={isMobile} />
        ) : (
          <EmptyState isMobile={isMobile} onNewSong={onNewSong} onOpenDrawer={onOpenDrawer} />
        )}
      </div>
      <TransportBar engine={engine} isMobile={isMobile} />
    </main>
  )
}
