import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NowSinging } from '@/components/lyrics/NowSinging'

describe('NowSinging', () => {
  it('renders nothing without a title', () => {
    const { container } = render(<NowSinging title="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the label and the title at the given size', () => {
    render(<NowSinging title="夜に駆ける" titleFontSize={24} />)
    expect(screen.getByText('Now Singing')).toBeInTheDocument()
    expect(screen.getByText('夜に駆ける')).toHaveStyle({ fontSize: '24px' })
  })

  it('uses tighter padding on mobile', () => {
    const { container, rerender } = render(<NowSinging title="T" />)
    expect(container.firstElementChild).toHaveStyle({ padding: '16px 48px' })
    rerender(<NowSinging title="T" isMobile />)
    expect(container.firstElementChild).toHaveStyle({ padding: '16px' })
  })
})
