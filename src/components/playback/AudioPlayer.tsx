import { useEffect, useRef, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { useLocalAudioRestore } from '@/hooks/useLocalAudioRestore'
import { saveAudioFile } from '@/lib/audio-file-store'
import { YouTubePlayer } from './YouTubePlayer'
import { ManualTimerPanel } from './ManualTimerPanel'
import { PlaybackInfo } from './PlaybackInfo'
import { VolumeControl } from './VolumeControl'
import type { usePlaybackEngine } from '@/hooks/usePlaybackEngine'

interface AudioPlayerProps {
  engine: ReturnType<typeof usePlaybackEngine>
  onSeek: (time: number) => void
}

export function AudioPlayer({ engine, onSeek }: AudioPlayerProps) {
  const audioSource = useSongStore((s) => s.audioSource)
  const audioFileName = useSongStore((s) => s.audioFileName)
  const youtubeId = useSongStore((s) => s.youtubeId)
  const lyrics = useSongStore((s) => s.lyrics)
  const audioFileObjectUrl = usePlaybackStore((s) => s.audioFileObjectUrl)
  const status = usePlaybackStore((s) => s.status)
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

  const isPlaying = status === 'PLAYING'
  const hasLyrics = lyrics.length > 0

  // Determine if there's an actual audio source available
  const hasAudio =
    (audioSource === 'youtube' && !!youtubeId) ||
    (audioSource === 'local' && !!audioFileObjectUrl)

  // Show manual timer when there are lyrics but no audio
  const showManualTimer = hasLyrics && !hasAudio

  // Local audio — no file loaded yet: show prompt without player container
  if (audioSource === 'local' && !audioFileObjectUrl && !showManualTimer) {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="flex flex-col" style={{ gap: '8px' }}>
          <p
            className="text-lb-text-secondary"
            style={{ fontSize: '12px' }}
          >
            {audioFileName
              ? `上次使用：${audioFileName}`
              : '請選擇音檔以開始播放'}
          </p>
          <button
            className="border border-lb-accent bg-lb-accent text-white hover:bg-[#6b59de] hover:shadow-[0_4px_16px_var(--lb-accent-glow)] transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              fontFamily: 'var(--font-sans)',
              alignSelf: 'flex-start',
            }}
          >
            選擇音檔
          </button>
        </div>
      </div>
    )
  }

  // Manual timer fallback — lyrics loaded but no audio
  if (showManualTimer) {
    return (
      <div
        className="flex flex-col bg-lb-bg-input rounded-lg"
        style={{ gap: '6px', padding: '10px 12px' }}
      >
        <ManualTimerPanel engine={engine} />
      </div>
    )
  }

  // YouTube embed mode — iframe only, no extra container
  if (audioSource === 'youtube') {
    return <YouTubePlayer engine={engine} />
  }

  // Local audio — file loaded
  return (
    <div
      className="flex flex-col bg-lb-bg-input rounded-lg"
      style={{ gap: '6px', padding: '10px 12px' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <PlaybackInfo onSeek={onSeek} />
      <div className="flex items-center justify-between" style={{ gap: '6px' }}>
        <button
          className="flex items-center justify-center border border-lb-accent bg-lb-accent text-white hover:bg-[#6b59de] hover:shadow-[0_4px_16px_var(--lb-accent-glow)] transition-all cursor-pointer"
          onClick={() => engine.togglePlay()}
          style={{
            width: '26px',
            height: '26px',
            padding: 0,
            borderRadius: '50%',
            flexShrink: 0,
          }}
          title={isPlaying ? '暫停' : '播放'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
        </button>
        <VolumeControl />
      </div>
    </div>
  )
}
