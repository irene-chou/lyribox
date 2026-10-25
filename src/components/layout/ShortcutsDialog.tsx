import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatKeys, shortcutsByGroup } from '@/lib/shortcuts'

interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const groups = shortcutsByGroup()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[80dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>鍵盤快捷鍵</DialogTitle>
          <DialogDescription className="sr-only">所有可用的鍵盤快捷鍵</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex flex-col" style={{ padding: '16px 20px 20px', gap: '16px' }}>
          {groups.map(({ group, items }) => (
            <section key={group} className="flex flex-col" style={{ gap: '4px' }}>
              <h3
                className="text-lb-text-dim"
                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}
              >
                {group}
              </h3>
              {items.map((s) => (
                <div key={s.id} className="flex items-center justify-between" style={{ gap: '12px', minHeight: '28px' }}>
                  <span className="text-lb-text-primary" style={{ fontSize: '13px' }}>
                    {s.label}
                  </span>
                  <kbd
                    className="bg-lb-bg-input border border-lb-border text-lb-text-secondary"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatKeys(s.keys)}
                  </kbd>
                </div>
              ))}
            </section>
          ))}
          <p className="text-lb-text-dim" style={{ fontSize: '11px', lineHeight: 1.5 }}>
            在輸入框中打字時快捷鍵不會觸發。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
