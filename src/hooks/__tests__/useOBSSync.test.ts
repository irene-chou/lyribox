import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOBSSync } from '../useOBSSync'
import { useSongStore } from '@/stores/useSongStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { DEFAULT_UI_SETTINGS } from '@/lib/constants'

type SyncListener = (raw: unknown) => void

function makeChannel() {
  const listeners: Record<string, SyncListener> = {}
  return {
    listeners,
    publish: vi.fn(),
    listen: vi.fn((event: string, cb: SyncListener) => {
      listeners[event] = cb
    }),
    onOpen: vi.fn(),
    shouldReconnect: true,
  }
}

const w = window as unknown as { PieSocket?: unknown }
let channel: ReturnType<typeof makeChannel>
const subscribe = vi.fn()
const unsubscribe = vi.fn()
const ctor = vi.fn()

class FakePieSocket {
  constructor(opts: unknown) {
    ctor(opts)
  }
  subscribe = subscribe
  unsubscribe = unsubscribe
}

const song = {
  id: 1,
  name: 'OBS',
  lrcText: '[00:01.00]a\n[00:02.00]b',
  offset: 0.2,
  pitch: 0,
  vocalRemoval: false,
  audioSource: 'youtube' as const,
  youtubeId: null,
  audioFileName: null,
  folderId: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  localStorage.setItem('lb-session-id', 'sess')
  channel = makeChannel()
  subscribe.mockReset().mockImplementation(() => Promise.resolve(channel))
  unsubscribe.mockReset()
  ctor.mockReset()
  w.PieSocket = { default: FakePieSocket }
  useSongStore.getState().clearSong()
  useSyncStore.getState().reset()
  useUISettingsStore.setState({ ...DEFAULT_UI_SETTINGS, obsSyncEnabled: true })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  delete w.PieSocket
})

async function mountConnected() {
  const hook = renderHook(() => useOBSSync())
  await act(async () => {
    await Promise.resolve()
  })
  return hook
}

function fullStateCalls() {
  return channel.publish.mock.calls.filter((c) => (c[1] as { type: string }).type === 'FULL_STATE')
}

describe('useOBSSync – lazy connect', () => {
  it('opens no connection until OBS sync has been enabled', () => {
    useUISettingsStore.setState({ obsSyncEnabled: false })
    const { result } = renderHook(() => useOBSSync())
    expect(ctor).not.toHaveBeenCalled()
    expect(result.current.isConnected).toBe(false)
    expect(result.current.sessionId).toBe('sess')
    // broadcast is a safe no-op without a channel
    expect(() => result.current.broadcast('OFFSET', { offset: 1 })).not.toThrow()
  })

  it('connects once enabled and disconnects when disabled again', async () => {
    useUISettingsStore.setState({ obsSyncEnabled: false })
    const { result } = renderHook(() => useOBSSync())
    await act(async () => {
      useUISettingsStore.getState().setObsSyncEnabled(true)
      await Promise.resolve()
    })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(true)

    await act(async () => {
      useUISettingsStore.getState().setObsSyncEnabled(false)
    })
    expect(unsubscribe).toHaveBeenCalledWith('lyribox-sess')
    expect(result.current.isConnected).toBe(false)
  })

  it('warns and stays disconnected when the PieSocket script is missing', () => {
    delete w.PieSocket
    const { result } = renderHook(() => useOBSSync())
    expect(console.warn).toHaveBeenCalledWith('PieSocket not loaded. OBS sync disabled.')
    expect(result.current.isConnected).toBe(false)
  })
})

describe('useOBSSync – connected', () => {
  it('subscribes to the session channel without self-notification', async () => {
    const { result } = await mountConnected()
    expect(ctor).toHaveBeenCalledWith(expect.objectContaining({ notifySelf: 0 }))
    expect(subscribe).toHaveBeenCalledWith('lyribox-sess')
    expect(result.current.isConnected).toBe(true)
    expect(channel.listen).toHaveBeenCalledWith('sync', expect.any(Function))
  })

  it('pushes the full state right after connecting', async () => {
    useSongStore.getState().loadSong(song)
    useSyncStore.getState().setCurrentLineIndex(1)
    useUISettingsStore.getState().setActiveFontSize(44)
    await mountConnected()

    expect(fullStateCalls()).toHaveLength(1)
    expect(channel.publish).toHaveBeenCalledWith('sync', {
      type: 'FULL_STATE',
      data: expect.objectContaining({
        lyrics: [
          { time: 1, text: 'a' },
          { time: 2, text: 'b' },
        ],
        currentLineIndex: 1,
        offset: 0.2,
        songTitle: 'OBS',
        activeFontSize: 44,
        otherFontSize: DEFAULT_UI_SETTINGS.otherFontSize,
        passedColor: DEFAULT_UI_SETTINGS.passedColor,
        visibleBefore: DEFAULT_UI_SETTINGS.visibleBefore,
        showTitle: DEFAULT_UI_SETTINGS.showTitle,
      }),
    })
  })

  it('broadcast publishes typed messages on the sync event', async () => {
    const { result } = await mountConnected()
    result.current.broadcast('OFFSET', { offset: 0.5 })
    expect(channel.publish).toHaveBeenLastCalledWith('sync', { type: 'OFFSET', data: { offset: 0.5 } })
  })

  it('answers REQUEST_STATE with the full state and ignores malformed messages', async () => {
    await mountConnected()
    const listener = channel.listeners.sync
    expect(fullStateCalls()).toHaveLength(1)

    listener({ type: 'REQUEST_STATE' })
    expect(fullStateCalls()).toHaveLength(2)

    listener('garbage')
    listener({ type: 'NOT_A_TYPE', data: {} })
    listener({ type: 'FULL_STATE', data: 'not-an-object' })
    listener({ type: 'SYNC_UPDATE', data: { currentLineIndex: 1 } }) // valid but not a request
    expect(fullStateCalls()).toHaveLength(2)
    expect(console.warn).toHaveBeenCalledTimes(3)
  })

  it('re-sends the full state when the socket reconnects', async () => {
    await mountConnected()
    expect(fullStateCalls()).toHaveLength(1)
    channel.onOpen('reopen')
    expect(fullStateCalls()).toHaveLength(2)
  })

  it('re-sends the full state when the tab becomes visible', async () => {
    await mountConnected()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fullStateCalls()).toHaveLength(2)

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fullStateCalls()).toHaveLength(2)
  })

  it('swallows publish errors so the UI never breaks', async () => {
    const { result } = await mountConnected()
    channel.publish.mockImplementation(() => {
      throw new Error('socket closed')
    })
    expect(() => result.current.broadcast('OFFSET', { offset: 1 })).not.toThrow()
    expect(console.debug).toHaveBeenCalled()
  })

  it('unsubscribes on unmount, tolerating a library that throws', async () => {
    unsubscribe.mockImplementation(() => {
      throw new Error('already closed')
    })
    const { unmount } = await mountConnected()
    expect(() => unmount()).not.toThrow()
    expect(unsubscribe).toHaveBeenCalledWith('lyribox-sess')
  })
})
