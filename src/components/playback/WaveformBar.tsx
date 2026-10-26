import { memo, useEffect, useRef } from 'react'

interface WaveformBarProps {
  peaks: Float32Array
  /** 0..1 fraction of the track that has been played. */
  progress: number
  height: number
}

const MIN_BAR_HEIGHT = 2
const BAR_GAP = 1

function readVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * Canvas waveform drawn from pre-computed peaks. Pointer / keyboard handling
 * stays on the parent slider element; this only paints.
 */
export const WaveformBar = memo(function WaveformBar({ peaks, progress, height }: WaveformBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef(progress)
  const rafRef = useRef(0)
  const drawRef = useRef<() => void>(() => {})

  // Build the draw function whenever peaks / height change
  useEffect(() => {
    drawRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.clientWidth
      if (cssWidth === 0) return
      const w = Math.round(cssWidth * dpr)
      const h = Math.round(height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.clearRect(0, 0, w, h)

      // Theme colors read on every draw so light/dark switches apply immediately
      const accent = readVar('--lb-accent', '#7c6aef')
      const dim = readVar('--lb-text-dim', '#888888')

      const count = peaks.length
      const slot = w / count
      const gap = BAR_GAP * dpr
      const barW = Math.max(1, slot - gap)
      const mid = h / 2
      const playedX = progressRef.current * w

      for (let i = 0; i < count; i++) {
        const x = i * slot
        const barH = Math.max(MIN_BAR_HEIGHT * dpr, peaks[i] * h)
        const played = x + barW <= playedX
        const partial = !played && x < playedX

        if (partial) {
          // Split the bar under the playhead so progress moves smoothly
          ctx.fillStyle = accent
          ctx.fillRect(x, mid - barH / 2, playedX - x, barH)
          ctx.globalAlpha = 0.45
          ctx.fillStyle = dim
          ctx.fillRect(playedX, mid - barH / 2, x + barW - playedX, barH)
          ctx.globalAlpha = 1
        } else {
          ctx.globalAlpha = played ? 1 : 0.45
          ctx.fillStyle = played ? accent : dim
          ctx.fillRect(x, mid - barH / 2, barW, barH)
          ctx.globalAlpha = 1
        }
      }

      // Playhead
      ctx.fillStyle = accent
      ctx.fillRect(Math.min(w - dpr, playedX), 0, Math.max(1, dpr), h)
    }
    drawRef.current()
  }, [peaks, height])

  // Redraw on progress change, throttled to one frame
  useEffect(() => {
    progressRef.current = progress
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => drawRef.current())
    return () => cancelAnimationFrame(rafRef.current)
  }, [progress])

  // Redraw on resize and theme class change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const schedule = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => drawRef.current())
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(canvas)
    const mo = new MutationObserver(schedule)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  )
})
