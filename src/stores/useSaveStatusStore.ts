import { create } from 'zustand'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved'

interface SaveStatusState {
  status: SaveStatus
  /** A save has been scheduled (debounce running). */
  markPending: () => void
  markSaving: () => void
  /** Flip to 'saved', then back to 'idle' after a short while. */
  markSaved: () => void
  reset: () => void
}

let savedTimer: ReturnType<typeof setTimeout> | null = null
const SAVED_VISIBLE_MS = 1500

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  status: 'idle',

  markPending: () => {
    if (savedTimer) {
      clearTimeout(savedTimer)
      savedTimer = null
    }
    set({ status: 'pending' })
  },

  markSaving: () => {
    if (savedTimer) {
      clearTimeout(savedTimer)
      savedTimer = null
    }
    set({ status: 'saving' })
  },

  markSaved: () => {
    if (savedTimer) clearTimeout(savedTimer)
    set({ status: 'saved' })
    savedTimer = setTimeout(() => {
      savedTimer = null
      set({ status: 'idle' })
    }, SAVED_VISIBLE_MS)
  },

  reset: () => {
    if (savedTimer) {
      clearTimeout(savedTimer)
      savedTimer = null
    }
    set({ status: 'idle' })
  },
}))
