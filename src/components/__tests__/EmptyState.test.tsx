import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '@/components/lyrics/EmptyState'

describe('EmptyState', () => {
  it('offers both ways to get a song and wires the callbacks', () => {
    const onNewSong = vi.fn()
    const onOpenDrawer = vi.fn()
    render(<EmptyState onNewSong={onNewSong} onOpenDrawer={onOpenDrawer} />)

    expect(screen.getByText('還沒有載入歌曲')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '新增歌曲' }))
    fireEvent.click(screen.getByRole('button', { name: '開啟歌曲庫' }))
    expect(onNewSong).toHaveBeenCalledTimes(1)
    expect(onOpenDrawer).toHaveBeenCalledTimes(1)
  })

  it('tightens padding on mobile', () => {
    const { container } = render(<EmptyState isMobile onNewSong={() => {}} onOpenDrawer={() => {}} />)
    expect(container.firstElementChild).toHaveStyle({ padding: '24px 16px' })
  })
})
