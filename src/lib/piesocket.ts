const PIESOCKET_API_KEY = import.meta.env.VITE_PIESOCKET_API_KEY ?? ''
const PIESOCKET_CLUSTER_ID = import.meta.env.VITE_PIESOCKET_CLUSTER_ID ?? 'demo'

export function getSessionId(): string {
  let id = localStorage.getItem('lb-session-id')
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)
    localStorage.setItem('lb-session-id', id)
  }
  return id
}

export function getChannelName(): string {
  return `lyribox-${getSessionId()}`
}

/**
 * Run `onReopen` each time the channel's WebSocket reconnects (not on the initial open,
 * which has already happened once `subscribe()` resolves). piesocket-js 5.x never emits
 * an 'open' event, but it re-reads `channel.onOpen` on every reconnect, so an instance
 * override is the only reliable hook. Shared by the app and `public/obs.html`.
 */
export function observeReconnects(channel: PieSocketChannel, onReopen: () => void): void {
  const original = channel.onOpen.bind(channel)
  channel.onOpen = (event: unknown) => {
    original(event)
    onReopen()
  }
}

export function getOBSUrl(): string {
  const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/')
  return `${base}obs.html?s=${getSessionId()}`
}

export { PIESOCKET_API_KEY, PIESOCKET_CLUSTER_ID }
