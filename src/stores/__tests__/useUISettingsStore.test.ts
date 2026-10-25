import { describe, it, expect, beforeEach } from 'vitest'
import { useUISettingsStore } from '../useUISettingsStore'

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
