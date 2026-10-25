import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDialogStore } from '@/stores/useDialogStore'

const secondaryBtn: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid var(--lb-border)',
  background: 'var(--lb-bg-input)',
  color: 'var(--lb-text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid var(--lb-accent)',
  background: 'var(--lb-accent)',
  color: '#fff',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  border: '1px solid var(--lb-danger)',
  background: 'var(--lb-danger)',
}

/**
 * Renders the confirm / prompt dialog requested via `confirmDialog()` /
 * `promptDialog()`. Mount once in App.
 */
export function DialogHost() {
  const pending = useDialogStore((s) => s.pending)
  const resolveConfirm = useDialogStore((s) => s.resolveConfirm)
  const resolvePrompt = useDialogStore((s) => s.resolvePrompt)

  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset the prompt value each time a prompt opens
  const promptKey = pending?.kind === 'prompt' ? pending : null
  useEffect(() => {
    if (!promptKey) return
    setValue(promptKey.options.defaultValue ?? '')
    // Focus after Radix finishes mounting
    const t = setTimeout(() => {
      inputRef.current?.focus()
      if (promptKey.options.selectOnOpen) inputRef.current?.select()
    }, 30)
    return () => clearTimeout(t)
  }, [promptKey])

  if (!pending) return <Dialog open={false} />

  if (pending.kind === 'confirm') {
    const o = pending.options
    return (
      <Dialog open onOpenChange={(open) => !open && resolveConfirm(false)}>
        <DialogContent className="flex flex-col" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{o.title}</DialogTitle>
            <DialogDescription className={o.description ? 'text-lb-text-secondary' : 'sr-only'} style={{ fontSize: '13px', marginTop: '4px' }}>
              {o.description ?? o.title}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => resolveConfirm(false)} style={secondaryBtn}>
              {o.cancelLabel ?? '取消'}
            </button>
            <button autoFocus onClick={() => resolveConfirm(true)} style={o.destructive ? dangerBtn : primaryBtn}>
              {o.confirmLabel ?? '確定'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const o = pending.options
  const submit = () => resolvePrompt(value)
  return (
    <Dialog open onOpenChange={(open) => !open && resolvePrompt(null)}>
      <DialogContent className="flex flex-col" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{o.title}</DialogTitle>
          <DialogDescription className={o.description ? 'text-lb-text-secondary' : 'sr-only'} style={{ fontSize: '13px', marginTop: '4px' }}>
            {o.description ?? o.title}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex flex-col"
          style={{ padding: '20px', gap: '6px' }}
        >
          {o.label && (
            <label
              htmlFor="lb-prompt-input"
              className="text-lb-text-dim"
              style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              {o.label}
            </label>
          )}
          <input
            id="lb-prompt-input"
            ref={inputRef}
            type="text"
            value={value}
            placeholder={o.placeholder}
            onChange={(e) => setValue(e.target.value)}
            style={{
              background: 'var(--lb-bg-input)',
              border: '1px solid var(--lb-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--lb-text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              outline: 'none',
              width: '100%',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--lb-accent)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--lb-accent-glow)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--lb-border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </form>
        <DialogFooter>
          <button onClick={() => resolvePrompt(null)} style={secondaryBtn}>
            {o.cancelLabel ?? '取消'}
          </button>
          <button onClick={submit} style={primaryBtn}>
            {o.confirmLabel ?? '確定'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
