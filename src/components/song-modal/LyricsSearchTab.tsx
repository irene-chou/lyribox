import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { searchLyrics, type LrclibSearchResult } from '@/lib/lrclib'

interface LyricsSearchTabProps {
  onSelect: (lrcText: string, trackName: string) => void
}

export function LyricsSearchTab({ onSelect }: LyricsSearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LrclibSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const data = await searchLyrics(q)
      setResults(data.filter((r) => r.syncedLyrics))
    } catch {
      setError('搜尋失敗，請稍後再試。')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  function handleSelect(result: LrclibSearchResult) {
    onSelect(result.syncedLyrics!, result.trackName)
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function getLyricsTag() {
    return { label: '同步歌詞', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' }
  }

  return (
    <div className="flex flex-col" style={{ gap: '8px' }}>
      {/* Search input row */}
      <div className="flex" style={{ gap: '6px' }}>
        <input
          type="text"
          placeholder="輸入歌曲或歌手名稱..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'var(--lb-bg-input)',
            border: '1px solid var(--lb-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--lb-text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            outline: 'none',
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
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--lb-accent)',
            background: 'var(--lb-accent)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !query.trim() ? 0.6 : 1,
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          搜尋
        </button>
      </div>

      {/* Results area */}
      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          borderRadius: '8px',
          border: searched ? '1px solid var(--lb-border)' : 'none',
        }}
      >
        {/* Loading */}
        {loading && (
          <div
            className="flex items-center justify-center text-lb-text-dim"
            style={{ padding: '24px', fontSize: '13px', gap: '8px' }}
          >
            <Loader2 size={16} className="animate-spin" />
            搜尋中...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="text-lb-text-dim"
            style={{
              padding: '24px',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* No results */}
        {!loading && !error && searched && results.length === 0 && (
          <div
            className="text-lb-text-dim"
            style={{
              padding: '24px',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            找不到相關歌詞
          </div>
        )}

        {/* Results list */}
        {!loading &&
          results.map((result) => {
            const tag = getLyricsTag()

            return (
              <div
                key={result.id}
                onClick={() => handleSelect(result)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--lb-border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--lb-bg-input)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Top row: track name + duration */}
                <div
                  className="flex items-center"
                  style={{ gap: '8px' }}
                >
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--lb-text-primary)',
                    }}
                  >
                    {result.trackName}
                  </span>
                  <span
                    className="shrink-0"
                    style={{
                      fontSize: '11px',
                      color: 'var(--lb-text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatDuration(result.duration)}
                  </span>
                </div>

                {/* Bottom row: artist · album + tag */}
                <div
                  className="flex items-center"
                  style={{ gap: '6px', marginTop: '2px' }}
                >
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{
                      fontSize: '11px',
                      color: 'var(--lb-text-secondary)',
                    }}
                  >
                    {result.artistName}
                    {result.albumName ? ` · ${result.albumName}` : ''}
                  </span>
                  {tag && (
                    <span
                      className="shrink-0"
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        color: tag.color,
                        background: tag.bg,
                        fontWeight: 500,
                      }}
                    >
                      {tag.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Initial hint */}
      {!searched && (
        <div
          className="text-lb-text-dim"
          style={{
            fontSize: '11px',
            lineHeight: 1.6,
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          透過{' '}
          <a
            href="https://lrclib.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lb-accent"
            style={{ textDecoration: 'none' }}
          >
            LRCLIB
          </a>{' '}
          搜尋同步歌詞
        </div>
      )}
    </div>
  )
}
