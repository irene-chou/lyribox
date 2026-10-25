import { describe, it, expect } from 'vitest'
import { formatKeys, shortcutHint, shortcutsByGroup, SHORTCUTS } from '../shortcuts'

describe('formatKeys', () => {
  it('uses ⌘ and no separator on mac', () => {
    expect(formatKeys(['Mod', 'K'], true)).toBe('⌘K')
    expect(formatKeys(['Shift', '↑'], true)).toBe('⇧↑')
  })

  it('uses Ctrl and + elsewhere', () => {
    expect(formatKeys(['Mod', 'K'], false)).toBe('Ctrl+K')
    expect(formatKeys(['Shift', '↑'], false)).toBe('Shift+↑')
  })
})

describe('shortcutHint', () => {
  it('wraps the keys in parentheses', () => {
    expect(shortcutHint('play-pause', true)).toBe('(Space)')
    expect(shortcutHint('search-songs', false)).toBe('(Ctrl+K)')
  })
})

describe('shortcutsByGroup', () => {
  it('covers every shortcut exactly once', () => {
    const all = shortcutsByGroup().flatMap((g) => g.items)
    expect(all).toHaveLength(SHORTCUTS.length)
    expect(new Set(all.map((s) => s.id)).size).toBe(SHORTCUTS.length)
  })
})
