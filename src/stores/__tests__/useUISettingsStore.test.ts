import { describe, it, expect, beforeEach } from 'vitest'
import { useUISettingsStore } from '../useUISettingsStore'
import { DEFAULT_UI_SETTINGS } from '@/lib/constants'

beforeEach(() => {
  useUISettingsStore.setState({ obsSyncEnabled: false, activeFontSize: 40 })
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
