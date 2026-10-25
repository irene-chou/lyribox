import { describe, it, expect, beforeEach } from 'vitest'
import { useDialogStore, confirmDialog, promptDialog } from '../useDialogStore'

beforeEach(() => {
  useDialogStore.setState({ pending: null })
})

describe('useDialogStore', () => {
  it('confirmDialog resolves true/false via resolveConfirm', async () => {
    const p = confirmDialog({ title: '刪除？' })
    expect(useDialogStore.getState().pending?.kind).toBe('confirm')
    useDialogStore.getState().resolveConfirm(true)
    await expect(p).resolves.toBe(true)
    expect(useDialogStore.getState().pending).toBeNull()
  })

  it('promptDialog resolves the entered value or null', async () => {
    const p = promptDialog({ title: '名稱' })
    useDialogStore.getState().resolvePrompt('abc')
    await expect(p).resolves.toBe('abc')

    const q = promptDialog({ title: '名稱' })
    useDialogStore.getState().resolvePrompt(null)
    await expect(q).resolves.toBeNull()
  })

  it('opening a new dialog cancels the previous one', async () => {
    const first = confirmDialog({ title: 'a' })
    const second = promptDialog({ title: 'b' })
    await expect(first).resolves.toBe(false)
    useDialogStore.getState().resolvePrompt('x')
    await expect(second).resolves.toBe('x')
  })

  it('resolveConfirm is a no-op when a prompt is pending', () => {
    void promptDialog({ title: 'b' })
    useDialogStore.getState().resolveConfirm(true)
    expect(useDialogStore.getState().pending?.kind).toBe('prompt')
  })
})
