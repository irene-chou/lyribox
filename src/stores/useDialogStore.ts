import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Render the confirm button in the danger colour. */
  destructive?: boolean
}

export interface PromptOptions {
  title: string
  description?: string
  label?: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Select the default value on open (handy for "copy this" prompts). */
  selectOnOpen?: boolean
}

type PendingDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }

interface DialogState {
  pending: PendingDialog | null
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
  /** Resolve the current dialog. */
  resolveConfirm: (ok: boolean) => void
  resolvePrompt: (value: string | null) => void
}

/** If another dialog is open, resolve it as cancelled before replacing it. */
function cancelPending(prev: PendingDialog | null) {
  if (!prev) return
  if (prev.kind === 'confirm') prev.resolve(false)
  else prev.resolve(null)
}

export const useDialogStore = create<DialogState>((set, get) => ({
  pending: null,

  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      cancelPending(get().pending)
      set({ pending: { kind: 'confirm', options, resolve } })
    }),

  prompt: (options) =>
    new Promise<string | null>((resolve) => {
      cancelPending(get().pending)
      set({ pending: { kind: 'prompt', options, resolve } })
    }),

  resolveConfirm: (ok) => {
    const p = get().pending
    if (p?.kind === 'confirm') {
      set({ pending: null })
      p.resolve(ok)
    }
  },

  resolvePrompt: (value) => {
    const p = get().pending
    if (p?.kind === 'prompt') {
      set({ pending: null })
      p.resolve(value)
    }
  },
}))

/** Promise-based replacement for window.confirm. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return useDialogStore.getState().confirm(options)
}

/** Promise-based replacement for window.prompt. Resolves null on cancel. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return useDialogStore.getState().prompt(options)
}
