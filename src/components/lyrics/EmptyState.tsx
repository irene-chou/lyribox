import { Music, Plus, FileMusic } from 'lucide-react'

interface EmptyStateProps {
  isMobile?: boolean
  onNewSong: () => void
  onOpenDrawer: () => void
}

export function EmptyState({ isMobile, onNewSong, onOpenDrawer }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center text-lb-text-dim"
      style={{ height: '100%', padding: isMobile ? '24px 16px' : '48px', gap: '20px' }}
    >
      <Music size={isMobile ? 36 : 48} aria-hidden />
      <p className="text-lb-text-secondary" style={{ fontSize: isMobile ? '14px' : '15px', lineHeight: 1.7 }}>
        還沒有載入歌曲
      </p>
      <div className="flex items-center flex-wrap justify-center" style={{ gap: '10px' }}>
        <button
          onClick={onNewSong}
          className="flex items-center bg-lb-accent text-white hover:bg-[#6b59de] hover:shadow-[0_4px_16px_var(--lb-accent-glow)] transition-all cursor-pointer"
          style={{ height: '40px', padding: '0 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, gap: '8px', border: 'none', fontFamily: 'var(--font-sans)' }}
        >
          <Plus size={16} />
          新增歌曲
        </button>
        <button
          onClick={onOpenDrawer}
          className="flex items-center border border-lb-border bg-lb-bg-input text-lb-text-primary hover:bg-lb-bg-card hover:border-lb-text-dim transition-colors cursor-pointer"
          style={{ height: '40px', padding: '0 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, gap: '8px', fontFamily: 'var(--font-sans)' }}
        >
          <FileMusic size={16} />
          開啟歌曲庫
        </button>
      </div>
    </div>
  )
}
