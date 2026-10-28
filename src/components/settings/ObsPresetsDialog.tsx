import { useState } from 'react'
import { Pencil, Trash2, Plus, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { confirmDialog, promptDialog } from '@/stores/useDialogStore'
import { describeObsParams } from '@/lib/obs-params'
import { CONTROL_BTN_CLASS, ICON_BTN_CLASS, ICON_BTN_STYLE, OFFSET_BTN_STYLE } from '@/lib/constants'
import type { ObsAlign, ObsPreset, ObsUrlParams } from '@/types'

interface ObsPresetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Copy the OBS URL for a preset (same path as the header button). */
  onCopy: (preset: ObsPreset) => void
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--lb-bg-input)',
  border: '1px solid var(--lb-border)',
  borderRadius: '6px',
  padding: '4px 8px',
  color: 'var(--lb-text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  height: '28px',
  width: '100%',
}

const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--lb-text-dim)', fontWeight: 600 }

type FlagKey = 'shadow' | 'anim' | 'title'
type NumKey = 'before' | 'after' | 'size' | 'otherSize'

const FLAG_LABELS: Record<FlagKey, string> = { shadow: '文字陰影', anim: '過渡動畫', title: '顯示歌名' }
const NUM_LABELS: Record<NumKey, string> = { before: '前幾行', after: '後幾行', size: '目前行字級', otherSize: '其他行字級' }

/** Copy of `params` with one key removed (so "沿用" really unsets it instead of storing undefined). */
function without(params: ObsUrlParams, key: keyof ObsUrlParams): ObsUrlParams {
  const next = { ...params }
  delete next[key]
  return next
}

/** Three-state select: 未設定 (undefined) / 開 / 關 */
function FlagSelect({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean | undefined) => void }) {
  return (
    <select
      value={value === undefined ? '' : value ? '1' : '0'}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === '1')}
      style={fieldStyle}
    >
      <option value="">沿用</option>
      <option value="1">開</option>
      <option value="0">關</option>
    </select>
  )
}

function PresetEditor({ preset }: { preset: ObsPreset }) {
  const updateObsPreset = useUISettingsStore((s) => s.updateObsPreset)
  const p = preset.params
  const patch = (next: ObsUrlParams) => updateObsPreset(preset.id, { params: next })
  const setNum = (key: NumKey, raw: string) => {
    const rest = without(p, key)
    if (raw.trim() === '') return patch(rest)
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 0) return
    patch({ ...rest, [key]: n })
  }
  const setFlag = (key: FlagKey, v: boolean | undefined) => {
    const rest = without(p, key)
    patch(v === undefined ? rest : { ...rest, [key]: v })
  }

  return (
    <div
      className="grid border-t border-lb-border"
      style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px', padding: '10px 12px 12px' }}
    >
      <label className="flex flex-col" style={{ gap: '3px' }}>
        <span style={labelStyle}>對齊</span>
        <select
          value={p.align ?? ''}
          onChange={(e) => {
            const rest = without(p, 'align')
            patch(e.target.value ? { ...rest, align: e.target.value as ObsAlign } : rest)
          }}
          style={fieldStyle}
        >
          <option value="">沿用（靠左）</option>
          <option value="left">靠左</option>
          <option value="center">置中</option>
          <option value="right">靠右</option>
        </select>
      </label>
      {(Object.keys(FLAG_LABELS) as FlagKey[]).map((key) => (
        <label key={key} className="flex flex-col" style={{ gap: '3px' }}>
          <span style={labelStyle}>{FLAG_LABELS[key]}</span>
          <FlagSelect value={p[key]} onChange={(v) => setFlag(key, v)} />
        </label>
      ))}
      {(Object.keys(NUM_LABELS) as NumKey[]).map((key) => (
        <label key={key} className="flex flex-col" style={{ gap: '3px' }}>
          <span style={labelStyle}>{NUM_LABELS[key]}</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="沿用"
            value={p[key] ?? ''}
            onChange={(e) => setNum(key, e.target.value)}
            style={fieldStyle}
          />
        </label>
      ))}
      <label className="flex flex-col" style={{ gap: '3px', gridColumn: '1 / -1' }}>
        <span style={labelStyle}>背景色（#hex、顏色名或 rgba()）</span>
        <input
          type="text"
          placeholder="沿用"
          value={p.bg ?? ''}
          onChange={(e) => {
            const rest = without(p, 'bg')
            const v = e.target.value.trim()
            patch(v ? { ...rest, bg: v } : rest)
          }}
          style={fieldStyle}
        />
      </label>
    </div>
  )
}

export function ObsPresetsDialog({ open, onOpenChange, onCopy }: ObsPresetsDialogProps) {
  const { obsPresets, addObsPreset, updateObsPreset, removeObsPreset } = useUISettingsStore(
    useShallow((s) => ({
      obsPresets: s.obsPresets,
      addObsPreset: s.addObsPreset,
      updateObsPreset: s.updateObsPreset,
      removeObsPreset: s.removeObsPreset,
    })),
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleAdd() {
    const name = await promptDialog({ title: '新增 OBS 預設', label: '名稱', placeholder: '例如：直式字幕' })
    if (!name?.trim()) return
    const preset = addObsPreset(name.trim())
    setEditingId(preset.id)
  }

  async function handleRename(preset: ObsPreset) {
    const name = await promptDialog({ title: '重新命名', label: '名稱', defaultValue: preset.name, selectOnOpen: true })
    if (name?.trim()) updateObsPreset(preset.id, { name: name.trim() })
  }

  async function handleDelete(preset: ObsPreset) {
    const ok = await confirmDialog({
      title: `刪除「${preset.name}」？`,
      description: '已貼到 OBS 的網址不受影響。',
      confirmLabel: '刪除',
      destructive: true,
    })
    if (ok) removeObsPreset(preset.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[80dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>OBS 預設組</DialogTitle>
          <DialogDescription className="text-lb-text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>
            每組預設會產生一個帶參數的 OBS 網址，讓同一個 session 的不同瀏覽器來源長得不一樣。留空的欄位沿用控制頁設定。
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex flex-col" style={{ padding: '12px 20px 20px', gap: '8px' }}>
          {obsPresets.map((preset) => {
            const editing = editingId === preset.id
            return (
              <div key={preset.id} className="border border-lb-border rounded-lg bg-lb-bg-card">
                <div className="flex items-center" style={{ gap: '6px', padding: '8px 8px 8px 12px' }}>
                  <div className="flex flex-col min-w-0 flex-1" style={{ gap: '2px' }}>
                    <span className="text-lb-text-primary truncate" style={{ fontSize: '13px', fontWeight: 600 }}>
                      {preset.name}
                    </span>
                    <span className="text-lb-text-dim truncate" style={{ fontSize: '11px' }}>
                      {describeObsParams(preset.params)}
                    </span>
                  </div>
                  <button
                    className={ICON_BTN_CLASS}
                    style={ICON_BTN_STYLE}
                    title="複製此預設的 OBS URL"
                    aria-label="複製此預設的 OBS URL"
                    onClick={() => onCopy(preset)}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className={ICON_BTN_CLASS}
                    style={ICON_BTN_STYLE}
                    title="重新命名"
                    aria-label="重新命名"
                    onClick={() => handleRename(preset)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className={ICON_BTN_CLASS}
                    style={ICON_BTN_STYLE}
                    title="刪除"
                    aria-label="刪除"
                    onClick={() => handleDelete(preset)}
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    className={ICON_BTN_CLASS}
                    style={ICON_BTN_STYLE}
                    title={editing ? '收合' : '編輯參數'}
                    aria-label={editing ? '收合' : '編輯參數'}
                    aria-expanded={editing}
                    onClick={() => setEditingId(editing ? null : preset.id)}
                  >
                    {editing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {editing && <PresetEditor preset={preset} />}
              </div>
            )
          })}
          <button
            onClick={handleAdd}
            className={`${CONTROL_BTN_CLASS} flex items-center justify-center self-start`}
            style={{ ...OFFSET_BTN_STYLE, gap: '4px' }}
          >
            <Plus size={14} />
            新增預設
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
