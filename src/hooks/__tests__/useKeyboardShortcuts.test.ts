import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/song-service', () => ({
  saveSongToDB: vi.fn(() => Promise.resolve()),
  debouncedSaveSong: vi.fn(),
}))
vi.mock('@/lib/song-selection', () => ({
  navigateSong: vi.fn(() => Promise.resolve(null)),
}))

const { saveSongToDB } = await import('@/lib/song-service')
const { navigateSong } = await import('@/lib/song-selection')
const { useSongStore } = await import('@/stores/useSongStore')
const { useUISettingsStore } = await import('@/stores/useUISettingsStore')
const { useKeyboardShortcuts, saveCurrentSong } = await import('../useKeyboardShortcuts')
type Engine = ReturnType<typeof import('@/hooks/usePlaybackEngine').usePlaybackEngine>

const song = {
  id: 1,
  name: 'Keys',
  lrcText: '[00:01.00]a\n[00:05.00]b',
  offset: 0,
  pitch: 0,
  audioSource: 'youtube' as const,
  youtubeId: 'yt',
  audioFileName: null,
  folderId: null,
  createdAt: 42,
  updatedAt: 42,
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(e)
  return e
}

function mount() {
  const engine = { togglePlay: vi.fn(), seekBy: vi.fn() } as unknown as Engine
  const callbacks = { onCloseDrawer: vi.fn(), onOpenSearch: vi.fn(), onToggleShortcuts: vi.fn() }
  const hook = renderHook(() => useKeyboardShortcuts({ engine, ...callbacks }))
  return { engine, callbacks, ...hook }
}

beforeEach(() => {
  useSongStore.getState().clearSong()
  useUISettingsStore.getState().setActiveFontSize(32)
  vi.mocked(saveSongToDB).mockClear()
  vi.mocked(navigateSong).mockClear()
  document.body.innerHTML = ''
})

describe('useKeyboardShortcuts – playback', () => {
  it('Space toggles play only when a song is loaded, and prevents page scroll', () => {
    const { engine } = mount()
    const e1 = press(' ')
    expect(engine.togglePlay).not.toHaveBeenCalled()
    expect(e1.defaultPrevented).toBe(true)

    useSongStore.getState().loadSong(song)
    press(' ')
    expect(engine.togglePlay).toHaveBeenCalledTimes(1)
  })

  it('arrow left/right seek ±5s, ±15s with Shift', () => {
    const { engine } = mount()
    useSongStore.getState().loadSong(song)
    press('ArrowLeft')
    press('ArrowRight')
    press('ArrowLeft', { shiftKey: true })
    press('ArrowRight', { shiftKey: true })
    expect(vi.mocked(engine.seekBy).mock.calls.map((c) => c[0])).toEqual([-5, 5, -15, 15])
  })

  it('arrow up/down adjust the offset by 0.1 (0.5 with Shift)', () => {
    mount()
    useSongStore.getState().loadSong(song)
    press('ArrowUp')
    expect(useSongStore.getState().offset).toBe(0.1)
    press('ArrowDown', { shiftKey: true })
    expect(useSongStore.getState().offset).toBe(-0.4)
  })

  it('Cmd+arrow up/down change the active font size instead of the offset', () => {
    mount()
    useSongStore.getState().loadSong(song)
    press('ArrowUp', { metaKey: true })
    expect(useUISettingsStore.getState().activeFontSize).toBe(34)
    press('ArrowDown', { ctrlKey: true })
    expect(useUISettingsStore.getState().activeFontSize).toBe(32)
    expect(useSongStore.getState().offset).toBe(0)
  })
})

describe('useKeyboardShortcuts – song & UI', () => {
  it('Cmd+S saves the current song and clears the dirty flag', async () => {
    mount()
    useSongStore.getState().loadSong(song)
    useSongStore.getState().setOffset(0.7)
    press('s', { metaKey: true })
    expect(saveSongToDB).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Keys', offset: 0.7, youtubeId: 'yt', createdAt: 42 }),
    )
    await vi.waitFor(() => expect(useSongStore.getState().hasUnsavedChanges()).toBe(false))
  })

  it('saveCurrentSong is a no-op without a song', () => {
    expect(saveCurrentSong()).toBeUndefined()
    expect(saveSongToDB).not.toHaveBeenCalled()
  })

  it('Cmd+K opens search, Cmd+[ / ] navigate songs', () => {
    const { callbacks } = mount()
    press('k', { metaKey: true })
    expect(callbacks.onOpenSearch).toHaveBeenCalledTimes(1)
    press('[', { ctrlKey: true })
    press(']', { metaKey: true })
    expect(vi.mocked(navigateSong).mock.calls.map((c) => c[0])).toEqual([-1, 1])
  })

  it('plain letters without a modifier do nothing', () => {
    const { callbacks } = mount()
    press('k')
    press('s')
    expect(callbacks.onOpenSearch).not.toHaveBeenCalled()
    expect(saveSongToDB).not.toHaveBeenCalled()
  })

  it('? (or Shift+/) toggles the shortcuts dialog, Escape closes the drawer', () => {
    const { callbacks } = mount()
    press('?')
    press('/', { shiftKey: true })
    expect(callbacks.onToggleShortcuts).toHaveBeenCalledTimes(2)
    press('Escape')
    expect(callbacks.onCloseDrawer).toHaveBeenCalledTimes(1)
  })

  it('ignores keys typed into inputs, textareas and contentEditable elements', () => {
    const { engine } = mount()
    useSongStore.getState().loadSong(song)
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    document.body.append(input, textarea, editable)

    press(' ', {}, input)
    press('ArrowLeft', {}, textarea)
    press('ArrowUp', {}, editable)

    expect(engine.togglePlay).not.toHaveBeenCalled()
    expect(engine.seekBy).not.toHaveBeenCalled()
    expect(useSongStore.getState().offset).toBe(0)
  })

  it('inside an open dialog only Escape is handled', () => {
    const { engine, callbacks } = mount()
    useSongStore.getState().loadSong(song)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.appendChild(button)
    document.body.appendChild(dialog)

    press(' ', {}, button)
    expect(engine.togglePlay).not.toHaveBeenCalled()
    press('Escape', {}, button)
    expect(callbacks.onCloseDrawer).toHaveBeenCalledTimes(1)
  })

  it('removes the listener on unmount', () => {
    const { engine, unmount } = mount()
    useSongStore.getState().loadSong(song)
    unmount()
    press(' ')
    expect(engine.togglePlay).not.toHaveBeenCalled()
  })
})
