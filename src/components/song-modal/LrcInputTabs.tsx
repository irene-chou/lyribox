import { useRef, useState } from 'react'
import { Search, FileText, ChevronUp, Languages } from 'lucide-react'
import { LyricsSearchTab } from './LyricsSearchTab'
import { mergeTranslationLrc } from '@/lib/lrc-merge'
import { toast } from '@/stores/useToastStore'

interface LrcInputTabsProps {
  lrcText: string
  onLrcTextChange: (text: string) => void
  onSearchSelect?: (lrcText: string, trackName: string) => void
}

export function LrcInputTabs({
  lrcText,
  onLrcTextChange,
  onSearchSelect,
}: LrcInputTabsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [translationLrc, setTranslationLrc] = useState('')

  function handleMergeTranslation() {
    const { lrcText: merged, matched, unmatched } = mergeTranslationLrc(lrcText, translationLrc)
    if (matched === 0) {
      toast.error('沒有對上任何歌詞行，請確認兩份 LRC 的時間戳是否接近')
      return
    }
    onLrcTextChange(merged)
    setTranslationLrc('')
    setShowMerge(false)
    toast.success(unmatched > 0 ? `已合併 ${matched} 行翻譯（${unmatched} 行未對上）` : `已合併 ${matched} 行翻譯`)
  }

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
        <input
          ref={fileInputRef}
          type="file"
          accept=".lrc,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => setShowMerge(!showMerge)}
          disabled={!lrcText.trim()}
          title="貼入第二份翻譯／羅馬拼音 LRC，依時間戳合併成副標"
          style={{
            ...actionButtonStyle,
            ...(showMerge
              ? {
                  borderColor: 'var(--lb-accent)',
                  color: 'var(--lb-accent)',
                  background: 'rgba(124,106,239,0.08)',
                }
              : {}),
            ...(!lrcText.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
          }}
        >
          {showMerge ? <ChevronUp size={13} /> : <Languages size={13} />}
          合併翻譯
        </button>
      </div>

      {/* Collapsible translation merge panel */}
      {showMerge && (
        <div
          className="flex flex-col"
          style={{
            gap: '8px',
            borderRadius: '8px',
            border: '1px solid var(--lb-border)',
            padding: '10px',
            background: 'var(--lb-bg-secondary)',
          }}
        >
          <div className="text-lb-text-dim" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            貼入翻譯或羅馬拼音的 LRC，會依時間戳（±0.3 秒）對到上方歌詞，以副標顯示。
          </div>
          <textarea
            placeholder={'[00:12.50]第一句翻譯\n[00:18.30]第二句翻譯'}
            value={translationLrc}
            onChange={(e) => setTranslationLrc(e.target.value)}
            style={{
              background: 'var(--lb-bg-input)',
              border: '1px solid var(--lb-border)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--lb-text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              outline: 'none',
              width: '100%',
              minHeight: '90px',
              resize: 'vertical',
              lineHeight: 1.7,
            }}
          />
          <div className="flex justify-end">
            <button
              onClick={handleMergeTranslation}
              disabled={!translationLrc.trim()}
              style={{
                ...actionButtonStyle,
                borderColor: 'var(--lb-accent)',
                color: 'var(--lb-accent)',
                ...(!translationLrc.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
              }}
            >
              <Languages size={13} />
              合併
            </button>
          </div>
        </div>
      )}

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

      {/* Always-visible textarea */}
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
    </div>
  )
}
