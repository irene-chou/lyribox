import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SaveStatusIndicator } from '@/components/layout/SaveStatusIndicator'
import { useSongStore } from '@/stores/useSongStore'
import { useSaveStatusStore } from '@/stores/useSaveStatusStore'

const song = {
  id: 1,
  name: 'S',
  lrcText: '[00:01.00]a',
  offset: 0,
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
  useSongStore.getState().clearSong()
  useSaveStatusStore.getState().reset()
})

describe('SaveStatusIndicator', () => {
  it('is empty when idle with nothing to save', () => {
    render(<SaveStatusIndicator />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows 未儲存 once the loaded song is edited', () => {
    useSongStore.getState().loadSong(song)
    render(<SaveStatusIndicator />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => useSongStore.getState().setOffset(0.2))
    expect(screen.getByRole('status')).toHaveTextContent('未儲存')
  })

  it('shows 未儲存 while a debounced save is pending', () => {
    render(<SaveStatusIndicator />)
    act(() => useSaveStatusStore.getState().markPending())
    expect(screen.getByRole('status')).toHaveTextContent('未儲存')
  })

  it('shows 儲存中 and then 已儲存', () => {
    render(<SaveStatusIndicator />)
    act(() => useSaveStatusStore.getState().markSaving())
    expect(screen.getByRole('status')).toHaveTextContent('儲存中')
    act(() => useSaveStatusStore.getState().markSaved())
    expect(screen.getByRole('status')).toHaveTextContent('已儲存')
    expect(screen.getByRole('status')).toHaveAttribute('title', '已儲存')
  })
})
