import { useRef } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatBytes } from '@/lib/audio-file-store'
import type { AudioSource } from '@/types'

const inputStyle: React.CSSProperties = {
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
}

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--lb-accent)'
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--lb-accent-glow)'
}

function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--lb-border)'
  e.currentTarget.style.boxShadow = 'none'
}

interface AudioSourceTabsProps {
  audioSource: AudioSource
  onAudioSourceChange: (source: AudioSource) => void
  youtubeUrl: string
  onYoutubeUrlChange: (url: string) => void
  audioFileName: string
  onAudioFileChange: (file: File, fileName: string) => void
  /** Whether to keep the picked file in the browser's storage. */
  persistAudio: boolean
  onPersistAudioChange: (persist: boolean) => void
  /** Size of the file that would be stored (newly picked or already stored). */
  storedSize: number | null
  /** True when a copy is already stored for this song. */
  alreadyStored: boolean
}

export function AudioSourceTabs({
  audioSource,
  onAudioSourceChange,
  youtubeUrl,
  onYoutubeUrlChange,
  audioFileName,
  onAudioFileChange,
  persistAudio,
  onPersistAudioChange,
  storedSize,
  alreadyStored,
}: AudioSourceTabsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onAudioFileChange(file, file.name)
  }

  return (
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
        伴奏來源
      </label>
      <Tabs
        value={audioSource}
        onValueChange={(v) => onAudioSourceChange(v as AudioSource)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="youtube" className="flex-1">
            YouTube
          </TabsTrigger>
          <TabsTrigger value="local" className="flex-1">
            本地音檔
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youtube">
          <input
            type="text"
            placeholder="貼上 YouTube 連結或影片 ID"
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            style={inputStyle}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </TabsContent>

        <TabsContent value="local">
          <div className="flex" style={{ gap: '8px' }}>
            <input
              type="text"
              placeholder="點擊選擇音檔"
              value={audioFileName}
              readOnly
              onClick={() => fileInputRef.current?.click()}
              style={{ ...inputStyle, cursor: 'pointer', flex: 1 }}
              onFocus={focusInput}
              onBlur={blurInput}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid var(--lb-border)',
                background: 'var(--lb-bg-input)',
                color: 'var(--lb-text-primary)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              選擇
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <label
            className="flex items-start text-lb-text-secondary cursor-pointer"
            style={{ gap: '8px', marginTop: '10px', fontSize: '12px', lineHeight: 1.5 }}
          >
            <input
              type="checkbox"
              checked={persistAudio}
              onChange={(e) => onPersistAudioChange(e.target.checked)}
              style={{ marginTop: '3px', accentColor: 'var(--lb-accent)' }}
            />
            <span>
              將音檔儲存在瀏覽器中，下次載入不必重新選取
              <span className="block text-lb-text-dim" style={{ fontSize: '11px' }}>
                會佔用瀏覽器儲存空間
                {storedSize !== null && `（${formatBytes(storedSize)}）`}
                {alreadyStored && !persistAudio && '，取消勾選並儲存後將刪除已存的音檔'}
              </span>
            </span>
          </label>
        </TabsContent>
      </Tabs>
    </div>
  )
}
