import { memo, useMemo, forwardRef } from 'react'
import type { LyricLine as LyricLineType } from '@/types'

export type LyricStatus = 'passed' | 'active' | 'upcoming'

interface LyricLineProps {
  line: LyricLineType
  status: LyricStatus
  activeFontSize: number
  otherFontSize: number
  activeColor: string
  otherColor: string
  passedColor: string
  onClick?: () => void
}

export const LyricLine = memo(
  forwardRef<HTMLDivElement, LyricLineProps>(function LyricLine(
    {
      line,
      status,
      activeFontSize,
      otherFontSize,
      activeColor,
      otherColor,
      passedColor,
      onClick,
    },
    ref,
  ) {
    const isInterlude = !line.text.trim()

    const isActive = status === 'active'
    const isPassed = status === 'passed'

    let fontSize: number
    let color: string
    let fontWeight: number

    if (isInterlude) {
      fontSize = 16
      color = 'var(--lb-text-dim)'
      fontWeight = 400
    } else if (isActive) {
      fontSize = activeFontSize
      color = activeColor
      fontWeight = 700
    } else if (isPassed) {
      fontSize = otherFontSize
      color = passedColor
      fontWeight = 400
    } else {
      // upcoming
      fontSize = otherFontSize
      color = otherColor
      fontWeight = 400
    }

    const style = useMemo(
      () => ({
        fontSize: `${fontSize}px`,
        fontWeight,
        lineHeight: 1.4,
        color,
        fontStyle: isInterlude ? ('italic' as const) : ('normal' as const),
        letterSpacing: isInterlude ? '0.05em' : 'normal',
        transition: 'font-size 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), color 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), font-weight 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
        cursor: onClick ? 'pointer' : ('default' as const),
      }),
      [fontSize, fontWeight, color, isInterlude, onClick],
    )

    return (
      <div ref={ref} onClick={onClick} className="font-lyrics" style={style}>
        {isInterlude ? '♪' : line.text}
      </div>
    )
  }),
)
