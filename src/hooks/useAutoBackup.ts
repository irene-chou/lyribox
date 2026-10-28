import { useEffect, useRef } from 'react'
import { useSongs, useFolders } from '@/hooks/useSongLibrary'
import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { backupNow } from '@/lib/cloud-backup'

const AUTO_BACKUP_DELAY_MS = 30_000

/**
 * When auto-backup is on, push the library to the gist 30s after the last
 * change to songs or folders (any save, delete, move or import). The initial
 * live-query load does not count as a change.
 */
export function useAutoBackup() {
  const autoBackup = useUISettingsStore((s) => s.autoBackup)
  const songs = useSongs()
  const folders = useFolders()
  const seenInitial = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (songs === undefined || folders === undefined) return
    if (!seenInitial.current) {
      seenInitial.current = true
      return
    }
    if (!autoBackup) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void backupNow({ silent: true })
    }, AUTO_BACKUP_DELAY_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [songs, folders, autoBackup])
}
