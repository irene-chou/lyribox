import { RotateCcw, MicOff } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { adjustPitch, resetPitch, toggleVocalRemoval } from '@/lib/playback-actions'
import { CONTROL_BTN_CLASS, OFFSET_BTN_STYLE, ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'

export function PitchControls() {
  const currentSongId = useSongStore((s) => s.currentSongId)
  const audioSource = useSongStore((s) => s.audioSource)
  const pitch = useSongStore((s) => s.pitch)
  const vocalRemoval = useSongStore((s) => s.vocalRemoval)

  // Only show for local audio (YouTube doesn't support pitch shifting)
  if (!currentSongId || audioSource !== 'local') return null

  return (
    <div style={{ marginTop: '4px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
        <div
          className="text-lb-text-dim"
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          升降 Key (Pitch)
        </div>
        <div className="flex items-center" style={{ gap: '2px' }}>
          <button
            className={ICON_BTN_CLASS}
            onClick={toggleVocalRemoval}
            title="去人聲（效果視歌曲混音而定）"
            aria-label="去人聲"
            aria-pressed={vocalRemoval}
            style={
              vocalRemoval
                ? { ...ICON_BTN_STYLE, color: 'var(--lb-accent)', background: 'var(--lb-active-bg)' }
                : ICON_BTN_STYLE
            }
          >
            <MicOff size={14} />
          </button>
          <button className={ICON_BTN_CLASS} onClick={resetPitch} title="重置 Key" style={ICON_BTN_STYLE}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center" style={{ gap: '6px' }}>
        <button className={CONTROL_BTN_CLASS} onClick={() => adjustPitch(-1)} style={OFFSET_BTN_STYLE} title="降 1 Key">
          -1
        </button>
        <button className={CONTROL_BTN_CLASS} onClick={() => adjustPitch(-0.5)} style={OFFSET_BTN_STYLE} title="降半 Key">
          -½
        </button>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--lb-text-primary)',
            minWidth: '52px',
            textAlign: 'center',
          }}
        >
          {pitch >= 0 ? '+' : ''}
          {pitch % 1 === 0 ? pitch.toFixed(0) : pitch.toFixed(1)}
        </span>
        <button className={CONTROL_BTN_CLASS} onClick={() => adjustPitch(0.5)} style={OFFSET_BTN_STYLE} title="升半 Key">
          +½
        </button>
        <button className={CONTROL_BTN_CLASS} onClick={() => adjustPitch(1)} style={OFFSET_BTN_STYLE} title="升 1 Key">
          +1
        </button>
      </div>
    </div>
  )
}
