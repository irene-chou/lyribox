import { RotateCcw } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { adjustOffset, resetOffset } from '@/lib/playback-actions'
import { shortcutHint } from '@/lib/shortcuts'
import { CONTROL_BTN_CLASS, OFFSET_BTN_STYLE, ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'

export function OffsetControls() {
  const currentSongId = useSongStore((s) => s.currentSongId)
  const offset = useSongStore((s) => s.offset)

  if (!currentSongId) return null

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
          歌詞偏移 (Offset)
        </div>
        <button className={ICON_BTN_CLASS} onClick={resetOffset} title="重置偏移" style={ICON_BTN_STYLE}>
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="flex items-center justify-center" style={{ gap: '6px' }}>
        <button
          className={CONTROL_BTN_CLASS}
          onClick={() => adjustOffset(-0.5)}
          style={OFFSET_BTN_STYLE}
          title={`偏移 -0.5s ${shortcutHint('offset-back-large')}`}
        >
          -0.5s
        </button>
        <button
          className={CONTROL_BTN_CLASS}
          onClick={() => adjustOffset(-0.1)}
          style={OFFSET_BTN_STYLE}
          title={`偏移 -0.1s ${shortcutHint('offset-back')}`}
        >
          -0.1s
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
          {offset >= 0 ? '+' : ''}
          {offset.toFixed(1)}s
        </span>
        <button
          className={CONTROL_BTN_CLASS}
          onClick={() => adjustOffset(0.1)}
          style={OFFSET_BTN_STYLE}
          title={`偏移 +0.1s ${shortcutHint('offset-forward')}`}
        >
          +0.1s
        </button>
        <button
          className={CONTROL_BTN_CLASS}
          onClick={() => adjustOffset(0.5)}
          style={OFFSET_BTN_STYLE}
          title={`偏移 +0.5s ${shortcutHint('offset-forward-large')}`}
        >
          +0.5s
        </button>
      </div>
    </div>
  )
}
