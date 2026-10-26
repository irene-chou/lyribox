import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { X, FolderPlus, Plus } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { SongSearchInput } from './SongSearchInput'
import { SongListItem } from './SongListItem'
import { SongDrawerMenu } from './SongDrawerMenu'
import { FolderSection } from './FolderSection'
import { PlaylistSection } from './PlaylistSection'
import {
  useSongs,
  useFolders,
  saveSongToDB,
  deleteSongFromDB,
  createFolder,
  updateFolder,
  deleteFolder,
  restoreFolder,
  moveSongToFolder,
} from '@/hooks/useSongLibrary'
import { useSongStore } from '@/stores/useSongStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { confirmDialog, promptDialog } from '@/stores/useDialogStore'
import { toast } from '@/stores/useToastStore'
import { getAudioFile, restoreAudioFile } from '@/lib/audio-file-store'
import { selectSong } from '@/lib/song-selection'
import { togglePlaylist, pruneMissing } from '@/lib/playlist'
import { ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'
import type { Song, Folder } from '@/types'

interface SongDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewSong: () => void
  isMobile?: boolean
}

export function SongDrawer({ open, onOpenChange, onNewSong, isMobile }: SongDrawerProps) {
  const [search, setSearch] = useState('')
  const songs = useSongs()
  const folders = useFolders()
  const currentSongId = useSongStore((s) => s.currentSongId)
  const playlist = useUISettingsStore((s) => s.playlist)
  const searchRef = useRef<HTMLInputElement>(null)

  const playlistIds = useMemo(() => new Set(playlist), [playlist])

  // Drop playlist entries whose song was deleted (e.g. via a different tab)
  useEffect(() => {
    if (!songs) return
    const pruned = pruneMissing(playlist, songs)
    if (pruned !== playlist) useUISettingsStore.getState().setPlaylist(pruned)
  }, [songs, playlist])

  const handleTogglePlaylist = useCallback((song: Song) => {
    const ui = useUISettingsStore.getState()
    const wasIn = ui.playlist.includes(song.id)
    ui.setPlaylist(togglePlaylist(ui.playlist, song.id))
    toast.success(wasIn ? `已從歌單移出「${song.name}」` : `已加入歌單「${song.name}」`)
  }, [])

  // Uncategorized section drag-over state
  const [unfolderDragOver, setUnfolderDragOver] = useState(false)
  const unfolderDragCounterRef = useRef(0)

  // Focus the search box whenever the drawer opens (⌘K flow)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      searchRef.current?.focus()
      searchRef.current?.select()
    }, 60)
    return () => clearTimeout(t)
  }, [open])

  const filteredSongs = useMemo(() => {
    if (!songs) return []
    if (!search.trim()) return songs
    const query = search.trim().toLowerCase()
    return songs.filter((s) => s.name.toLowerCase().includes(query))
  }, [songs, search])

  const isSearching = search.trim().length > 0

  const { folderSongs, unfolderSongs } = useMemo(() => {
    if (!songs || !folders) return { folderSongs: new Map<number, Song[]>(), unfolderSongs: [] }
    const folderMap = new Map<number, Song[]>()
    for (const f of folders) folderMap.set(f.id, [])
    const uncategorized: Song[] = []
    for (const s of songs) {
      if (s.folderId !== null && folderMap.has(s.folderId)) {
        folderMap.get(s.folderId)!.push(s)
      } else {
        uncategorized.push(s)
      }
    }
    return { folderSongs: folderMap, unfolderSongs: uncategorized }
  }, [songs, folders])

  const handleSelect = useCallback((song: Song) => {
    void selectSong(song)
    onOpenChange(false)
  }, [onOpenChange])

  const handleSearchSubmit = useCallback(() => {
    const first = filteredSongs[0]
    if (first) handleSelect(first)
  }, [filteredSongs, handleSelect])

  const handleDelete = useCallback(async (song: Song) => {
    // Snapshot the stored audio (if any) so the delete can be undone
    const audioRecord = await getAudioFile(song.id)
    await deleteSongFromDB(song.id)
    const wasCurrent = useSongStore.getState().currentSongId === song.id
    if (wasCurrent) useSongStore.getState().clearSong()

    toast(`已刪除「${song.name}」`, {
      actionLabel: '復原',
      onAction: async () => {
        await saveSongToDB(song)
        if (audioRecord) await restoreAudioFile(audioRecord)
        if (wasCurrent) void selectSong(song)
        toast.success(`已復原「${song.name}」`)
      },
    })
  }, [])

  const handleMove = useCallback(async (song: Song, folderId: number | null) => {
    await moveSongToFolder(song.id, folderId)
    if (useSongStore.getState().currentSongId === song.id) {
      useSongStore.getState().setFolderId(folderId)
    }
  }, [])

  // Used by drag-and-drop: receives songId instead of Song object
  const handleDropSong = useCallback(async (songId: number, folderId: number | null) => {
    await moveSongToFolder(songId, folderId)
    if (useSongStore.getState().currentSongId === songId) {
      useSongStore.getState().setFolderId(folderId)
    }
  }, [])

  const handleCreateFolder = useCallback(async () => {
    const name = await promptDialog({
      title: '新增資料夾',
      label: '資料夾名稱',
      placeholder: '例如：練習曲、直播歌單',
      confirmLabel: '建立',
    })
    if (!name?.trim()) return
    await createFolder(name.trim())
  }, [])

  const handleRenameFolder = useCallback(async (folder: Folder, newName: string) => {
    await updateFolder(folder.id, newName)
  }, [])

  const handleDeleteFolder = useCallback(async (folder: Folder) => {
    const count = folderSongs.get(folder.id)?.length ?? 0
    const confirmed = await confirmDialog({
      title: `刪除資料夾「${folder.name}」？`,
      description: count > 0 ? `資料夾內的 ${count} 首歌會移至未分類，不會被刪除。` : '這個資料夾是空的。',
      confirmLabel: '刪除',
      destructive: true,
    })
    if (!confirmed) return
    const movedSongIds = await deleteFolder(folder.id)
    const state = useSongStore.getState()
    if (state.folderId === folder.id) state.setFolderId(null)

    toast(`已刪除資料夾「${folder.name}」`, {
      actionLabel: '復原',
      onAction: async () => {
        await restoreFolder(folder, movedSongIds)
        const s = useSongStore.getState()
        if (s.currentSongId !== null && movedSongIds.includes(s.currentSongId)) s.setFolderId(folder.id)
      },
    })
  }, [folderSongs])

  const folderList = folders ?? []
  const isLoading = !songs
  const hasFolders = folderList.length > 0

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="h-full bg-lb-bg-secondary border-l border-lb-border"
        style={{ width: isMobile ? '100vw' : '400px' }}
      >
        {/* Header */}
        <DrawerHeader
          className="flex-row items-center justify-between shrink-0 border-b border-lb-border"
          style={{ padding: isMobile ? '12px 16px' : '16px 20px' }}
        >
          <div>
            <DrawerTitle className="text-lb-text-primary" style={{ fontSize: '14px', fontWeight: 600 }}>
              歌曲庫
            </DrawerTitle>
            <DrawerDescription className="sr-only">管理你的歌曲</DrawerDescription>
          </div>
          <div className="flex items-center" style={{ gap: '6px' }}>
            <button
              onClick={() => {
                onOpenChange(false)
                onNewSong()
              }}
              className="flex items-center bg-lb-accent text-white hover:bg-[#6b59de] transition-colors cursor-pointer"
              style={{ height: '30px', padding: '0 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, gap: '6px', border: 'none', fontFamily: 'var(--font-sans)' }}
            >
              <Plus size={14} />
              新增歌曲
            </button>
            <button onClick={() => onOpenChange(false)} className={ICON_BTN_CLASS} style={ICON_BTN_STYLE} title="關閉" aria-label="關閉歌曲庫 (Esc)">
              <X size={16} />
            </button>
          </div>
        </DrawerHeader>

        {/* Body */}
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ padding: isMobile ? '12px 16px' : '16px 20px', gap: '12px' }}
        >
          <div className="flex items-center" style={{ gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SongSearchInput
                ref={searchRef}
                value={search}
                onChange={setSearch}
                onSubmit={handleSearchSubmit}
                hint={isSearching && filteredSongs.length > 0 ? '↵ 載入第一首' : undefined}
              />
            </div>
            <button
              onClick={handleCreateFolder}
              className={ICON_BTN_CLASS}
              style={{ ...ICON_BTN_STYLE, width: '32px', height: '32px' }}
              title="新增資料夾"
              aria-label="新增資料夾"
            >
              <FolderPlus size={16} />
            </button>
            <SongDrawerMenu />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col" style={{ gap: '2px' }}>
            {isLoading ? (
              <p className="text-lb-text-secondary" style={{ fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                載入中...
              </p>
            ) : isSearching ? (
              // Flat search results
              filteredSongs.length === 0 ? (
                <p className="text-lb-text-secondary" style={{ fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                  找不到符合的歌曲
                </p>
              ) : (
                <>
                  <div
                    className="text-lb-text-secondary"
                    style={{ fontSize: '11px', fontWeight: 600, padding: '8px 8px 4px', letterSpacing: '0.05em' }}
                  >
                    搜尋結果 · {filteredSongs.length}
                  </div>
                  {filteredSongs.map((song) => (
                    <SongListItem
                      key={song.id}
                      song={song}
                      isActive={currentSongId === song.id}
                      folders={folderList}
                      onSelect={handleSelect}
                      onDelete={handleDelete}
                      onMove={handleMove}
                      inPlaylist={playlistIds.has(song.id)}
                      onTogglePlaylist={handleTogglePlaylist}
                    />
                  ))}
                </>
              )
            ) : (
              // Grouped view
              <>
                <PlaylistSection songs={songs} currentSongId={currentSongId} onSelectSong={handleSelect} />

                {folderList.map((folder) => (
                  <FolderSection
                    key={folder.id}
                    folder={folder}
                    songs={folderSongs.get(folder.id) ?? []}
                    currentSongId={currentSongId}
                    folders={folderList}
                    onSelectSong={handleSelect}
                    onDeleteSong={handleDelete}
                    onMoveSong={handleMove}
                    onDropSong={handleDropSong}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                    playlistIds={playlistIds}
                    onTogglePlaylist={handleTogglePlaylist}
                  />
                ))}

                {/* Uncategorized drop zone — always rendered when folders exist so
                    onDragEnter can fire even when the section is empty */}
                {hasFolders && (
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault()
                      unfolderDragCounterRef.current++
                      setUnfolderDragOver(true)
                    }}
                    onDragLeave={() => {
                      unfolderDragCounterRef.current--
                      if (unfolderDragCounterRef.current === 0) setUnfolderDragOver(false)
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={(e) => {
                      e.preventDefault()
                      unfolderDragCounterRef.current = 0
                      setUnfolderDragOver(false)
                      const songId = parseInt(e.dataTransfer.getData('text/plain'), 10)
                      if (!isNaN(songId)) handleDropSong(songId, null)
                    }}
                    style={{
                      borderRadius: '8px',
                      outline: unfolderDragOver ? '2px dashed var(--lb-accent)' : '2px solid transparent',
                      background: unfolderDragOver ? 'rgba(124, 106, 239, 0.08)' : 'transparent',
                      transition: 'outline 0.1s, background 0.1s',
                      minHeight: unfolderSongs.length === 0 ? '40px' : undefined,
                    }}
                  >
                    <div
                      className="text-lb-text-secondary"
                      style={{ fontSize: '11px', fontWeight: 600, padding: '8px 8px 4px', letterSpacing: '0.05em' }}
                    >
                      未分類
                    </div>

                    {unfolderSongs.map((song) => (
                      <SongListItem
                        key={song.id}
                        song={song}
                        isActive={currentSongId === song.id}
                        folders={folderList}
                        onSelect={handleSelect}
                        onDelete={handleDelete}
                        onMove={handleMove}
                        inPlaylist={playlistIds.has(song.id)}
                        onTogglePlaylist={handleTogglePlaylist}
                      />
                    ))}

                    {unfolderSongs.length === 0 && unfolderDragOver && (
                      <p className="text-lb-text-secondary" style={{ fontSize: '11px', padding: '2px 12px 8px', fontStyle: 'italic' }}>
                        放開以移出資料夾
                      </p>
                    )}
                  </div>
                )}

                {!hasFolders && unfolderSongs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    isActive={currentSongId === song.id}
                    folders={folderList}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    inPlaylist={playlistIds.has(song.id)}
                    onTogglePlaylist={handleTogglePlaylist}
                  />
                ))}

                {folderList.length === 0 && unfolderSongs.length === 0 && (
                  <p className="text-lb-text-secondary" style={{ fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                    尚無歌曲
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
