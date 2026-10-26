import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LyricLine } from '@/components/lyrics/LyricLine'

const colors = { activeColor: 'rgb(1, 1, 1)', otherColor: 'rgb(2, 2, 2)', passedColor: 'rgb(3, 3, 3)' }
const sizes = { activeFontSize: 32, otherFontSize: 20 }

describe('LyricLine', () => {
  it('renders the active line bold, large and in the active colour', () => {
    render(<LyricLine line={{ time: 1, text: 'Active' }} status="active" {...sizes} {...colors} />)
    const el = screen.getByText('Active')
    expect(el).toHaveStyle({ fontSize: '32px', fontWeight: 700, color: colors.activeColor })
  })

  it('renders passed lines in the passed colour at the small size', () => {
    render(<LyricLine line={{ time: 1, text: 'Passed' }} status="passed" {...sizes} {...colors} />)
    expect(screen.getByText('Passed')).toHaveStyle({ fontSize: '20px', fontWeight: 400, color: colors.passedColor })
  })

  it('renders upcoming lines in the other colour', () => {
    render(<LyricLine line={{ time: 1, text: 'Up' }} status="upcoming" {...sizes} {...colors} />)
    expect(screen.getByText('Up')).toHaveStyle({ color: colors.otherColor })
  })

  it('shows ♪ in italics for an empty (interlude) line regardless of status', () => {
    render(<LyricLine line={{ time: 1, text: '   ' }} status="active" {...sizes} {...colors} />)
    const el = screen.getByText('♪')
    expect(el).toHaveStyle({ fontStyle: 'italic', fontSize: '16px' })
  })

  it('is clickable with a hint title only when onClick is given', () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <LyricLine line={{ time: 1, text: 'Click' }} status="upcoming" {...sizes} {...colors} onClick={onClick} />,
    )
    const el = screen.getByText('Click')
    expect(el).toHaveAttribute('title', '點擊跳到此句')
    expect(el).toHaveClass('lyric-line-clickable')
    fireEvent.click(el)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<LyricLine line={{ time: 1, text: 'Click' }} status="upcoming" {...sizes} {...colors} />)
    expect(screen.getByText('Click')).not.toHaveAttribute('title')
    expect(screen.getByText('Click')).not.toHaveClass('lyric-line-clickable')
  })

  it('forwards its ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(<LyricLine ref={ref} line={{ time: 1, text: 'Ref' }} status="upcoming" {...sizes} {...colors} />)
    expect(ref.current).toBe(screen.getByText('Ref'))
  })
})
