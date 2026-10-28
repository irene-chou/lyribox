import { describe, it, expect, beforeEach } from 'vitest'
import { useUISettingsStore } from '../useUISettingsStore'
import { DEFAULT_OBS_PRESETS, DEFAULT_UI_SETTINGS } from '@/lib/constants'

beforeEach(() => {
  useUISettingsStore.setState({ obsSyncEnabled: false, activeFontSize: 40, obsPresets: DEFAULT_OBS_PRESETS })
})

describe('useUISettingsStore – OBS presets', () => {
  it('seeds 多行歌詞 and 單行字幕 by default', () => {
    expect(useUISettingsStore.getState().obsPresets.map((p) => p.name)).toEqual(['多行歌詞', '單行字幕'])
  })

  it('adds, updates and removes presets', () => {
    const s = useUISettingsStore.getState()
    const added = s.addObsPreset('直式', { align: 'center', size: 40 })
    expect(useUISettingsStore.getState().obsPresets).toHaveLength(3)
    expect(added.params).toEqual({ align: 'center', size: 40 })

    s.updateObsPreset(added.id, { name: '直式字幕', params: { align: 'right' } })
    const updated = useUISettingsStore.getState().obsPresets.find((p) => p.id === added.id)
    expect(updated).toEqual({ id: added.id, name: '直式字幕', params: { align: 'right' } })

    s.removeObsPreset(added.id)
    expect(useUISettingsStore.getState().obsPresets).toHaveLength(2)
  })

  it('survives resetAll (it is not a display setting)', () => {
    useUISettingsStore.getState().addObsPreset('x')
    useUISettingsStore.getState().resetAll()
    expect(useUISettingsStore.getState().obsPresets).toHaveLength(3)
  })
})

describe('useUISettingsStore – OBS sync opt-in', () => {
  it('is off by default so no PieSocket connection is opened', () => {
    expect(useUISettingsStore.getState().obsSyncEnabled).toBe(false)
  })

  it('can be switched on and off', () => {
    useUISettingsStore.getState().setObsSyncEnabled(true)
    expect(useUISettingsStore.getState().obsSyncEnabled).toBe(true)
    useUISettingsStore.getState().setObsSyncEnabled(false)
    expect(useUISettingsStore.getState().obsSyncEnabled).toBe(false)
  })

  it('survives resetAll (it is not a display setting)', () => {
    useUISettingsStore.getState().setObsSyncEnabled(true)
    useUISettingsStore.getState().resetAll()
    expect(useUISettingsStore.getState().obsSyncEnabled).toBe(true)
    expect(useUISettingsStore.getState().activeFontSize).not.toBe(40)
  })
})

describe('useUISettingsStore – display settings', () => {
  it('setters update their field only', () => {
    const s = useUISettingsStore.getState()
    s.setOtherFontSize(20)
    s.setTitleFontSize(22)
    s.setShowTitle(false)
    s.setLyricsGap(8)
    s.setVisibleBefore(1)
    s.setVisibleAfter(2)
    s.setActiveColor('#111111')
    s.setOtherColor('#222222')
    s.setPassedColor('#333333')
    s.setLyricsBgColor('transparent')
    s.setSidebarWidth(360)
    s.setPersistLocalAudio(false)
    expect(useUISettingsStore.getState()).toMatchObject({
      otherFontSize: 20,
      titleFontSize: 22,
      showTitle: false,
      lyricsGap: 8,
      visibleBefore: 1,
      visibleAfter: 2,
      activeColor: '#111111',
      otherColor: '#222222',
      passedColor: '#333333',
      lyricsBgColor: 'transparent',
      sidebarWidth: 360,
      persistLocalAudio: false,
      activeFontSize: 40,
    })
  })

  it('resetAll restores every display default but keeps the panel open state', () => {
    const s = useUISettingsStore.getState()
    s.setDisplaySettingsOpen(true)
    s.setActiveColor('#111111')
    s.setVisibleAfter(9)
    s.resetAll()
    const after = useUISettingsStore.getState()
    expect(after.activeColor).toBe(DEFAULT_UI_SETTINGS.activeColor)
    expect(after.visibleAfter).toBe(DEFAULT_UI_SETTINGS.visibleAfter)
    expect(after.activeFontSize).toBe(DEFAULT_UI_SETTINGS.activeFontSize)
    expect(after.displaySettingsOpen).toBe(true)
  })

  it('persists to localStorage under lb-ui-settings', () => {
    useUISettingsStore.getState().setActiveFontSize(48)
    useUISettingsStore.getState().setObsSyncEnabled(true)
    const raw = localStorage.getItem('lb-ui-settings')
    expect(raw).not.toBeNull()
    const { state } = JSON.parse(raw!)
    expect(state.activeFontSize).toBe(48)
    expect(state.obsSyncEnabled).toBe(true)
    expect(state.setActiveFontSize).toBeUndefined()
  })
})
