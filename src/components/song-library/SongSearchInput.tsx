import { forwardRef } from 'react'
import { Search } from 'lucide-react'

interface SongSearchInputProps {
  value: string
  onChange: (value: string) => void
  /** Called when the user presses Enter (e.g. load the first match). */
  onSubmit?: () => void
  /** Short hint rendered at the right edge, e.g. "↵ 載入第一首". */
  hint?: string
}

export const SongSearchInput = forwardRef<HTMLInputElement, SongSearchInputProps>(function SongSearchInput(
  { value, onChange, onSubmit, hint },
  ref,
) {
  return (
    <div className="relative flex items-center" style={{ width: '100%' }}>
      <Search size={14} aria-hidden className="absolute text-lb-text-secondary" style={{ left: '12px', pointerEvents: 'none' }} />
      <input
        ref={ref}
        type="search"
        placeholder="搜尋歌曲..."
        aria-label="搜尋歌曲"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) {
            e.preventDefault()
            onSubmit()
          }
        }}
        style={{
          flexShrink: 0,
          background: 'var(--lb-bg-input)',
          border: '1px solid var(--lb-border)',
          borderRadius: '8px',
          height: '34px',
          padding: hint ? '0 110px 0 32px' : '0 12px 0 32px',
          color: 'var(--lb-text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          outline: 'none',
          width: '100%',
          transition: 'border-color 0.2s',
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
      {hint && (
        <span
          aria-hidden
          className="absolute text-lb-text-secondary"
          style={{ right: '10px', fontSize: '10px', fontFamily: 'var(--font-mono)', pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          {hint}
        </span>
      )}
    </div>
  )
})
