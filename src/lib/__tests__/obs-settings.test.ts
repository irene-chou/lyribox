import { describe, it, expect } from 'vitest'
import { pickObsSettings, diffSettings, OBS_SETTING_KEYS } from '../obs-settings'
import { DEFAULT_UI_SETTINGS } from '../constants'
import type { UISettings } from '@/types'

const ui: UISettings = { ...DEFAULT_UI_SETTINGS, sidebarWidth: 999, persistLocalAudio: true }

describe('pickObsSettings', () => {
  it('returns exactly the OBS keys and drops app-only settings', () => {
    const picked = pickObsSettings(ui)
    expect(Object.keys(picked).sort()).toEqual([...OBS_SETTING_KEYS].sort())
    expect(picked).not.toHaveProperty('sidebarWidth')
    expect(picked).not.toHaveProperty('persistLocalAudio')
  })

  it('copies values from the source', () => {
    const picked = pickObsSettings({ ...ui, activeFontSize: 48, lyricsBgColor: '#000000' })
    expect(picked.activeFontSize).toBe(48)
    expect(picked.lyricsBgColor).toBe('#000000')
  })
})

describe('diffSettings', () => {
  const base = pickObsSettings(ui)

  it('returns null when nothing changed', () => {
    expect(diffSettings(base, { ...base })).toBeNull()
  })

  it('returns only the changed keys', () => {
    const next = { ...base, activeFontSize: base.activeFontSize + 2, showTitle: !base.showTitle }
    expect(diffSettings(base, next)).toEqual({
      activeFontSize: base.activeFontSize + 2,
      showTitle: !base.showTitle,
    })
  })

  it('treats falsy values as real changes', () => {
    const next = { ...base, visibleBefore: 0, showTitle: false }
    const prev = { ...base, visibleBefore: 3, showTitle: true }
    expect(diffSettings(prev, next)).toEqual({ visibleBefore: 0, showTitle: false })
  })
})
