import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChevronRight, CloudUpload, CloudDownload, ExternalLink, Loader2 } from 'lucide-react'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { confirmDialog } from '@/stores/useDialogStore'
import { getGistToken, setGistToken, backupNow, restoreFromCloud } from '@/lib/cloud-backup'
import { CONTROL_BTN_CLASS, OFFSET_BTN_STYLE } from '@/lib/constants'

const inputStyle: React.CSSProperties = {
  height: '28px',
  background: 'var(--lb-bg-input)',
  border: '1px solid var(--lb-border)',
  borderRadius: '4px',
  padding: '0 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--lb-text-primary)',
  outline: 'none',
  width: '100%',
  minWidth: 0,
}

function formatLast(at: number | null): string {
  if (!at) return '尚未備份'
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `上次備份 ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CloudBackupSettings() {
  const { open, gistId, autoBackup, lastBackupAt, setOpen, setGistId, setAutoBackup } = useUISettingsStore(
    useShallow((s) => ({
      open: s.cloudBackupOpen,
      gistId: s.gistId,
      autoBackup: s.autoBackup,
      lastBackupAt: s.lastBackupAt,
      setOpen: s.setCloudBackupOpen,
      setGistId: s.setGistId,
      setAutoBackup: s.setAutoBackup,
    })),
  )
  const [token, setToken] = useState(getGistToken)
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null)

  function commitToken(value: string) {
    const trimmed = value.trim()
    setToken(trimmed)
    setGistToken(trimmed)
  }

  async function handleBackup() {
    setBusy('backup')
    try {
      await backupNow()
    } finally {
      setBusy(null)
    }
  }

  async function handleRestore() {
    const ok = await confirmDialog({
      title: '從雲端還原歌庫？',
      description: '會把 Gist 裡的歌曲與資料夾合併進目前歌庫，同一首歌以較新的版本為準。本地音檔不受影響。',
      confirmLabel: '還原',
    })
    if (!ok) return
    setBusy('restore')
    try {
      await restoreFromCloud()
    } finally {
      setBusy(null)
    }
  }

  const hasToken = token.length > 0
  const summary = !hasToken ? '未設定' : autoBackup ? '自動備份開啟' : formatLast(lastBackupAt)

  return (
    <section
      className="flex flex-col border border-lb-border"
      style={{ borderRadius: 'var(--lb-radius)', padding: open ? '16px' : '10px 16px', gap: '10px' }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="cloud-backup-body"
        className="flex items-center flex-1 min-w-0 text-left text-lb-text-dim hover:text-lb-text-secondary transition-colors cursor-pointer"
        style={{ gap: '8px', border: 'none', background: 'none', padding: 0, minHeight: '28px' }}
      >
        <ChevronRight
          size={14}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
        />
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          雲端備份
        </span>
        {!open && (
          <span className="truncate" style={{ fontSize: '11px' }}>
            {summary}
          </span>
        )}
      </button>

      {open && (
        <div id="cloud-backup-body" className="flex flex-col" style={{ gap: '10px' }}>
          <label className="flex flex-col" style={{ gap: '4px' }}>
            <span className="text-lb-text-secondary" style={{ fontSize: '11px' }}>
              GitHub Token
            </span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="ghp_…"
              defaultValue={token}
              key={token ? 'set' : 'empty'}
              onBlur={(e) => commitToken(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitToken(e.currentTarget.value)
              }}
              style={inputStyle}
              aria-label="GitHub Token"
            />
            <span className="text-lb-text-dim" style={{ fontSize: '11px', lineHeight: 1.5 }}>
              只需要 <code style={{ fontFamily: 'var(--font-mono)' }}>gist</code> 權限，歌庫會存成私密 Gist（不含本地音檔）。{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=Lyribox"
                target="_blank"
                rel="noreferrer"
                className="text-lb-accent hover:underline inline-flex items-center"
                style={{ gap: '2px' }}
              >
                建立 Token
                <ExternalLink size={10} />
              </a>
            </span>
          </label>

          <div className="flex items-center" style={{ gap: '8px' }}>
            <button
              onClick={() => void handleBackup()}
              disabled={!hasToken || busy !== null}
              className={`${CONTROL_BTN_CLASS} flex items-center disabled:opacity-40 disabled:cursor-not-allowed`}
              style={{ ...OFFSET_BTN_STYLE, gap: '6px' }}
              title="把歌庫備份到 Gist"
            >
              {busy === 'backup' ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />}
              立即備份
            </button>
            <button
              onClick={() => void handleRestore()}
              disabled={!hasToken || !gistId || busy !== null}
              className={`${CONTROL_BTN_CLASS} flex items-center disabled:opacity-40 disabled:cursor-not-allowed`}
              style={{ ...OFFSET_BTN_STYLE, gap: '6px' }}
              title={gistId ? '從 Gist 合併還原歌庫' : '尚未有備份'}
            >
              {busy === 'restore' ? <Loader2 size={13} className="animate-spin" /> : <CloudDownload size={13} />}
              從雲端還原
            </button>
          </div>

          <label className="flex items-center cursor-pointer text-lb-text-secondary" style={{ gap: '8px', fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={autoBackup}
              disabled={!hasToken}
              onChange={(e) => setAutoBackup(e.target.checked)}
              style={{ accentColor: 'var(--lb-accent)' }}
            />
            儲存歌曲後自動備份（30 秒後）
          </label>

          <div className="flex items-center justify-between text-lb-text-dim" style={{ fontSize: '11px', gap: '8px' }}>
            <span>{formatLast(lastBackupAt)}</span>
            {gistId && (
              <span className="flex items-center" style={{ gap: '6px' }}>
                <a
                  href={`https://gist.github.com/${gistId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-lb-text-secondary hover:underline"
                >
                  開啟 Gist
                </a>
                <button
                  onClick={() => setGistId(null)}
                  className="hover:text-lb-text-secondary hover:underline cursor-pointer"
                  style={{ border: 'none', background: 'none', padding: 0, fontSize: '11px' }}
                  title="下次備份會建立新的 Gist"
                >
                  解除連結
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
