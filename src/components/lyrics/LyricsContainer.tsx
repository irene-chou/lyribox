import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { LocateFixed } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { NowSinging } from './NowSinging'
import { LyricLine } from './LyricLine'
import type { LyricStatus } from './LyricLine'

interface LyricsContainerProps {
  onSeekToLyric?: (time: number) => void
  isMobile?: boolean
}

// How long after a programmatic scroll we ignore scroll events
const AUTO_SCROLL_GRACE_MS = 900

export function LyricsContainer({ onSeekToLyric, isMobile }: LyricsContainerProps) {
  const currentSongTitle = useSongStore((s) => s.currentSongTitle)
  const lyrics = useSongStore((s) => s.lyrics)
  const offset = useSongStore((s) => s.offset)
  const activeFontSize = useUISettingsStore((s) => s.activeFontSize)
  const otherFontSize = useUISettingsStore((s) => s.otherFontSize)
  const titleFontSize = useUISettingsStore((s) => s.titleFontSize)
  const showTitle = useUISettingsStore((s) => s.showTitle)
  const lyricsGap = useUISettingsStore((s) => s.lyricsGap)
  const activeColor = useUISettingsStore((s) => s.activeColor)
  const otherColor = useUISettingsStore((s) => s.otherColor)
  const passedColor = useUISettingsStore((s) => s.passedColor)
  const lyricsBgColor = useUISettingsStore((s) => s.lyricsBgColor)
  const currentLineIndex = useSyncStore((s) => s.currentLineIndex)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const currentSongId = useSongStore((s) => s.currentSongId)

  // "Back to current line" affordance
  const [isAway, setIsAway] = useState(false)
  const autoScrollUntilRef = useRef(0)
  const currentLineIndexRef = useRef(currentLineIndex)
  currentLineIndexRef.current = currentLineIndex
  const scrollRafRef = useRef<number | null>(null)

  const scrollToActive = useCallback((behavior: ScrollBehavior) => {
    const el = lineRefs.current[currentLineIndexRef.current]
    if (!el) return
    autoScrollUntilRef.current = performance.now() + AUTO_SCROLL_GRACE_MS
    el.scrollIntoView({ behavior, block: 'center' })
    setIsAway(false)
  }, [])

  // Reset scroll position when song changes
  useEffect(() => {
    if (scrollRef.current) {
      autoScrollUntilRef.current = performance.now() + AUTO_SCROLL_GRACE_MS
      scrollRef.current.scrollTop = 0
    }
    setIsAway(false)
  }, [currentSongId])

  // Auto-scroll to active line
  useEffect(() => {
    if (currentLineIndex >= 0) scrollToActive('smooth')
    else setIsAway(false)
  }, [currentLineIndex, scrollToActive])

  // Detect the user scrolling the active line out of view
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      if (performance.now() < autoScrollUntilRef.current) return
      const container = scrollRef.current
      const el = lineRefs.current[currentLineIndexRef.current]
      if (!container || !el) {
        setIsAway(false)
        return
      }
      const c = container.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      // Treat "away" as the active line being fully outside the viewport
      setIsAway(r.bottom < c.top || r.top > c.bottom)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [])

  // Ref to always point to latest seek handler (avoids re-creating per-line handlers on offset change)
  const handleLineClickRef = useRef<(index: number) => void>(() => {})
  handleLineClickRef.current = (index: number) => {
    if (!onSeekToLyric) return
    const line = lyrics[index]
    if (!line) return
    onSeekToLyric(line.time - offset)
  }

  // Pre-compute statuses so only lines whose status changed will re-render
  const statuses = useMemo<LyricStatus[]>(() => {
    return lyrics.map((_, i) => {
      if (currentLineIndex < 0) return 'upcoming'
      if (i < currentLineIndex) return 'passed'
      if (i === currentLineIndex) return 'active'
      return 'upcoming'
    })
  }, [lyrics, currentLineIndex])

  // Stable per-line ref setters — only rebuilt when lyrics array changes (useMemo so available during render)
  const lineRefSetters = useMemo(() => {
    lineRefs.current = new Array(lyrics.length).fill(null)
    return lyrics.map((_, i) => (el: HTMLDivElement | null) => {
      lineRefs.current[i] = el
    })
  }, [lyrics])

  // Per-line click handlers — useMemo so they're available during render (not post-render like useEffect)
  const lineClickHandlers = useMemo(() => {
    if (!onSeekToLyric) return []
    return lyrics.map((_, i) => () => handleLineClickRef.current(i))
  }, [lyrics, onSeekToLyric])

  const containerStyle = useMemo(() => ({ background: lyricsBgColor }), [lyricsBgColor])
  const scrollStyle = useMemo(
    () => ({ padding: isMobile ? '20vh 28px' : '30vh 60px' }),
    [isMobile],
  )
  const gapStyle = useMemo(() => ({ gap: `${lyricsGap}px` }), [lyricsGap])

  const showBackButton = isAway && currentLineIndex >= 0

  return (
    <div className="relative flex flex-col h-full min-h-0" style={containerStyle}>
      {showTitle && <NowSinging title={currentSongTitle} titleFontSize={titleFontSize} isMobile={isMobile} />}

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto" style={scrollStyle}>
        {lyrics.length === 0 ? (
          <p
            className="text-lb-text-dim"
            style={{
              textAlign: 'center',
              fontSize: '15px',
              padding: '32px 0',
            }}
          >
            無歌詞內容
          </p>
        ) : (
          <div className="flex flex-col" style={gapStyle}>
            {lyrics.map((line, i) => (
              <LyricLine
                key={`${line.time}-${i}`}
                ref={lineRefSetters[i]}
                line={line}
                status={statuses[i]}
                activeFontSize={activeFontSize}
                otherFontSize={otherFontSize}
                activeColor={activeColor}
                otherColor={otherColor}
                passedColor={passedColor}
                onClick={lineClickHandlers[i]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating "back to current line" button */}
      <button
        onClick={() => scrollToActive('smooth')}
        aria-hidden={!showBackButton}
        tabIndex={showBackButton ? 0 : -1}
        className="absolute left-1/2 flex items-center bg-lb-bg-card border border-lb-border text-lb-text-primary hover:border-lb-accent transition-all cursor-pointer"
        style={{
          bottom: '16px',
          transform: `translateX(-50%) translateY(${showBackButton ? 0 : 12}px)`,
          opacity: showBackButton ? 1 : 0,
          pointerEvents: showBackButton ? 'auto' : 'none',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          zIndex: 5,
        }}
      >
        <LocateFixed size={14} className="text-lb-accent" />
        回到目前行
      </button>
    </div>
  )
}
