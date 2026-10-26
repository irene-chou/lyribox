import { useState, useRef, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, ListMusic, ArrowUp, ArrowDown, X, GripVertical, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { confirmDialog } from '@/stores/useDialogStore'
import { movePlaylistItem, removeFromPlaylist, resolvePlaylist } from '@/lib/playlist'
import type { Song } from '@/types'

/** dataTransfer type for in-playlist reordering — distinct from the folder drag ('text/plain'). */
const PLAYLIST_DND_TYPE = 'application/x-lyribox-playlist'

interface PlaylistSectionProps {
  songs: Song[]
  currentSongId: number | null
  onSelectSong: (song: Song) => void
}

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  cursor: 'pointer',
  userSelect: 'none',
  color: 'var(--lb-text-secondary)',
}

const smallBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '2px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

/**
 * Tonight's set: an ordered subset of the library. Drag (HTML5 drag events,
 * no extra dependency) or use the arrow buttons to reorder; 歌單模式 makes
 * prev/next follow this order and enables 播完自動下一首.
 */
export function PlaylistSection({ songs, currentSongId, onSelectSong }: PlaylistSectionProps) {
  const { playlist, playlistEnabled, autoNext, playlistOpen, setPlaylist, setPlaylistEnabled, setAutoNext, setPlaylistOpen } =
    useUISettingsStore(
      useShallow((s) => ({
        playlist: s.playlist,
        playlistEnabled: s.playlistEnabled,
        autoNext: s.autoNext,
        playlistOpen: s.playlistOpen,
        setPlaylist: s.setPlaylist,
        setPlaylistEnabled: s.setPlaylistEnabled,
        setAutoNext: s.setAutoNext,
        setPlaylistOpen: s.setPlaylistOpen,
      })),
    )

  const items = useMemo(() => resolvePlaylist(playlist, songs), [playlist, songs])

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)

  const move = useCallback(
    (from: number, to: number) => {
      const next = movePlaylistItem(playlist, from, to)
      if (next !== playlist) setPlaylist(next)
    },
    [playlist, setPlaylist],
  )

  const remove = useCallback(
    (songId: number) => setPlaylist(removeFromPlaylist(playlist, songId)),
    [playlist, setPlaylist],
  )

  const clear = useCallback(async () => {
    if (playlist.length === 0) return
    const ok = await confirmDialog({
      title: '清空歌單？',
      description: `會移除歌單中的 ${playlist.length} 首歌，歌曲本身不會被刪除。`,
      confirmLabel: '清空',
      destructive: true,
    })
    if (ok) setPlaylist([])
  }, [playlist, setPlaylist])

  function handleDrop(toIndex: number) {
    const from = dragIndexRef.current
    dragIndexRef.current = null
    setDragIndex(null)
    setOverIndex(null)
    if (from === null) return
    move(from, toIndex)
  }

  const count = items.length

  return (
    <section
      className="flex flex-col border border-lb-border"
      style={{ borderRadius: '8px', padding: '8px', gap: '6px', marginBottom: '4px' }}
    >
      {/* Header */}
      <div className="flex items-center" style={{ gap: '6px' }}>
        <button
          className="flex items-center flex-1 min-w-0 text-lb-text-secondary"
          style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', gap: '6px' }}
          onClick={() => setPlaylistOpen(!playlistOpen)}
          aria-expanded={playlistOpen}
        >
          {playlistOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <ListMusic size={14} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>歌單</span>
          <span style={{ fontSize: '11px' }}>{count}</span>
        </button>

        <label style={toggleStyle} title="開啟後，上一首／下一首與 ⌘[ ⌘] 依歌單順序切換">
          <input
            type="checkbox"
            checked={playlistEnabled}
            onChange={(e) => setPlaylistEnabled(e.target.checked)}
            style={{ accentColor: 'var(--lb-accent)', margin: 0 }}
          />
          歌單模式
        </label>
      </div>

      {playlistOpen && (
        <>
          <div className="flex items-center justify-between" style={{ gap: '8px' }}>
            <label
              style={{ ...toggleStyle, opacity: playlistEnabled ? 1 : 0.5 }}
              title={playlistEnabled ? '歌曲播放結束後 1.5 秒自動載入並播放下一首' : '需先開啟歌單模式'}
            >
              <input
                type="checkbox"
                checked={autoNext}
                disabled={!playlistEnabled}
                onChange={(e) => setAutoNext(e.target.checked)}
                style={{ accentColor: 'var(--lb-accent)', margin: 0 }}
              />
              播完自動下一首
            </label>
            {count > 0 && (
              <button
                onClick={clear}
                className="text-lb-text-secondary hover:text-lb-text-primary"
                style={{ ...smallBtnStyle, fontSize: '11px', gap: '4px', fontFamily: 'var(--font-sans)' }}
                title="清空歌單"
              >
                <Trash2 size={12} />
                清空
              </button>
            )}
          </div>

          {count === 0 ? (
            <p className="text-lb-text-secondary" style={{ fontSize: '11px', padding: '4px 4px 2px', fontStyle: 'italic' }}>
              將滑鼠移到歌曲上，按「加入歌單」排定今晚順序
            </p>
          ) : (
            <ol className="flex flex-col" style={{ gap: '2px', margin: 0, padding: 0, listStyle: 'none' }}>
              {items.map((song, index) => {
                const isActive = song.id === currentSongId
                const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
                return (
                  <li
                    key={song.id}
                    className="group flex items-center cursor-pointer"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(PLAYLIST_DND_TYPE, String(song.id))
                      e.dataTransfer.effectAllowed = 'move'
                      dragIndexRef.current = index
                      setDragIndex(index)
                    }}
                    onDragEnd={() => {
                      dragIndexRef.current = null
                      setDragIndex(null)
                      setOverIndex(null)
                    }}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes(PLAYLIST_DND_TYPE)) return
                      e.preventDefault()
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = 'move'
                      if (overIndex !== index) setOverIndex(index)
                    }}
                    onDrop={(e) => {
                      if (!e.dataTransfer.types.includes(PLAYLIST_DND_TYPE)) return
                      e.preventDefault()
                      e.stopPropagation()
                      handleDrop(index)
                    }}
                    onClick={() => onSelectSong(song)}
                    style={{
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      background: isActive ? 'var(--lb-accent)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--lb-text-primary)',
                      opacity: dragIndex === index ? 0.4 : 1,
                      boxShadow: isOver ? 'inset 0 2px 0 var(--lb-accent)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--lb-bg-input)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span
                      className="flex items-center shrink-0"
                      style={{ cursor: 'grab', color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--lb-text-secondary)' }}
                      title="拖曳排序"
                    >
                      <GripVertical size={14} />
                    </span>
                    <span
                      className="shrink-0"
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        width: '18px',
                        textAlign: 'right',
                        color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--lb-text-secondary)',
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{song.name}</span>

                    <span
                      className="opacity-0 group-hover:opacity-100 flex items-center shrink-0"
                      style={{ gap: '2px', color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--lb-text-secondary)' }}
                    >
                      <button
                        style={{ ...smallBtnStyle, color: 'inherit', opacity: index === 0 ? 0.3 : 1 }}
                        disabled={index === 0}
                        onClick={(e) => { e.stopPropagation(); move(index, index - 1) }}
                        title="上移"
                        aria-label="上移"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        style={{ ...smallBtnStyle, color: 'inherit', opacity: index === count - 1 ? 0.3 : 1 }}
                        disabled={index === count - 1}
                        onClick={(e) => { e.stopPropagation(); move(index, index + 1) }}
                        title="下移"
                        aria-label="下移"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        style={{ ...smallBtnStyle, color: 'inherit' }}
                        onClick={(e) => { e.stopPropagation(); remove(song.id) }}
                        title="移出歌單"
                        aria-label="移出歌單"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
