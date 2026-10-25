import { useRef } from 'react'
import { MoreVertical, Download, Upload } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportSongs, importSongs } from '@/hooks/useSongLibrary'
import { toast } from '@/stores/useToastStore'
import { ICON_BTN_CLASS, ICON_BTN_STYLE } from '@/lib/constants'

export function SongDrawerMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    await exportSongs()
    toast.success('已匯出歌曲庫')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const count = await importSongs(file)
      toast.success(`成功匯入 ${count} 首歌曲`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '檔案格式無效'
      toast.error(`匯入失敗：${msg}`)
    }
    e.target.value = ''
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={ICON_BTN_CLASS} style={{ ...ICON_BTN_STYLE, width: '32px', height: '32px' }} title="更多" aria-label="更多選項">
            <MoreVertical size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-lb-bg-card border border-lb-border">
          <DropdownMenuItem onClick={handleExport} className="cursor-pointer text-sm text-lb-text-primary">
            <Download size={14} className="mr-2" />
            匯出歌曲庫
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-sm text-lb-text-primary">
            <Upload size={14} className="mr-2" />
            匯入歌曲庫
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
    </>
  )
}
