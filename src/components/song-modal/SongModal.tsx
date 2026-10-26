import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { AudioSourceTabs } from './AudioSourceTabs'
import { LrcInputTabs } from './LrcInputTabs'
import { saveSongToDB } from '@/hooks/useSongLibrary'
import { track } from '@/lib/analytics'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { extractVideoId } from '@/lib/format'
import { saveAudioFile, getAudioFile, deleteAudioFile } from '@/lib/audio-file-store'
import type { Song, AudioSource } from '@/types'
import type { PlaybackEngine } from './LrcTimingTab'

interface SongModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editSong?: Song | null
  /** Playback engine, used by the 打軸 (timing) mode of the LRC editor. */
  engine?: PlaybackEngine
}

export function SongModal({ open, onOpenChange, editSong, engine }: SongModalProps) {
  const [name, setName] = useState('')
  const [audioSource, setAudioSource] = useState<AudioSource>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [audioFileName, setAudioFileName] = useState('')
  const [lrcText, setLrcText] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [persistAudio, setPersistAudio] = useState(true)
  const [lrcError, setLrcError] = useState<string | null>(null)
  // Size of the copy already stored for the song being edited (null = none)
  const [storedAudioSize, setStoredAudioSize] = useState<number | null>(null)

  const isEditMode = !!editSong
  const loadSong = useSongStore((s) => s.loadSong)
  const currentSongId = useSongStore((s) => s.currentSongId)
  // Timing stamps read the player's clock, so the edited song must be the loaded one
  const canStamp = !!editSong && editSong.id === currentSongId

  useEffect(() => {
    if (!open) return
    setPersistAudio(useUISettingsStore.getState().persistLocalAudio)
    setStoredAudioSize(null)
    setLrcError(null)
    if (editSong) {
      setName(editSong.name)
      setAudioSource(editSong.audioSource)
      setYoutubeUrl(editSong.youtubeId || '')
      setAudioFileName(editSong.audioFileName || '')
      setLrcText(editSong.lrcText)
      setAudioFile(null)
    } else {
      setName('')
      setAudioSource('youtube')
      setYoutubeUrl('')
      setAudioFileName('')
      setLrcText('')
      setAudioFile(null)
    }
  }, [open, editSong])

  // Look up whether the edited song already has a stored audio copy
  useEffect(() => {
    if (!open || !editSong) return
    let cancelled = false
    getAudioFile(editSong.id).then((record) => {
      if (cancelled || !record) return
      setStoredAudioSize(record.size)
      setPersistAudio(true)
    })
    return () => { cancelled = true }
  }, [open, editSong])

  async function handleSave() {
    if (!lrcText.trim()) {
      setLrcError('請填入 LRC 歌詞，或用「線上搜尋」／「讀取檔案」帶入。')
      return
    }
    setLrcError(null)

    const songName = name.trim() || '未命名歌曲'
    const isYoutube = audioSource === 'youtube'
    const now = Date.now()

    const song: Song = {
      id: isEditMode ? editSong!.id : now,
      name: songName,
      lrcText: lrcText.trim(),
      offset: isEditMode ? editSong!.offset : 0,
      pitch: isEditMode ? editSong!.pitch : 0,
      audioSource,
      youtubeId: isYoutube ? extractVideoId(youtubeUrl) : null,
      audioFileName: isYoutube ? null : audioFileName || null,
      folderId: isEditMode ? editSong!.folderId : null,
      createdAt: isEditMode ? editSong!.createdAt : now,
      updatedAt: now,
    }

    await saveSongToDB(song)
    track(isEditMode ? 'song_edit' : 'song_create', {
      source: audioSource,
      has_lrc: song.lrcText.length > 0,
      title: song.name,
      youtube_id: song.youtubeId ?? '',
    })

    // Keep or drop the browser-stored copy of the local audio file
    if (audioSource === 'local') {
      if (audioFile && persistAudio) {
        await saveAudioFile(song.id, audioFile)
      } else if (!persistAudio && storedAudioSize !== null) {
        await deleteAudioFile(song.id)
      }
    } else if (storedAudioSize !== null) {
      await deleteAudioFile(song.id)
    }

    loadSong(song)

    // If local audio, create object URL for playback
    if (audioSource === 'local' && audioFile) {
      const objectUrl = URL.createObjectURL(audioFile)
      usePlaybackStore.getState().setAudioFileObjectUrl(objectUrl)
    }

    onOpenChange(false)
  }

  function handleAudioFileChange(file: File, fileName: string) {
    setAudioFile(file)
    setAudioFileName(fileName)
  }

  function handlePersistAudioChange(persist: boolean) {
    setPersistAudio(persist)
    useUISettingsStore.getState().setPersistLocalAudio(persist)
  }

  function handleSearchSelect(text: string, trackName: string) {
    setLrcText(text)
    if (!name.trim()) {
      setName(trackName)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[80dvh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEditMode ? '編輯歌曲' : '新增歌曲'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? '編輯歌曲資訊' : '新增一首新歌曲'}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div
          className="flex flex-col overflow-y-auto min-h-0 flex-1"
          style={{ padding: '20px', gap: '16px' }}
        >
          {/* Song name */}
          <div className="flex flex-col" style={{ gap: '6px' }}>
            <label
              className="text-lb-text-dim"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              歌曲名稱
            </label>
            <input
              type="text"
              placeholder="輸入歌曲名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                background: 'var(--lb-bg-input)',
                border: '1px solid var(--lb-border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--lb-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s',
                width: '100%',
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
          </div>

          {/* Audio source */}
          <AudioSourceTabs
            audioSource={audioSource}
            onAudioSourceChange={setAudioSource}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={setYoutubeUrl}
            audioFileName={audioFileName}
            onAudioFileChange={handleAudioFileChange}
            persistAudio={persistAudio}
            onPersistAudioChange={handlePersistAudioChange}
            storedSize={audioFile ? audioFile.size : storedAudioSize}
            alreadyStored={storedAudioSize !== null}
          />

          {/* LRC input */}
          <LrcInputTabs
            lrcText={lrcText}
            onLrcTextChange={(text) => {
              setLrcText(text)
              if (text.trim()) setLrcError(null)
            }}
            onSearchSelect={handleSearchSelect}
            engine={engine}
            canStamp={canStamp}
          />
          {lrcError && (
            <p role="alert" className="text-lb-danger" style={{ fontSize: '12px', marginTop: '-8px', lineHeight: 1.5 }}>
              {lrcError}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--lb-border)',
              background: 'var(--lb-bg-input)',
              color: 'var(--lb-text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--lb-accent)',
              background: 'var(--lb-accent)',
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            儲存並載入
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
