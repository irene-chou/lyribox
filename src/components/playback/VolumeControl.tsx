import { Volume2, VolumeX } from 'lucide-react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useRef } from 'react'
import { ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'

export function VolumeControl() {
  const volume = usePlaybackStore((s) => s.volume)
  const muted = usePlaybackStore((s) => s.muted)
  const volumeBeforeMute = useRef(100)

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value)
    usePlaybackStore.getState().setVolume(val)
    if (val > 0 && muted) {
      usePlaybackStore.getState().setMuted(false)
    }
    volumeBeforeMute.current = val
  }

  function handleToggleMute() {
    if (muted) {
      usePlaybackStore.getState().setMuted(false)
      if (volume === 0) {
        usePlaybackStore.getState().setVolume(volumeBeforeMute.current || 100)
      }
    } else {
      volumeBeforeMute.current = volume
      usePlaybackStore.getState().setMuted(true)
    }
  }

  const displayVolume = muted ? 0 : volume

  return (
    <div className="flex items-center shrink-0" style={{ gap: '4px' }}>
      <button
        className={ICON_BTN_CLASS}
        onClick={handleToggleMute}
        style={ICON_BTN_STYLE}
        title={muted ? '取消靜音' : '靜音'}
        aria-label={muted ? '取消靜音' : '靜音'}
      >
        {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={displayVolume}
        onChange={handleVolumeChange}
        aria-label="音量"
        style={{
          width: '72px',
          height: '4px',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, var(--lb-accent) ${displayVolume}%, var(--lb-border) ${displayVolume}%)`,
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}
