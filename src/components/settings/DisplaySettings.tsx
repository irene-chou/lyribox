import { useShallow } from 'zustand/react/shallow'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { confirmDialog } from '@/stores/useDialogStore'
import { ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'
import { FontSizeControl } from './FontSizeControl'
import { LyricsGapControl } from './LyricsGapControl'
import { ColorPicker } from './ColorPicker'
import { VisibleRangeControl } from './VisibleRangeControl'
import { RotateCcw, Eye, EyeOff, ChevronRight } from 'lucide-react'

const groupLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--lb-text-dim)',
}

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'var(--lb-border)',
  margin: '2px 0',
}

export function DisplaySettings() {
  const {
    activeFontSize,
    otherFontSize,
    titleFontSize,
    showTitle,
    lyricsGap,
    visibleBefore,
    visibleAfter,
    activeColor,
    otherColor,
    passedColor,
    lyricsBgColor,
    displaySettingsOpen,
    setActiveFontSize,
    setOtherFontSize,
    setTitleFontSize,
    setShowTitle,
    setLyricsGap,
    setVisibleBefore,
    setVisibleAfter,
    setActiveColor,
    setOtherColor,
    setPassedColor,
    setLyricsBgColor,
    setDisplaySettingsOpen,
    resetAll,
  } = useUISettingsStore(
    useShallow((s) => ({
      activeFontSize: s.activeFontSize,
      otherFontSize: s.otherFontSize,
      titleFontSize: s.titleFontSize,
      showTitle: s.showTitle,
      lyricsGap: s.lyricsGap,
      visibleBefore: s.visibleBefore,
      visibleAfter: s.visibleAfter,
      activeColor: s.activeColor,
      otherColor: s.otherColor,
      passedColor: s.passedColor,
      lyricsBgColor: s.lyricsBgColor,
      displaySettingsOpen: s.displaySettingsOpen,
      setActiveFontSize: s.setActiveFontSize,
      setOtherFontSize: s.setOtherFontSize,
      setTitleFontSize: s.setTitleFontSize,
      setShowTitle: s.setShowTitle,
      setLyricsGap: s.setLyricsGap,
      setVisibleBefore: s.setVisibleBefore,
      setVisibleAfter: s.setVisibleAfter,
      setActiveColor: s.setActiveColor,
      setOtherColor: s.setOtherColor,
      setPassedColor: s.setPassedColor,
      setLyricsBgColor: s.setLyricsBgColor,
      setDisplaySettingsOpen: s.setDisplaySettingsOpen,
      resetAll: s.resetAll,
    }))
  )

  async function handleReset() {
    const ok = await confirmDialog({
      title: '重置顯示設定？',
      description: '字體大小、顏色、間距與 OBS 顯示行數都會回到預設值。',
      confirmLabel: '重置',
      destructive: true,
    })
    if (ok) resetAll()
  }

  return (
    <section
      className="flex flex-col border border-lb-border"
      style={{
        borderRadius: 'var(--lb-radius)',
        padding: displaySettingsOpen ? '16px' : '10px 16px',
        gap: '10px',
      }}
    >
      {/* Section header (toggle) */}
      <div className="flex items-center justify-between" style={{ gap: '8px' }}>
        <button
          onClick={() => setDisplaySettingsOpen(!displaySettingsOpen)}
          aria-expanded={displaySettingsOpen}
          aria-controls="display-settings-body"
          className="flex items-center flex-1 min-w-0 text-left text-lb-text-dim hover:text-lb-text-secondary transition-colors cursor-pointer"
          style={{ gap: '8px', border: 'none', background: 'none', padding: 0, minHeight: '28px' }}
        >
          <ChevronRight
            size={14}
            style={{ transition: 'transform 0.2s', transform: displaySettingsOpen ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
          />
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            顯示設定
          </span>
          {!displaySettingsOpen && (
            <span className="truncate" style={{ fontSize: '11px' }}>
              字體 · 顏色 · OBS 行數
            </span>
          )}
        </button>
        <button onClick={handleReset} className={ICON_BTN_CLASS} style={ICON_BTN_STYLE} title="重置顯示設定" aria-label="重置顯示設定">
          <RotateCcw size={14} />
        </button>
      </div>

      {displaySettingsOpen && (
        <div id="display-settings-body" className="flex flex-col" style={{ gap: '10px' }}>
          {/* Group: 字體 */}
          <span style={groupLabelStyle}>字體</span>
          <div className="flex flex-col" style={{ gap: '6px' }}>
            <div className="flex items-center" style={{ gap: '8px' }}>
              <button
                onClick={() => setShowTitle(!showTitle)}
                className="flex items-center justify-center border border-lb-border bg-lb-bg-input text-lb-text-secondary hover:bg-lb-bg-card hover:border-lb-text-dim hover:text-lb-text-primary transition-colors cursor-pointer"
                style={{ width: '26px', height: '26px', padding: 0, borderRadius: '4px' }}
                title={showTitle ? '隱藏標題' : '顯示標題'}
                aria-pressed={showTitle}
              >
                {showTitle ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <div className="flex-1" style={{ opacity: showTitle ? 1 : 0.4 }}>
                <FontSizeControl label="歌名" value={titleFontSize} min={10} max={40} step={2} onChange={setTitleFontSize} />
              </div>
            </div>
            <FontSizeControl label="當前行" value={activeFontSize} min={14} max={60} step={2} onChange={setActiveFontSize} />
            <FontSizeControl label="其他行" value={otherFontSize} min={14} max={60} step={2} onChange={setOtherFontSize} />
            <LyricsGapControl value={lyricsGap} onChange={setLyricsGap} />
          </div>

          <div style={dividerStyle} />

          {/* Group: 顏色 */}
          <span style={groupLabelStyle}>顏色</span>
          <div className="flex flex-col" style={{ gap: '8px' }}>
            <ColorPicker label="當前行" value={activeColor} onChange={setActiveColor} />
            <ColorPicker label="未唱行" value={otherColor} onChange={setOtherColor} />
            <ColorPicker label="已唱行" value={passedColor} onChange={setPassedColor} />
            <ColorPicker label="背景" value={lyricsBgColor} onChange={setLyricsBgColor} />
          </div>

          <div style={dividerStyle} />

          {/* Group: OBS */}
          <span style={groupLabelStyle}>OBS</span>
          <VisibleRangeControl
            before={visibleBefore}
            after={visibleAfter}
            onBeforeChange={setVisibleBefore}
            onAfterChange={setVisibleAfter}
          />
        </div>
      )}
    </section>
  )
}
