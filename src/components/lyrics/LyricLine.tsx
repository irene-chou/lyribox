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
        transition:
          'font-size 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), color 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), font-weight 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.15s, padding-left 0.15s',
        cursor: onClick ? 'pointer' : ('default' as const),
        // Negative margin so the hover background bleeds past the text without
        // shifting layout
        margin: '0 -12px',
        padding: '2px 12px',
        borderRadius: '8px',
      }),
      [fontSize, fontWeight, color, isInterlude, onClick],
    )

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={onClick ? 'font-lyrics lyric-line-clickable' : 'font-lyrics'}
        style={style}
        title={onClick ? '點擊跳到此句' : undefined}
      >
        {isInterlude ? '♪' : line.text}
        {!isInterlude && line.subText && (
          <div
            style={{
              fontSize: `${Math.round(fontSize * 0.6)}px`,
              fontWeight: 400,
              lineHeight: 1.4,
              opacity: 0.75,
              marginTop: '2px',
              whiteSpace: 'pre-line',
              transition: 'font-size 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          >
            {line.subText}
          </div>
        )}
      </div>
    )
  }),
)
