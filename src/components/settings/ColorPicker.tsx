import { useState, useEffect, useRef } from 'react'
import { RgbaColorPicker } from 'react-colorful'

// --- Helpers ---

type RgbaColor = { r: number; g: number; b: number; a: number }

/** Parse any CSS color string into an RGBA object (a: 0-1) */
function parseColor(value: string): RgbaColor {
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  // rgba(r, g, b, a)
  const rgbaMatch = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/,
  )
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    }
  }

  // #RRGGBB or #RGB
  if (/^#[0-9a-fA-F]{3,6}$/.test(value)) {
    const h = value.replace('#', '')
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    }
  }

  return { r: 0, g: 0, b: 0, a: 1 }
}

/** Format RGBA object into a CSS color string */
function formatColor(c: RgbaColor): string {
  if (c.a >= 1) {
    return (
      '#' +
      [c.r, c.g, c.b]
        .map((v) => Math.round(v).toString(16).padStart(2, '0'))
        .join('')
    )
  }
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a})`
}

/** Format RGBA object into a display hex string */
function toHex(c: RgbaColor): string {
  return (
    '#' +
    [c.r, c.g, c.b]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
  )
}

// --- Component ---

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState<RgbaColor>(() => parseColor(value))
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync from external value changes
  useEffect(() => {
    setColor(parseColor(value))
  }, [value])

  // Close picker on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleChange(newColor: RgbaColor) {
    setColor(newColor)
    onChange(formatColor(newColor))
  }

  function commitHex(input: HTMLInputElement) {
    const text = input.value.trim()
    if (text === '透明' || text.toLowerCase() === 'transparent') {
      const next = { ...color, a: 0 }
      setColor(next)
      onChange(formatColor(next))
      return
    }
    if (/^#[0-9a-fA-F]{6}$/.test(text) || /^#[0-9a-fA-F]{3}$/.test(text)) {
      const parsed = parseColor(text)
      // Typing a hex into a fully transparent colour means "make it visible"
      const next = { ...parsed, a: color.a === 0 ? 1 : color.a }
      setColor(next)
      onChange(formatColor(next))
    }
  }

  // Swatch preview color
  const swatchCss = formatColor(color)
  const isTransparent = color.a === 0
  const hexDisplay = isTransparent ? '透明' : toHex(color)

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div
        className="text-lb-text-secondary"
        style={{
          fontSize: '11px',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>

      {/* Swatch + hex display */}
      <div className="flex items-center" style={{ gap: '8px' }}>
        {/* Hex text input */}
        <input
          type="text"
          defaultValue={hexDisplay}
          key={hexDisplay}
          aria-label={`${label}顏色`}
          title={isTransparent ? '目前為透明，輸入色碼即可設定顏色' : undefined}
          onBlur={(e) => commitHex(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex(e.currentTarget)
          }}
          style={{
            width: '72px',
            height: '26px',
            background: 'var(--lb-bg-input)',
            border: '1px solid var(--lb-border)',
            borderRadius: '4px',
            padding: '0 6px',
            fontFamily: isTransparent ? 'var(--font-sans)' : 'var(--font-mono)',
            fontSize: '11px',
            color: isTransparent ? 'var(--lb-text-secondary)' : 'var(--lb-text-primary)',
            outline: 'none',
            flexShrink: 0,
          }}
        />
        {/* Color swatch — click to toggle picker */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`選擇${label}顏色`}
          aria-expanded={open}
          style={{
            position: 'relative',
            width: '26px',
            height: '26px',
            borderRadius: '4px',
            border: '1px solid var(--lb-border)',
            background:
              'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: 'pointer',
            padding: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: swatchCss,
            }}
          />
        </button>
      </div>

      {/* Floating picker panel */}
      {open && (
        <div
          className="lb-color-picker"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '6px',
            zIndex: 50,
            background: 'var(--lb-bg-card)',
            border: '1px solid var(--lb-border)',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            width: '220px',
          }}
        >
          <RgbaColorPicker color={color} onChange={handleChange} />
        </div>
      )}
    </div>
  )
}
