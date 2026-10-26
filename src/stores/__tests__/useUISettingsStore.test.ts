import { describe, it, expect, beforeEach } from 'vitest'
import { useUISettingsStore } from '../useUISettingsStore'
import { DEFAULT_OBS_PRESETS } from '@/lib/constants'

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
