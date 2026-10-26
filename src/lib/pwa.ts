import { registerSW } from 'virtual:pwa-register'
import { toast } from '@/stores/useToastStore'

/**
 * Register the service worker (production only). A new version is never
 * applied automatically — a reload mid-song would be disruptive — so the
 * user gets a toast with a 「重新載入」 action instead.
 */
export function registerPWA(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    onNeedRefresh() {
      toast('有新版本可用', {
        actionLabel: '重新載入',
        duration: 15000,
        onAction: () => {
          void updateSW(true)
        },
      })
    },
    onRegisterError(error) {
      console.warn('[pwa] service worker registration failed', error)
    },
  })
}
