import type { SyncMessageType } from '@/types'

/** Wire-shaped sync message as sent over PieSocket / postMessage. */
export interface BridgeMessage {
  type: SyncMessageType
  data: Record<string, unknown> | null
}

type Listener = (msg: BridgeMessage) => void

const listeners = new Set<Listener>()

/**
 * Tiny in-page pub/sub mirroring every outgoing `SyncMessage` to local subscribers
 * (the embedded OBS preview). Independent of PieSocket, so the preview works even
 * before the user has ever copied the OBS URL (`obsSyncEnabled` false).
 */
export function publishToPreview(type: SyncMessageType, data: Record<string, unknown> | null): void {
  if (listeners.size === 0) return
  const msg: BridgeMessage = { type, data }
  listeners.forEach((l) => l(msg))
}

export function subscribePreview(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test helper / reset. */
export function _resetPreviewBridge(): void {
  listeners.clear()
}
