import { useUISettingsStore } from '@/stores/useUISettingsStore'
import { toast } from '@/stores/useToastStore'
import { getLibrarySnapshot, importLibrary } from '@/lib/song-service'
import {
  createOrUpdateBackup,
  fetchBackup,
  mergeLibraries,
  gistErrorMessage,
  type LibraryExport,
} from '@/lib/gist-backup'

const TOKEN_KEY = 'lb-gist-token'

/** The PAT lives in its own localStorage key, never inside the persisted settings store. */
export function getGistToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setGistToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable (private mode); the token simply won't persist.
  }
}

let inFlight: Promise<boolean> | null = null

/**
 * Push the current library to the gist. Resolves true on success.
 * `silent` suppresses the success toast (used by auto-backup); errors always toast.
 */
export function backupNow(options: { silent?: boolean } = {}): Promise<boolean> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    const token = getGistToken()
    if (!token) {
      if (!options.silent) toast.error('請先填入 GitHub Token')
      return false
    }
    const store = useUISettingsStore.getState()
    try {
      const snapshot = await getLibrarySnapshot()
      const id = await createOrUpdateBackup(token, store.gistId, JSON.stringify(snapshot))
      if (id !== store.gistId) store.setGistId(id)
      store.setLastBackupAt(Date.now())
      if (!options.silent) toast.success(`已備份 ${snapshot.songs.length} 首歌曲到 Gist`)
      return true
    } catch (err) {
      toast.error(`備份失敗：${gistErrorMessage(err)}`)
      return false
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

function asLibrary(parsed: unknown): LibraryExport {
  if (Array.isArray(parsed)) return { songs: parsed as LibraryExport['songs'], folders: [] }
  if (typeof parsed === 'object' && parsed !== null) {
    const p = parsed as Partial<LibraryExport>
    return { songs: Array.isArray(p.songs) ? p.songs : [], folders: Array.isArray(p.folders) ? p.folders : [] }
  }
  return { songs: [], folders: [] }
}

/**
 * Pull the gist, merge it with the local library (newer `updatedAt` wins) and
 * write the result through the usual import validation. Resolves true on success.
 */
export async function restoreFromCloud(): Promise<boolean> {
  const token = getGistToken()
  const { gistId } = useUISettingsStore.getState()
  if (!token) {
    toast.error('請先填入 GitHub Token')
    return false
  }
  if (!gistId) {
    toast.error('尚未有備份，請先執行「立即備份」')
    return false
  }
  try {
    const remote = asLibrary(await fetchBackup(token, gistId))
    const local = await getLibrarySnapshot()
    const merged = mergeLibraries(local, remote)
    const written = await importLibrary(merged)
    const added = merged.songs.length - local.songs.length
    toast.success(added > 0 ? `已還原，新增 ${added} 首歌曲（共 ${written} 首）` : `已還原，共 ${written} 首歌曲`)
    return true
  } catch (err) {
    toast.error(`還原失敗：${gistErrorMessage(err)}`)
    return false
  }
}
