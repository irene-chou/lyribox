import type { Song, Folder } from '@/types'

/** Shape of the exported library (same as the JSON export file). */
export interface LibraryExport {
  songs: Song[]
  folders: Folder[]
}

export const GIST_FILENAME = 'lyribox-library.json'
const GIST_API = 'https://api.github.com/gists'

export class GistError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GistError'
    this.status = status
  }
}

/** zh-TW message for a failed backup / restore. */
export function gistErrorMessage(err: unknown): string {
  if (err instanceof GistError) {
    if (err.status === 401) return 'Token 無效'
    if (err.status === 404) return '找不到 Gist'
    if (err.status === 403) return 'Token 權限不足或已達 API 上限'
    return `GitHub 回應錯誤（${err.status}）`
  }
  if (err instanceof TypeError) return '無法連線到 GitHub'
  return err instanceof Error ? err.message : '未知錯誤'
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function request(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...headers(token), ...(init.headers ?? {}) } })
  if (!res.ok) throw new GistError(res.status, `GitHub API ${res.status}`)
  return res
}

/**
 * Create a private gist (when `gistId` is null) or update the existing one with
 * the given JSON content. Resolves to the gist id to persist for later runs.
 */
export async function createOrUpdateBackup(token: string, gistId: string | null, json: string): Promise<string> {
  const body = JSON.stringify({
    description: 'Lyribox 歌庫備份',
    public: false,
    files: { [GIST_FILENAME]: { content: json } },
  })
  const res = gistId
    ? await request(token, `${GIST_API}/${encodeURIComponent(gistId)}`, { method: 'PATCH', body })
    : await request(token, GIST_API, { method: 'POST', body })
  const data = (await res.json()) as { id?: string }
  if (!data.id) throw new GistError(res.status, 'GitHub 未回傳 Gist id')
  return data.id
}

/** Fetch and parse the backup JSON stored in the gist. */
export async function fetchBackup(token: string, gistId: string): Promise<unknown> {
  const res = await request(token, `${GIST_API}/${encodeURIComponent(gistId)}`)
  const data = (await res.json()) as {
    files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>
  }
  const file = data.files?.[GIST_FILENAME]
  if (!file) throw new GistError(404, 'Gist 內沒有備份檔')

  let text = file.content ?? ''
  if (file.truncated && file.raw_url) {
    // Files over ~1MB come back truncated; fetch the raw content instead.
    text = await (await request(token, file.raw_url)).text()
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('備份檔不是有效的 JSON')
  }
}

function mergeById<T extends { id: number; updatedAt: number }>(local: T[], remote: T[]): T[] {
  const byId = new Map<number, T>()
  for (const item of local) byId.set(item.id, item)
  for (const item of remote) {
    const existing = byId.get(item.id)
    if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item)
  }
  return [...byId.values()]
}

/**
 * Merge two libraries by id. For an id present on both sides the entry with
 * the newer `updatedAt` wins; entries present on one side only are kept.
 */
export function mergeLibraries(local: LibraryExport, remote: LibraryExport): LibraryExport {
  return {
    songs: mergeById(local.songs, remote.songs),
    folders: mergeById(local.folders, remote.folders),
  }
}
