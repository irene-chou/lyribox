interface PieSocketChannel {
  listen(event: string, callback: (data: unknown) => void): void
  publish(event: string, data: unknown): void
  /** Connection lifecycle hooks ('close' | 'error'); 'open' is NOT emitted by piesocket-js 5.x. */
  on(event: 'close' | 'error', callback: (event: unknown) => void): void
  /** Internal: invoked by every (re)opened WebSocket; patchable per instance to observe reconnects. */
  onOpen(event: unknown): void
  /** Internal: false once the server rejected the channel (library will not reconnect). */
  shouldReconnect: boolean
}

interface PieSocketOptions {
  clusterId: string
  apiKey: string
  notifySelf?: number
}

declare class PieSocketClass {
  constructor(options: PieSocketOptions)
  subscribe(channel: string): Promise<PieSocketChannel>
  unsubscribe(channel: string): void
}

interface PieSocketModule {
  default: new (options: PieSocketOptions) => PieSocketClass
}

interface Window {
  PieSocket: PieSocketModule
}
