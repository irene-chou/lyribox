import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShortcutsDialog } from '@/components/layout/ShortcutsDialog'
import { SHORTCUTS } from '@/lib/shortcuts'

describe('ShortcutsDialog', () => {
  it('renders nothing while closed', () => {
    render(<ShortcutsDialog open={false} onOpenChange={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lists every shortcut under its group when open', () => {
    render(<ShortcutsDialog open onOpenChange={() => {}} />)
    expect(screen.getByRole('heading', { name: '鍵盤快捷鍵' })).toBeInTheDocument()
    for (const group of ['播放', '歌曲', '顯示', '其他']) {
      expect(screen.getByRole('heading', { level: 3, name: group })).toBeInTheDocument()
    }
    for (const s of SHORTCUTS) {
      expect(screen.getByText(s.label)).toBeInTheDocument()
    }
  })

  it('reports close requests through onOpenChange', () => {
    const onOpenChange = vi.fn()
    render(<ShortcutsDialog open onOpenChange={onOpenChange} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
