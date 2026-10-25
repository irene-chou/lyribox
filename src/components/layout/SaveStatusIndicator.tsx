import { Check, Loader2 } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { useSaveStatusStore } from '@/stores/useSaveStatusStore'
import { shortcutHint } from '@/lib/shortcuts'

/** Tiny "未儲存 / 儲存中 / 已儲存" label shown under the song title. */
export function SaveStatusIndicator() {
  const status = useSaveStatusStore((s) => s.status)
  const dirty = useSongStore((s) => {
    const saved = s.lastSavedState
    if (!saved) return false
    return (
      s.currentSongTitle !== saved.name ||
      s.lrcText !== saved.lrcText ||
      s.offset !== saved.offset ||
      s.pitch !== saved.pitch ||
      s.audioSource !== saved.audioSource ||
      s.youtubeId !== saved.youtubeId ||
      s.audioFileName !== saved.audioFileName
    )
  })

  let content: React.ReactNode = null
  let color = 'var(--lb-text-dim)'
  let title = ''

  if (status === 'saving') {
    content = (
      <>
        <Loader2 size={11} className="animate-spin" />
        儲存中
      </>
    )
    title = '正在寫入瀏覽器資料庫'
  } else if (status === 'saved') {
    content = (
      <>
        <Check size={11} />
        已儲存
      </>
    )
    color = 'var(--lb-success)'
    title = '已儲存'
  } else if (dirty || status === 'pending') {
    content = (
      <>
        <span aria-hidden style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
        未儲存 · 片刻後自動儲存
      </>
    )
    color = '#eab308'
    title = `偏移／Key 變更會自動儲存，也可按 ${shortcutHint('save')} 立即儲存`
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center"
      style={{ gap: '4px', fontSize: '11px', color, minHeight: '16px', transition: 'color 0.2s' }}
      title={title}
    >
      {content}
    </span>
  )
}
