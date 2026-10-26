import { memo, useEffect, useRef } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSongStore } from '@/stores/useSongStore'
import { findActiveWordIndex, wordProgress } from '@/lib/lyrics-sync'
import type { LyricWord } from '@/types'

interface WordLineProps {
  words: LyricWord[]
  /** Where the last word stops filling; undefined = fills instantly. */
  endTime?: number
  activeColor: string
  otherColor: string
}

// The sync worker refreshes currentTime every 80ms; between ticks we extrapolate
// with the wall clock, but never further than this so a stalled source freezes.
const MAX_EXTRAPOLATION_S = 0.3

/**
 * Word-level (Enhanced LRC) rendering for the active line. Each word is drawn
 * twice: a dimmed base in `otherColor` and an `activeColor` overlay revealed
 * left-to-right with clip-path. Styles are mutated directly from a rAF loop so
 * the 60fps fill never re-renders React.
 */
export const WordLine = memo(function WordLine({ words, endTime, activeColor, otherColor }: WordLineProps) {
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([])
  const wordsRef = useRef(words)
  const endTimeRef = useRef(endTime)
  useEffect(() => {
    wordsRef.current = words
    endTimeRef.current = endTime
  }, [words, endTime])

  useEffect(() => {
    let raf = 0
    let anchorTime = usePlaybackStore.getState().currentTime
    let anchorPerf = performance.now()
    const lastClip: number[] = []

    const unsub = usePlaybackStore.subscribe((state, prev) => {
      if (state.currentTime !== prev.currentTime) {
        anchorTime = state.currentTime
        anchorPerf = performance.now()
      }
    })

    const frame = () => {
      const { status } = usePlaybackStore.getState()
      const extra = status === 'PLAYING' ? Math.min((performance.now() - anchorPerf) / 1000, MAX_EXTRAPOLATION_S) : 0
      const t = anchorTime + extra + useSongStore.getState().offset

      const ws = wordsRef.current
      const idx = findActiveWordIndex(ws, t)
      const progress = idx >= 0 ? wordProgress(ws, idx, t, endTimeRef.current) : 0

      for (let i = 0; i < ws.length; i++) {
        const clip = i < idx ? 0 : i > idx ? 100 : (1 - progress) * 100
        if (lastClip[i] === clip) continue
        lastClip[i] = clip
        const el = fillRefs.current[i]
        if (el) el.style.clipPath = `inset(0 ${clip}% 0 0)`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      unsub()
    }
  }, [])

  return (
    <span>
      {words.map((w, i) => (
        <span key={`${w.time}-${i}`} style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre' }}>
          <span style={{ color: otherColor, opacity: 0.6 }}>{w.text}</span>
          <span
            ref={(el) => {
              fillRefs.current[i] = el
            }}
            aria-hidden
            style={{ position: 'absolute', inset: 0, color: activeColor, clipPath: 'inset(0 100% 0 0)' }}
          >
            {w.text}
          </span>
        </span>
      ))}
    </span>
  )
})
