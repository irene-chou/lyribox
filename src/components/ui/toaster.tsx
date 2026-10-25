import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'

/** Bottom-centre toast stack. Mount once in App. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 flex flex-col items-center"
      style={{ top: '64px', gap: '8px', zIndex: 80, padding: '0 16px' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-center bg-lb-bg-card border border-lb-border text-lb-text-primary"
          style={{
            gap: '10px',
            padding: '10px 12px 10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            maxWidth: '420px',
            width: '100%',
            animation: 'lb-toast-in 0.2s ease-out',
          }}
        >
          {t.variant === 'success' && <CheckCircle2 size={16} className="shrink-0 text-lb-success" />}
          {t.variant === 'error' && <AlertCircle size={16} className="shrink-0 text-lb-danger" />}
          <span className="flex-1 min-w-0" style={{ lineHeight: 1.4 }}>
            {t.message}
          </span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.()
                dismiss(t.id)
              }}
              className="shrink-0 text-lb-accent hover:bg-lb-bg-input transition-colors cursor-pointer"
              style={{
                border: 'none',
                background: 'none',
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: '6px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="flex items-center justify-center shrink-0 text-lb-text-secondary hover:text-lb-text-primary hover:bg-lb-bg-input transition-colors cursor-pointer"
            style={{ width: '28px', height: '28px', border: 'none', background: 'none', borderRadius: '6px', padding: 0 }}
            title="關閉"
            aria-label="關閉通知"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
