import { useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Link, Check, ListMusic, Menu, FileMusic, Plus, Keyboard, ChevronDown, Settings2, Coffee } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ObsPresetsDialog } from '@/components/settings/ObsPresetsDialog'

/** 多組 OBS 設定連結暫時關閉（功能保留，待決定要提供哪些預設）。 */
const OBS_PRESETS_ENABLED = false
import { getOBSUrl } from '@/lib/piesocket'
import { describeObsParams } from '@/lib/obs-params'
import { promptDialog } from '@/stores/useDialogStore'
import { toast } from '@/stores/useToastStore'
import { shortcutHint } from '@/lib/shortcuts'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { track } from '@/lib/analytics'
import type { ObsPreset } from '@/types'

const KOFI_URL = 'https://ko-fi.com/zephyrinn'

interface HeaderProps {
  onOpenDrawer: () => void
  onNewSong: () => void
  onShowShortcuts: () => void
  isMobile?: boolean
  onToggleMobilePanel?: () => void
}

export function Header({ onOpenDrawer, onNewSong, onShowShortcuts, isMobile, onToggleMobilePanel }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const obsPresets = useUISettingsStore((s) => s.obsPresets)

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  /** Copy the OBS URL; with a preset, its params are appended so that source looks different. */
  const copyOBSUrl = useCallback(async (preset?: ObsPreset) => {
    const url = getOBSUrl(preset?.params)
    // Opting in here is what makes useOBSSync open the PieSocket connection
    useUISettingsStore.getState().setObsSyncEnabled(true)
    track('obs_url_copy')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(preset ? `已複製「${preset.name}」的 OBS URL` : '已複製 OBS 瀏覽器來源 URL')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      await promptDialog({
        title: '複製 OBS URL',
        description: '無法自動寫入剪貼簿，請手動複製下方網址。',
        defaultValue: url,
        selectOnOpen: true,
        confirmLabel: '完成',
      })
    }
  }, [])

  const iconBtn = `header-btn flex items-center justify-center rounded-md transition-colors cursor-pointer`
  const iconBtnStyle: React.CSSProperties = { width: isMobile ? '36px' : '32px', height: isMobile ? '36px' : '32px' }

  return (
    <header
      className="flex items-center justify-between gap-4 bg-lb-bg-secondary border-b border-lb-border"
      style={{ padding: isMobile ? '6px 8px' : '10px 20px' }}
    >
      {/* Left: Logo (desktop) / Menu+Logo (mobile) */}
      <div className="flex items-center gap-2 shrink-0">
        {isMobile && onToggleMobilePanel ? (
          <button
            onClick={onToggleMobilePanel}
            className="flex items-center justify-center rounded-md transition-colors cursor-pointer text-lb-accent"
            style={iconBtnStyle}
            title="控制面板"
            aria-label="開啟控制面板"
          >
            <Menu size={20} />
          </button>
        ) : (
          <ListMusic size={22} className="text-lb-accent" aria-hidden />
        )}
        <h1 className="font-bold text-lb-text-primary tracking-tight" style={{ fontSize: isMobile ? '15px' : '18px' }}>
          Lyribox
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center ml-auto shrink-0" style={{ gap: isMobile ? '2px' : '6px' }}>
        <button onClick={toggleTheme} className={iconBtn} style={iconBtnStyle} title="切換主題" aria-label="切換主題">
          {theme === 'dark' ? <Moon size={isMobile ? 18 : 20} /> : <Sun size={isMobile ? 18 : 20} />}
        </button>

        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('kofi_click')}
          className={iconBtn}
          style={iconBtnStyle}
          title="在 Ko-fi 支持作者"
          aria-label="在 Ko-fi 支持作者"
        >
          <Coffee size={isMobile ? 18 : 20} />
        </a>

        {/* OBS URL: split button — main part copies the default URL, chevron lists presets */}
        <div className="flex items-center">
          <button
            onClick={() => copyOBSUrl()}
            className={`${iconBtn} ${copied ? 'text-lb-success' : ''}`}
            style={OBS_PRESETS_ENABLED ? { ...iconBtnStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 } : iconBtnStyle}
            title="複製 OBS 瀏覽器來源 URL"
            aria-label="複製 OBS 瀏覽器來源 URL"
          >
            {copied ? <Check size={isMobile ? 18 : 20} /> : <Link size={isMobile ? 18 : 20} />}
          </button>
          {OBS_PRESETS_ENABLED && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={iconBtn}
                style={{ ...iconBtnStyle, width: '18px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                title="OBS 預設組"
                aria-label="選擇 OBS 預設組"
              >
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-lb-bg-card border border-lb-border" style={{ minWidth: '220px' }}>
              <DropdownMenuLabel className="text-lb-text-dim" style={{ fontSize: '11px' }}>
                複製 OBS URL（預設組）
              </DropdownMenuLabel>
              {obsPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => copyOBSUrl(preset)}
                  className="cursor-pointer text-sm text-lb-text-primary flex flex-col items-start"
                  style={{ gap: '1px' }}
                >
                  <span>{preset.name}</span>
                  <span className="text-lb-text-dim" style={{ fontSize: '11px' }}>
                    {describeObsParams(preset.params)}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-lb-border" />
              <DropdownMenuItem onClick={() => setPresetsOpen(true)} className="cursor-pointer text-sm text-lb-text-primary">
                <Settings2 size={14} className="mr-2" />
                管理預設…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
        {OBS_PRESETS_ENABLED && <ObsPresetsDialog open={presetsOpen} onOpenChange={setPresetsOpen} onCopy={copyOBSUrl} />}

        {!isMobile && (
          <button
            onClick={onShowShortcuts}
            className={iconBtn}
            style={iconBtnStyle}
            title={`快捷鍵一覽 ${shortcutHint('show-shortcuts')}`}
            aria-label="快捷鍵一覽"
          >
            <Keyboard size={20} />
          </button>
        )}

        {!isMobile && <span aria-hidden className="bg-lb-border" style={{ width: '1px', height: '18px', margin: '0 4px' }} />}

        {/* New song */}
        {isMobile ? (
          <button onClick={onNewSong} className={iconBtn} style={iconBtnStyle} title="新增歌曲" aria-label="新增歌曲">
            <Plus size={20} />
          </button>
        ) : (
          <button
            onClick={onNewSong}
            className="flex items-center border border-lb-border bg-lb-bg-input text-lb-text-primary hover:bg-lb-bg-card hover:border-lb-text-dim transition-colors cursor-pointer"
            style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, gap: '6px', fontFamily: 'var(--font-sans)' }}
            title="新增歌曲"
          >
            <Plus size={16} />
            新增歌曲
          </button>
        )}

        {/* Song drawer trigger */}
        {isMobile ? (
          <button
            onClick={onOpenDrawer}
            className="header-accent-btn flex items-center justify-center rounded-md transition-colors cursor-pointer"
            style={iconBtnStyle}
            title="歌曲庫"
            aria-label="歌曲庫"
          >
            <FileMusic size={20} />
          </button>
        ) : (
          <button
            onClick={onOpenDrawer}
            className="flex items-center bg-lb-accent text-white hover:bg-[#6b59de] hover:shadow-[0_4px_16px_var(--lb-accent-glow)] transition-all cursor-pointer"
            style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, gap: '6px', border: 'none', fontFamily: 'var(--font-sans)' }}
            title="歌曲庫"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <FileMusic size={16} />
            歌曲庫
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 500,
                background: 'rgba(255,255,255,0.18)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              {shortcutHint('search-songs').replace(/[()]/g, '')}
            </kbd>
          </button>
        )}
      </div>
    </header>
  )
}
