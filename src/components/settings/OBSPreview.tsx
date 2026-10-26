import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { subscribePreview } from '@/lib/obs-preview-bridge'
import { buildFullState } from '@/lib/obs-state'

/** Virtual viewport the preview emulates (recommended OBS browser-source size). */
const PREVIEW_WIDTH = 1920
const PREVIEW_HEIGHT = 1080

const PREVIEW_URL = `${import.meta.env.BASE_URL}obs.html?preview=1`

/** Dark checkerboard so a transparent lyrics background is visible. */
const backdropStyle: React.CSSProperties = {
  backgroundColor: '#1a1a24',
  backgroundImage:
    'repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, transparent 0% 50%)',
  backgroundSize: '24px 24px',
}

/**
 * Embedded `obs.html` in preview mode: no PieSocket, the page is fed the same
 * SyncMessages through postMessage (see lib/obs-preview-bridge.ts). Works even
 * before the user has ever copied the OBS URL.
 */
export function OBSPreview() {
  const open = useUISettingsStore((s) => s.obsPreviewOpen)
  const setOpen = useUISettingsStore((s) => s.setObsPreviewOpen)

  return (
    <section
      className="flex flex-col border border-lb-border"
      style={{ borderRadius: 'var(--lb-radius)', padding: open ? '16px' : '10px 16px', gap: '10px' }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="obs-preview-body"
        className="flex items-center flex-1 min-w-0 text-left text-lb-text-dim hover:text-lb-text-secondary transition-colors cursor-pointer"
        style={{ gap: '8px', border: 'none', background: 'none', padding: 0, minHeight: '28px' }}
      >
        <ChevronRight
          size={14}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
        />
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          OBS 預覽
        </span>
        {!open && (
          <span className="truncate" style={{ fontSize: '11px' }}>
            即時預覽投影畫面
          </span>
        )}
      </button>

      {open && (
        <div id="obs-preview-body" className="flex flex-col" style={{ gap: '6px' }}>
          <PreviewFrame />
          <p className="text-lb-text-dim" style={{ fontSize: '11px', lineHeight: 1.5 }}>
            以 1920×1080 瀏覽器來源縮放顯示，與 OBS 實際畫面一致。
          </p>
        </div>
      )}
    </section>
  )
}

function PreviewFrame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(0)

  // Fit the 1920-wide virtual viewport into the sidebar
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / PREVIEW_WIDTH)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Forward every outgoing SyncMessage to the iframe; answer its REQUEST_STATE
  useEffect(() => {
    const post = (msg: unknown) => {
      iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin)
    }

    const unsub = subscribePreview(post)

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data as { type?: unknown } | null
      if (data && data.type === 'REQUEST_STATE') {
        post({ type: 'FULL_STATE', data: buildFullState() })
      }
    }
    window.addEventListener('message', onMessage)

    return () => {
      unsub()
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden border border-lb-border"
      style={{ ...backdropStyle, aspectRatio: `${PREVIEW_WIDTH} / ${PREVIEW_HEIGHT}`, borderRadius: '6px' }}
    >
      {scale > 0 && (
        <iframe
          ref={iframeRef}
          src={PREVIEW_URL}
          title="OBS 預覽"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            background: 'transparent',
          }}
        />
      )}
    </div>
  )
}
