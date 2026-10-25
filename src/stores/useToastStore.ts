import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'error'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
  actionLabel?: string
  onAction?: () => void
}

interface ToastOptions {
  variant?: ToastVariant
  /** ms before auto-dismiss. Default 4000; toasts with an action default to 6000. */
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, options?: ToastOptions) => number
  dismiss: (id: number) => void
}

let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, options = {}) => {
    const id = nextId++
    const toast: Toast = {
      id,
      message,
      variant: options.variant ?? 'default',
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    }
    // Keep at most 3 visible
    set({ toasts: [...get().toasts.slice(-2), toast] })
    const duration = options.duration ?? (options.actionLabel ? 6000 : 4000)
    timers.set(id, setTimeout(() => get().dismiss(id), duration))
    return id
  },

  dismiss: (id) => {
    const t = timers.get(id)
    if (t) {
      clearTimeout(t)
      timers.delete(id)
    }
    set({ toasts: get().toasts.filter((x) => x.id !== id) })
  },
}))

/** Imperative helper usable outside React. */
export function toast(message: string, options?: ToastOptions): number {
  return useToastStore.getState().show(message, options)
}

toast.success = (message: string, options?: Omit<ToastOptions, 'variant'>) =>
  toast(message, { ...options, variant: 'success' })
toast.error = (message: string, options?: Omit<ToastOptions, 'variant'>) =>
  toast(message, { ...options, variant: 'error' })
