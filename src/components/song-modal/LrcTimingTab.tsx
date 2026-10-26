import { useCallback, useMemo, useRef, useState } from 'react'
import { Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import {
  adjustLine,
  clearFrom,
  firstUnstampedIndex,
  formatTimestampValue,
  linesFromLrc,
  linesToLrc,
  parseTimestampInput,
  setLineText,
  stampLine,
  type TimingLine,
} from '@/lib/lrc-timing'
import { CONTROL_BTN_CLASS, CONTROL_BTN_STYLE, ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

export type PlaybackEngine = ReturnType<typeof usePlaybackEngine>

interface LrcTimingTabProps {
  lrcText: string
  onLrcTextChange: (text: string) => void
  engine?: PlaybackEngine
  /** True when the song being edited is the one loaded in the player. */
  canStamp: boolean
}

const cellInputStyle: React.CSSProperties = {
  background: 'var(--lb-bg-input)',
  border: '1px solid var(--lb-border)',
  borderRadius: '6px',
  padding: '5px 8px',
  color: 'var(--lb-text-primary)',
  fontSize: '13px',
  outline: 'none',
  minWidth: 0,
}

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--lb-accent)'
}

function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--lb-border)'
}

export function LrcTimingTab({ lrcText, onLrcTextChange, engine, canStamp }: LrcTimingTabProps) {
  const doc = useMemo(() => linesFromLrc(lrcText), [lrcText])
  const { meta, lines } = doc
  const status = usePlaybackStore((s) => s.status)
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const textRefs = useRef<(HTMLInputElement | null)[]>([])
  // Draft values for timestamp inputs while the user is typing (keyed by index)
  const [timeDrafts, setTimeDrafts] = useState<Record<number, string>>({})
  const nextIndex = firstUnstampedIndex(lines)

  const commit = useCallback(
    (next: TimingLine[]) => onLrcTextChange(linesToLrc({ meta, lines: next })),
    [meta, onLrcTextChange],
  )

  const focusLine = useCallback((index: number) => {
    const el = textRefs.current[index]
    if (el) {
      el.focus()
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [])

  function getNow(): number {
    return engine ? engine.getCurrentTime() : usePlaybackStore.getState().currentTime
  }

  function stamp(index: number) {
    if (!canStamp) return
    commit(stampLine(lines, index, getNow()))
    if (index + 1 < lines.length) focusLine(index + 1)
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      stamp(index)
    } else if (e.key === 'ArrowDown' && index + 1 < lines.length) {
      e.preventDefault()
      focusLine(index + 1)
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      focusLine(index - 1)
    }
  }

  function commitTimeDraft(index: number) {
    const draft = timeDrafts[index]
    if (draft === undefined) return
    setTimeDrafts((d) => {
      const next = { ...d }
      delete next[index]
      return next
    })
    const trimmed = draft.trim()
    if (trimmed === '') {
      commit(lines.map((l, i) => (i === index ? { ...l, time: null } : l)))
      return
    }
    const parsed = parseTimestampInput(trimmed)
    if (parsed !== null) commit(stampLine(lines, index, parsed))
  }

  function handleContainerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Space on a non-text element (e.g. a focused button) toggles playback
    const tag = (e.target as HTMLElement).tagName
    if (e.key === ' ' && tag !== 'INPUT' && tag !== 'TEXTAREA' && engine && canStamp) {
      e.preventDefault()
      engine.togglePlay()
    }
  }

  function addLine() {
    commit([...lines, { time: null, text: '' }])
    requestAnimationFrame(() => focusLine(lines.length))
  }

  const isPlaying = status === 'PLAYING'

  return (
    <div
      className="flex flex-col"
      style={{
        gap: '8px',
        borderRadius: '8px',
        border: '1px solid var(--lb-border)',
        padding: '10px',
        background: 'var(--lb-bg-secondary)',
      }}
      onKeyDown={handleContainerKeyDown}
    >
      {/* Transport row */}
      <div className="flex items-center" style={{ gap: '10px' }}>
        <button
          type="button"
          onClick={() => engine?.togglePlay()}
          disabled={!canStamp || !engine}
          className={CONTROL_BTN_CLASS}
          style={{ ...CONTROL_BTN_STYLE, height: '30px', minWidth: '30px', opacity: canStamp && engine ? 1 : 0.4 }}
          title={isPlaying ? '暫停' : '播放'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span
          className="text-lb-text-primary"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTimestampValue(currentTime)}
        </span>
        <span className="text-lb-text-dim" style={{ fontSize: '12px', lineHeight: 1.5 }}>
          {canStamp
            ? '在文字欄按 Enter 把目前時間寫入該行並跳到下一行；↑↓ 移動焦點'
            : '打軸需要播放這首歌的音源：請先儲存並載入歌曲後再開啟編輯'}
        </span>
      </div>

      {/* Lines */}
      {lines.length === 0 ? (
        <p className="text-lb-text-dim" style={{ fontSize: '12px', margin: 0 }}>
          尚無歌詞行。先在上方貼上純文字歌詞（每句一行），或按「新增行」。
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
          {lines.map((line, index) => {
            const isNext = index === nextIndex
            const draft = timeDrafts[index]
            const timeValue = draft !== undefined ? draft : line.time === null ? '' : formatTimestampValue(line.time)
            const invalid = draft !== undefined && draft.trim() !== '' && parseTimestampInput(draft) === null
            return (
              <div
                key={index}
                className="flex items-center"
                style={{
                  gap: '6px',
                  padding: '2px 4px',
                  borderRadius: '6px',
                  background: isNext ? 'var(--lb-active-bg)' : 'transparent',
                }}
              >
                <span
                  className="text-lb-text-dim"
                  style={{ fontSize: '11px', width: '24px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                >
                  {index + 1}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`第 ${index + 1} 行時間`}
                  placeholder="--:--.--"
                  value={timeValue}
                  onChange={(e) => setTimeDrafts((d) => ({ ...d, [index]: e.target.value }))}
                  onBlur={(e) => {
                    blurInput(e)
                    commitTimeDraft(index)
                  }}
                  onFocus={focusInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (draft !== undefined) commitTimeDraft(index)
                      else stamp(index)
                    }
                  }}
                  style={{
                    ...cellInputStyle,
                    width: '84px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    borderColor: invalid ? 'var(--lb-danger)' : 'var(--lb-border)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => commit(adjustLine(lines, index, -0.1))}
                  disabled={line.time === null}
                  className={CONTROL_BTN_CLASS}
                  style={{ ...CONTROL_BTN_STYLE, opacity: line.time === null ? 0.4 : 1 }}
                  title="此行 -0.1s"
                >
                  −0.1
                </button>
                <button
                  type="button"
                  onClick={() => commit(adjustLine(lines, index, 0.1))}
                  disabled={line.time === null}
                  className={CONTROL_BTN_CLASS}
                  style={{ ...CONTROL_BTN_STYLE, opacity: line.time === null ? 0.4 : 1 }}
                  title="此行 +0.1s"
                >
                  +0.1
                </button>
                <input
                  ref={(el) => {
                    textRefs.current[index] = el
                  }}
                  type="text"
                  aria-label={`第 ${index + 1} 行歌詞`}
                  value={line.text}
                  onChange={(e) => commit(setLineText(lines, index, e.target.value))}
                  onKeyDown={(e) => handleTextKeyDown(e, index)}
                  onFocus={focusInput}
                  onBlur={blurInput}
                  style={{ ...cellInputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    commit(clearFrom(lines, index))
                    focusLine(index)
                  }}
                  className={ICON_BTN_CLASS}
                  style={ICON_BTN_STYLE}
                  title="從此行重打（清除此行及之後的時間）"
                  aria-label={`從第 ${index + 1} 行重打`}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={addLine}
          className={CONTROL_BTN_CLASS}
          style={{ ...CONTROL_BTN_STYLE, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={12} />
          新增行
        </button>
      </div>
    </div>
  )
}
