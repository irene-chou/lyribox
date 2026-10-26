/**
 * URL query parameters understood by `public/obs.html` to override the
 * appearance of a single OBS browser source. Values given here win over
 * the settings synced from the control page, so several sources on the
 * same session can look different.
 *
 * NOTE: `public/obs.html` contains an inline plain-JS copy of
 * `parseObsParams` (it cannot import modules). Keep both in sync.
 */

export type ObsAlign = 'left' | 'center' | 'right'

export interface ObsUrlParams {
  /** Horizontal text alignment of the lyrics block. */
  align?: ObsAlign
  /** Draw a dark text shadow behind lyrics (helps over bright video). */
  shadow?: boolean
  /** Animate size / colour transitions between lines (default on). */
  anim?: boolean
  /** Lines shown before the active line (overrides synced visibleBefore). */
  before?: number
  /** Lines shown after the active line (overrides synced visibleAfter). */
  after?: number
  /** Active line font size in px (overrides synced activeFontSize). */
  size?: number
  /** Other lines font size in px (overrides synced otherFontSize). */
  otherSize?: number
  /** Show the "Now singing" title block (overrides synced showTitle). */
  title?: boolean
  /** CSS colour for the page background (overrides synced lyricsBgColor). */
  bg?: string
}

export const OBS_PARAM_KEYS: (keyof ObsUrlParams)[] = [
  'align',
  'shadow',
  'anim',
  'before',
  'after',
  'size',
  'otherSize',
  'title',
  'bg',
]

const ALIGN_VALUES: ObsAlign[] = ['left', 'center', 'right']
const MAX_LINES = 50
const MIN_FONT = 8
const MAX_FONT = 300
/** Conservative CSS colour whitelist: #hex, a colour keyword, or rgb()/rgba()/hsl()/hsla() with numbers and %. */
const BG_PATTERN = /^(#[0-9a-f]{3,8}|[a-z]+|(?:rgba?|hsla?)\([\d.,%\s/]+\))$/i

function parseFlag(v: string | null): boolean | undefined {
  if (v === '1' || v === 'true') return true
  if (v === '0' || v === 'false') return false
  return undefined
}

function parseInt(v: string | null, min: number, max: number): number | undefined {
  if (v === null || !/^\d+$/.test(v.trim())) return undefined
  const n = Number(v)
  return n >= min && n <= max ? n : undefined
}

/** Parse `location.search` (with or without leading `?`). Invalid values are dropped. */
export function parseObsParams(search: string): ObsUrlParams {
  const q = new URLSearchParams(search)
  const out: ObsUrlParams = {}

  const align = q.get('align')
  if (align && (ALIGN_VALUES as string[]).includes(align)) out.align = align as ObsAlign

  const shadow = parseFlag(q.get('shadow'))
  if (shadow !== undefined) out.shadow = shadow
  const anim = parseFlag(q.get('anim'))
  if (anim !== undefined) out.anim = anim
  const title = parseFlag(q.get('title'))
  if (title !== undefined) out.title = title

  const before = parseInt(q.get('before'), 0, MAX_LINES)
  if (before !== undefined) out.before = before
  const after = parseInt(q.get('after'), 0, MAX_LINES)
  if (after !== undefined) out.after = after
  const size = parseInt(q.get('size'), MIN_FONT, MAX_FONT)
  if (size !== undefined) out.size = size
  const otherSize = parseInt(q.get('otherSize'), MIN_FONT, MAX_FONT)
  if (otherSize !== undefined) out.otherSize = otherSize

  const bg = q.get('bg')?.trim()
  if (bg && bg.length <= 64 && BG_PATTERN.test(bg)) out.bg = bg

  return out
}

/** Serialise params back into query-string pairs (booleans as 1/0). Undefined keys are skipped. */
export function obsParamsToSearchParams(params: ObsUrlParams): URLSearchParams {
  const q = new URLSearchParams()
  for (const key of OBS_PARAM_KEYS) {
    const v = params[key]
    if (v === undefined || v === '') continue
    q.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  return q
}
