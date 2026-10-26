import { useRef, useState } from 'react'
import { Search, FileText, ChevronUp, Timer } from 'lucide-react'
import { LyricsSearchTab } from './LyricsSearchTab'
import { LrcTimingTab, type PlaybackEngine } from './LrcTimingTab'

interface LrcInputTabsProps {
  lrcText: string
  onLrcTextChange: (text: string) => void
  onSearchSelect?: (lrcText: string, trackName: string) => void
  /** Playback engine for the 打軸 (timing) mode. */
  engine?: PlaybackEngine
  /** True when the song being edited is the one loaded in the player. */
  canStamp?: boolean
}

export function LrcInputTabs({
  lrcText,
  onLrcTextChange,
  onSearchSelect,
  engine,
  canStamp = false,
}: LrcInputTabsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showTiming, setShowTiming] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onLrcTextChange(text)
    e.target.value = ''
  }

  function handleSearchResultSelect(text: string, trackName: string) {
    setShowSearch(false)
    onSearchSelect?.(text, trackName)
  }

  const actionButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--lb-border)',
    background: 'var(--lb-bg-input)',
    color: 'var(--lb-text-secondary)',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }

  return (
    <div className="flex flex-col" style={{ gap: '6px' }}>
      <label
        className="text-lb-text-dim"
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        LRC 歌詞
      </label>

      {/* Source action buttons */}
      <div className="flex" style={{ gap: '6px' }}>
        {onSearchSelect && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              ...actionButtonStyle,
              ...(showSearch
                ? {
                    borderColor: 'var(--lb-accent)',
                    color: 'var(--lb-accent)',
                    background: 'rgba(124,106,239,0.08)',
                  }
                : {}),
            }}
          >
            {showSearch ? <ChevronUp size={13} /> : <Search size={13} />}
            線上搜尋
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={actionButtonStyle}
        >
          <FileText size={13} />
          讀取檔案
        </button>
        <button
          onClick={() => setShowTiming(!showTiming)}
          aria-pressed={showTiming}
          style={{
            ...actionButtonStyle,
            ...(showTiming
              ? {
                  borderColor: 'var(--lb-accent)',
                  color: 'var(--lb-accent)',
                  background: 'rgba(124,106,239,0.08)',
                }
              : {}),
          }}
          title="播放時逐行按 Enter 寫入時間戳"
        >
          <Timer size={13} />
          打軸
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".lrc,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Collapsible search panel */}
      {showSearch && onSearchSelect && (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid var(--lb-border)',
            padding: '10px',
            background: 'var(--lb-bg-secondary)',
          }}
        >
          <LyricsSearchTab onSelect={handleSearchResultSelect} />
        </div>
      )}

      {/* Timing editor replaces the textarea while active */}
      {showTiming ? (
        <LrcTimingTab
          lrcText={lrcText}
          onLrcTextChange={onLrcTextChange}
          engine={engine}
          canStamp={canStamp}
        />
      ) : (
        <textarea
          placeholder={`在此貼上 LRC 格式歌詞...\n\n範例：\n[00:12.50]第一句歌詞\n[00:18.30]第二句歌詞`}
          value={lrcText}
          onChange={(e) => onLrcTextChange(e.target.value)}
          style={{
            background: 'var(--lb-bg-input)',
            border: '1px solid var(--lb-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: 'var(--lb-text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.2s',
            width: '100%',
            minHeight: '120px',
            resize: 'vertical',
            lineHeight: 1.7,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--lb-accent)'
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--lb-accent-glow)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--lb-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      )}
    </div>
  )
}
