import { useEffect, useRef, useCallback } from 'react'
import { FileAudio, Timer } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useLocalAudioRestore } from '@/hooks/useLocalAudioRestore'
import { saveAudioFile } from '@/lib/audio-file-store'
import { YouTubePlayer } from './YouTubePlayer'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

interface AudioPlayerProps {
  engine: ReturnType<typeof usePlaybackEngine>
}

/**
 * Audio-source panel in the sidebar: the YouTube iframe, the local file
 * picker, or a manual-timer hint. Transport controls live in `TransportBar`.
 */
export function AudioPlayer({ engine }: AudioPlayerProps) {
  const audioSource = useSongStore((s) => s.audioSource)
  const audioFileName = useSongStore((s) => s.audioFileName)
  const youtubeId = useSongStore((s) => s.youtubeId)
  const lyrics = useSongStore((s) => s.lyrics)
  const audioFileObjectUrl = usePlaybackStore((s) => s.audioFileObjectUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Restore a stored local file for the current song, if any
  useLocalAudioRestore()

  // Load local audio file when URL changes
  useEffect(() => {
    if (audioSource === 'local' && audioFileObjectUrl) {
      engine.localAudio.loadFile(audioFileObjectUrl)
    }
  }, [audioFileObjectUrl, audioSource, engine.localAudio])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    usePlaybackStore.getState().setAudioFileObjectUrl(objectUrl)
    if (file.name !== audioFileName) {
      useSongStore.getState().setAudioFileName(file.name)
    }
    const songId = useSongStore.getState().currentSongId
    if (songId !== null && useUISettingsStore.getState().persistLocalAudio) {
      void saveAudioFile(songId, file)
    }
    e.target.value = ''
  }, [audioFileName])

  const hasLyrics = lyrics.length > 0
  const hasAudio =
    (audioSource === 'youtube' && !!youtubeId) ||
    (audioSource === 'local' && !!audioFileObjectUrl)

  if (audioSource === 'youtube') {
    if (youtubeId) return <YouTubePlayer engine={engine} />
    return (
      <Hint icon={<Timer size={14} />}>
        {hasLyrics ? '未設定 YouTube 影片，使用手動計時器同步歌詞。' : '未設定 YouTube 影片。'}
      </Hint>
    )
  }

  // Local audio
  const fileInput = (
    <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
  )

  if (!hasAudio) {
    return (
      <div className="flex flex-col" style={{ gap: '8px' }}>
        {fileInput}
        <Hint icon={<Timer size={14} />}>
          {audioFileName ? `上次使用：${audioFileName}` : '尚未選擇音檔'}
          {hasLyrics && '，目前以手動計時器同步。'}
        </Hint>
        <button
          className="bg-lb-accent text-white hover:bg-[#6b59de] hover:shadow-[0_4px_16px_var(--lb-accent-glow)] transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          style={{
            height: '32px',
            padding: '0 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            alignSelf: 'flex-start',
          }}
        >
          選擇音檔
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center bg-lb-bg-input rounded-lg"
      style={{ gap: '8px', padding: '8px 10px' }}
    >
      {fileInput}
      <FileAudio size={14} className="shrink-0 text-lb-text-secondary" />
      <span
        className="flex-1 min-w-0 truncate text-lb-text-primary"
        style={{ fontSize: '12px' }}
        title={audioFileName ?? undefined}
      >
        {audioFileName ?? '本地音檔'}
      </span>
      <button
        className="shrink-0 text-lb-text-secondary hover:text-lb-text-primary hover:bg-lb-bg-card transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        style={{
          height: '26px',
          padding: '0 8px',
          fontSize: '11px',
          fontWeight: 600,
          borderRadius: '4px',
          border: '1px solid var(--lb-border)',
          background: 'none',
          fontFamily: 'var(--font-sans)',
        }}
      >
        更換
      </button>
    </div>
  )
}

function Hint({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-start text-lb-text-secondary" style={{ gap: '6px', fontSize: '12px', lineHeight: 1.5 }}>
      <span className="shrink-0" style={{ marginTop: '2px' }}>{icon}</span>
      <span>{children}</span>
    </p>
  )
}
