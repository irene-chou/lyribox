import { useCallback, useRef } from 'react'
import { Play, Pause, RotateCcw, Minus, Plus, SkipBack, SkipForward } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { formatTime } from '@/lib/format'
import { adjustOffset, SEEK_STEP } from '@/lib/playback-actions'
import { navigateSong } from '@/lib/song-selection'
import { shortcutHint } from '@/lib/shortcuts'
import { VolumeControl } from './VolumeControl'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

interface TransportBarProps {
  engine: ReturnType<typeof usePlaybackEngine>
  isMobile?: boolean
}

const secondaryBtnClass =
  'flex items-center justify-center border border-lb-border bg-lb-bg-input text-lb-text-primary hover:bg-lb-bg-card hover:border-lb-text-dim transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

const secondaryBtnStyle: React.CSSProperties = {
  height: '32px',
  minWidth: '32px',
  padding: '0 10px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  gap: '4px',
}

const mobileBtnStyle: React.CSSProperties = {
  ...secondaryBtnStyle,
  height: '44px',
  minWidth: '44px',
  borderRadius: '10px',
  fontSize: '13px',
}

/**
 * Always-visible playback controls docked under the lyrics. Shared by all
 * three audio sources (YouTube / local file / manual timer).
 */
export function TransportBar({ engine, isMobile }: TransportBarProps) {
  const currentSongId = useSongStore((s) => s.currentSongId)
  const audioSource = useSongStore((s) => s.audioSource)
  const youtubeId = useSongStore((s) => s.youtubeId)
  const lyricsCount = useSongStore((s) => s.lyrics.length)
  const offset = useSongStore((s) => s.offset)
  const audioFileObjectUrl = usePlaybackStore((s) => s.audioFileObjectUrl)
  const status = usePlaybackStore((s) => s.status)
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const duration = usePlaybackStore((s) => s.duration)

  const barRef = useRef<HTMLDivElement>(null)

  const hasAudio =
    (audioSource === 'youtube' && !!youtubeId) ||
    (audioSource === 'local' && !!audioFileObjectUrl)
  const isManual = !hasAudio && lyricsCount > 0
  const canPlay = hasAudio || isManual
  const isPlaying = status === 'PLAYING'

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const bar = barRef.current
      if (!bar || duration <= 0) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      engine.seekTo(ratio * duration)
    },
    [duration, engine],
  )

  const handleBarPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (duration <= 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      seekFromPointer(e.clientX)
    },
    [duration, seekFromPointer],
  )

  const handleBarPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      seekFromPointer(e.clientX)
    },
    [seekFromPointer],
  )

  if (!currentSongId) return null

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  const statusColor = isPlaying
    ? 'var(--lb-success)'
    : status === 'PAUSED'
      ? '#eab308'
      : 'var(--lb-text-dim)'

  const progressRow = (
    <div className="flex items-center flex-1 min-w-0" style={{ gap: '10px' }}>
      <span aria-hidden style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
      <span
        className="text-lb-text-secondary"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatTime(currentTime)}
        {duration > 0 && ` / ${formatTime(duration)}`}
      </span>
      <div
        ref={barRef}
        role="slider"
        aria-label="播放進度"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration))}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={duration > 0 ? 0 : -1}
        onPointerDown={handleBarPointerDown}
        onPointerMove={handleBarPointerMove}
        className="flex-1"
        style={{
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          cursor: duration > 0 ? 'pointer' : 'default',
          opacity: duration > 0 ? 1 : 0.35,
          touchAction: 'none',
        }}
      >
        <div style={{ width: '100%', height: '8px', background: 'var(--lb-border)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--lb-accent)', borderRadius: '4px', transition: 'width 0.1s linear' }} />
        </div>
      </div>
    </div>
  )

  const playButton = (size: number) => (
    <button
      onClick={() => engine.togglePlay()}
      disabled={!canPlay}
      className="flex items-center justify-center shrink-0 bg-lb-accent text-white hover:bg-[#6b59de] hover:shadow-[0_4px_16px_var(--lb-accent-glow)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', border: 'none', padding: 0 }}
      title={`${isPlaying ? '暫停' : '播放'} ${shortcutHint('play-pause')}`}
      aria-label={isPlaying ? '暫停' : '播放'}
    >
      {isPlaying ? <Pause size={size * 0.45} /> : <Play size={size * 0.45} style={{ marginLeft: '2px' }} />}
    </button>
  )

  if (isMobile) {
    return (
      <div
        className="shrink-0 flex flex-col bg-lb-bg-secondary border-t border-lb-border"
        style={{ gap: '8px', padding: '10px 12px calc(14px + env(safe-area-inset-bottom))' }}
      >
        {progressRow}
        <div className="flex items-center justify-between" style={{ gap: '8px' }}>
          <button className={secondaryBtnClass} style={{ ...mobileBtnStyle, padding: 0 }} onClick={() => void navigateSong(-1)} title="上一首" aria-label="上一首">
            <SkipBack size={18} />
          </button>
          <button className={secondaryBtnClass} style={{ ...mobileBtnStyle, minWidth: '56px' }} onClick={() => engine.seekBy(-SEEK_STEP)} disabled={!canPlay} title={`倒退 ${SEEK_STEP} 秒`}>
            -{SEEK_STEP}s
          </button>
          {playButton(52)}
          <button className={secondaryBtnClass} style={{ ...mobileBtnStyle, minWidth: '56px' }} onClick={() => engine.seekBy(SEEK_STEP)} disabled={!canPlay} title={`快轉 ${SEEK_STEP} 秒`}>
            +{SEEK_STEP}s
          </button>
          <button className={secondaryBtnClass} style={{ ...mobileBtnStyle, padding: 0 }} onClick={() => void navigateSong(1)} title="下一首" aria-label="下一首">
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="shrink-0 flex items-center bg-lb-bg-secondary border-t border-lb-border"
      style={{ gap: '12px', padding: '10px 20px', minHeight: '56px' }}
    >
      {playButton(40)}

      {/* Seek ±5s */}
      <div className="flex items-center shrink-0" style={{ gap: '4px' }}>
        <button
          className={secondaryBtnClass}
          style={secondaryBtnStyle}
          onClick={() => engine.seekBy(-SEEK_STEP)}
          disabled={!canPlay}
          title={`倒退 ${SEEK_STEP} 秒 ${shortcutHint('seek-back')}`}
        >
          -{SEEK_STEP}s
        </button>
        <button
          className={secondaryBtnClass}
          style={secondaryBtnStyle}
          onClick={() => engine.seekBy(SEEK_STEP)}
          disabled={!canPlay}
          title={`快轉 ${SEEK_STEP} 秒 ${shortcutHint('seek-forward')}`}
        >
          +{SEEK_STEP}s
        </button>
        {isManual && (
          <button
            className={secondaryBtnClass}
            style={{ ...secondaryBtnStyle, color: 'var(--lb-danger)' }}
            onClick={() => engine.manual.reset()}
            title="計時器歸零"
          >
            <RotateCcw size={13} />
            歸零
          </button>
        )}
      </div>

      {progressRow}

      {/* Offset quick adjust */}
      <div className="flex items-center shrink-0" style={{ gap: '4px' }}>
        <button
          className={secondaryBtnClass}
          style={{ ...secondaryBtnStyle, padding: 0 }}
          onClick={() => adjustOffset(-0.1)}
          title={`偏移 -0.1s ${shortcutHint('offset-back')}`}
          aria-label="偏移 -0.1 秒"
        >
          <Minus size={14} />
        </button>
        <span
          className="text-lb-text-primary"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, minWidth: '48px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
          title="歌詞偏移"
        >
          {offset >= 0 ? '+' : ''}
          {offset.toFixed(1)}s
        </span>
        <button
          className={secondaryBtnClass}
          style={{ ...secondaryBtnStyle, padding: 0 }}
          onClick={() => adjustOffset(0.1)}
          title={`偏移 +0.1s ${shortcutHint('offset-forward')}`}
          aria-label="偏移 +0.1 秒"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Volume (not for manual timer) */}
      {hasAudio && <VolumeControl />}
    </div>
  )
}
