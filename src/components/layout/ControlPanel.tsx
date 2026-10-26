import { Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { navigateSong } from '@/lib/song-selection'
import { shortcutHint } from '@/lib/shortcuts'
import { ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'
import { AudioPlayer } from '../playback/AudioPlayer'
import { OffsetControls } from '../playback/OffsetControls'
import { PitchControls } from '../playback/PitchControls'
import { DisplaySettings } from '../settings/DisplaySettings'
import { CloudBackupSettings } from '../settings/CloudBackupSettings'

/** 雲端備份暫時關閉（功能保留，之後再開）。 */
const CLOUD_BACKUP_ENABLED = false
import { SaveStatusIndicator } from './SaveStatusIndicator'
import type { Song } from '@/types'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

interface ControlPanelProps {
  onEditSong: (song: Song) => void
  engine: ReturnType<typeof usePlaybackEngine>
  isMobile?: boolean
  onClose?: () => void
}

const navBtnClass =
  'flex items-center justify-center shrink-0 border border-lb-border bg-lb-bg-input text-lb-text-primary hover:bg-lb-bg-card hover:border-lb-text-dim transition-colors cursor-pointer'
const navBtnStyle: React.CSSProperties = { width: '28px', height: '28px', borderRadius: '6px', padding: 0 }

export function ControlPanel({ onEditSong, engine, isMobile, onClose }: ControlPanelProps) {
  const { currentSongId, currentSongTitle, currentSongCreatedAt, lrcText, offset, pitch, audioSource, youtubeId, audioFileName, folderId } = useSongStore(
    useShallow((s) => ({
      currentSongId: s.currentSongId,
      currentSongTitle: s.currentSongTitle,
      currentSongCreatedAt: s.currentSongCreatedAt,
      lrcText: s.lrcText,
      offset: s.offset,
      pitch: s.pitch,
      audioSource: s.audioSource,
      youtubeId: s.youtubeId,
      audioFileName: s.audioFileName,
      folderId: s.folderId,
    }))
  )
  const sidebarWidth = useUISettingsStore((s) => s.sidebarWidth)

  function handleEdit() {
    if (!currentSongId) return
    const song: Song = {
      id: currentSongId,
      name: currentSongTitle,
      lrcText,
      offset,
      pitch,
      audioSource,
      youtubeId,
      audioFileName,
      folderId,
      createdAt: currentSongCreatedAt || Date.now(),
      updatedAt: Date.now(),
    }
    onEditSong(song)
  }

  return (
    <aside
      className="flex flex-col overflow-y-auto bg-lb-bg-secondary border-r border-lb-border"
      style={{
        width: isMobile ? '100%' : sidebarWidth,
        height: isMobile ? '100%' : undefined,
        flexShrink: 0,
        padding: isMobile ? '16px' : '20px',
        gap: '16px',
      }}
    >
      {/* Mobile header with close button */}
      {isMobile && onClose && (
        <div className="flex items-center justify-between">
          <h2 className="text-lb-text-primary" style={{ fontSize: '14px', fontWeight: 600 }}>
            控制面板
          </h2>
          <button onClick={onClose} className={ICON_BTN_CLASS} style={ICON_BTN_STYLE} title="關閉" aria-label="關閉控制面板">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 歌曲設定 */}
      <section
        className="flex flex-col border border-lb-border"
        style={{ borderRadius: 'var(--lb-radius)', padding: isMobile ? '12px' : '16px', gap: '12px' }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-lb-text-dim"
            style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            歌曲設定
          </h2>
          {currentSongId && (
            <button onClick={handleEdit} className={ICON_BTN_CLASS} style={ICON_BTN_STYLE} title="編輯歌曲" aria-label="編輯歌曲">
              <Pencil size={14} />
            </button>
          )}
        </div>

        {currentSongId ? (
          <>
            {/* Title + prev/next, save status below (aligned with title) */}
            <div className="flex flex-col" style={{ gap: '2px' }}>
              <div className="flex items-center" style={{ gap: '6px' }}>
                <button
                  className={navBtnClass}
                  style={navBtnStyle}
                  onClick={() => void navigateSong(-1)}
                  title={`上一首 ${shortcutHint('prev-song')}`}
                  aria-label="上一首"
                >
                  <ChevronLeft size={14} />
                </button>
                <span
                  className="flex-1 min-w-0 truncate text-lb-text-primary"
                  style={{ fontSize: '14px', fontWeight: 600, lineHeight: '28px' }}
                  title={currentSongTitle}
                >
                  {currentSongTitle}
                </span>
                <button
                  className={navBtnClass}
                  style={navBtnStyle}
                  onClick={() => void navigateSong(1)}
                  title={`下一首 ${shortcutHint('next-song')}`}
                  aria-label="下一首"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ paddingLeft: '34px' }}>
                <SaveStatusIndicator />
              </div>
            </div>

            <AudioPlayer engine={engine} />
            <OffsetControls />
            <PitchControls />
          </>
        ) : (
          <p className="text-lb-text-secondary" style={{ fontSize: '13px' }}>
            尚未載入歌曲
          </p>
        )}
      </section>

      {/* 顯示設定（可收合） */}
      <DisplaySettings />

      {/* 雲端備份（可收合；暫時關閉） */}
      {CLOUD_BACKUP_ENABLED && <CloudBackupSettings />}

      {!isMobile && (
        <p className="text-lb-text-secondary" style={{ marginTop: 'auto', fontSize: '11px', lineHeight: 1.6 }}>
          按{' '}
          <kbd
            className="bg-lb-bg-input border border-lb-border text-lb-text-primary"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}
          >
            ?
          </kbd>{' '}
          查看所有快捷鍵
        </p>
      )}
    </aside>
  )
}
