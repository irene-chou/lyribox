import { useState, useMemo, useRef, useCallback } from 'react'
import { X, FolderPlus } from 'lucide-react'
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
import {
  useSongs,
  useFolders,
  useStoredAudioSongIds,
  deleteSongFromDB,
  createFolder,
  updateFolder,
  deleteFolder,
  moveSongToFolder,
} from '@/hooks/useSongLibrary'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { saveAudioFile } from '@/lib/audio-file-store'
import type { Song, Folder } from '@/types'

interface SongDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile?: boolean
}

export function SongDrawer({ open, onOpenChange, isMobile }: SongDrawerProps) {
  const [search, setSearch] = useState('')
  const songs = useSongs()
  const folders = useFolders()
  const storedAudioIds = useStoredAudioSongIds()
  const { currentSongId, loadSong } = useSongStore()
  const localFileInputRef = useRef<HTMLInputElement>(null)
  const pendingSongRef = useRef<Song | null>(null)

  // Uncategorized section drag-over state
  const [unfolderDragOver, setUnfolderDragOver] = useState(false)
  const unfolderDragCounterRef = useRef(0)

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
    loadSong(song)
    // Stored audio is restored automatically (useLocalAudioRestore); only ask
    // for a file when nothing is stored for this song.
    if (song.audioSource === 'local' && !storedAudioIds?.has(song.id)) {
      pendingSongRef.current = song
      localFileInputRef.current?.click()
    }
    onOpenChange(false)
  }, [loadSong, onOpenChange, storedAudioIds])

  function handleLocalFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const song = pendingSongRef.current
    pendingSongRef.current = null
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    usePlaybackStore.getState().setAudioFileObjectUrl(objectUrl)
    if (song && file.name !== song.audioFileName) {
      useSongStore.getState().setAudioFileName(file.name)
    }
    if (song && useUISettingsStore.getState().persistLocalAudio) {
      void saveAudioFile(song.id, file)
    }
    e.target.value = ''
  }

  const handleDelete = useCallback(async (song: Song) => {
    const confirmed = confirm(`確定要刪除「${song.name}」嗎？`)
    if (!confirmed) return
    await deleteSongFromDB(song.id)
    if (useSongStore.getState().currentSongId === song.id) {
      useSongStore.getState().clearSong()
    }
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
    const name = prompt('資料夾名稱：')
    if (!name?.trim()) return
    await createFolder(name.trim())
  }, [])

  const handleRenameFolder = useCallback(async (folder: Folder, newName: string) => {
    await updateFolder(folder.id, newName)
  }, [])

  const handleDeleteFolder = useCallback(async (folder: Folder) => {
    const confirmed = confirm(`確定要刪除資料夾「${folder.name}」嗎？\n資料夾內的歌曲將移至未分類。`)
    if (!confirmed) return
    await deleteFolder(folder.id)
    const state = useSongStore.getState()
    if (state.folderId === folder.id) {
      state.setFolderId(null)
    }
  }, [])

  const folderList = folders ?? []
  const isLoading = !songs
  const hasFolders = folderList.length > 0

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <input
        ref={localFileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleLocalFileSelect}
        style={{ display: 'none' }}
      />
      <DrawerContent
        className="h-full bg-lb-bg-secondary border-l border-lb-border"
        style={{ width: isMobile ? '100vw' : '380px' }}
      >
        {/* Header */}
        <DrawerHeader
          className="flex-row items-center justify-between shrink-0 border-b border-lb-border"
          style={{ padding: isMobile ? '16px' : '20px 24px' }}
        >
          <div>
            <DrawerTitle
              className="text-lb-text-primary"
              style={{ fontSize: '14px', fontWeight: 600 }}
            >
              歌曲庫
            </DrawerTitle>
            <DrawerDescription className="sr-only">管理你的歌曲</DrawerDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center transition-colors cursor-pointer text-lb-text-secondary hover:text-lb-text-primary hover:bg-lb-bg-input"
            style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderRadius: '6px', background: 'none' }}
            title="關閉"
          >
            <X size={16} />
          </button>
        </DrawerHeader>

        {/* Body */}
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ padding: isMobile ? '12px 16px' : '16px 24px', gap: '12px' }}
        >
          <div className="flex items-center" style={{ gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SongSearchInput value={search} onChange={setSearch} />
            </div>
            <button
              onClick={handleCreateFolder}
              className="flex items-center justify-center transition-colors cursor-pointer text-lb-text-secondary hover:text-lb-text-primary hover:bg-lb-bg-input"
              style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '6px', background: 'none', flexShrink: 0 }}
              title="新增資料夾"
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
                filteredSongs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    isActive={currentSongId === song.id}
                    folders={folderList}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onMove={handleMove}
                  />
                ))
              )
            ) : (
              // Grouped view
              <>
                {/* Folders */}
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
                      // Ensure minimum tappable height even when empty
                      minHeight: unfolderSongs.length === 0 ? '40px' : undefined,
                    }}
                  >
                    {/* Section label */}
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
                      />
                    ))}

                    {/* Drop hint shown only while dragging over empty section */}
                    {unfolderSongs.length === 0 && unfolderDragOver && (
                      <p className="text-lb-text-secondary" style={{ fontSize: '11px', padding: '2px 12px 8px', fontStyle: 'italic' }}>
                        放開以移出資料夾
                      </p>
                    )}
                  </div>
                )}

                {/* When no folders: plain uncategorized list */}
                {!hasFolders && unfolderSongs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    isActive={currentSongId === song.id}
                    folders={folderList}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onMove={handleMove}
                  />
                ))}

                {/* Empty state */}
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
