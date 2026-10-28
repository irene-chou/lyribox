import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createOrUpdateBackup,
  fetchBackup,
  mergeLibraries,
  gistErrorMessage,
  GistError,
  GIST_FILENAME,
  type LibraryExport,
} from '../gist-backup'
import type { Song, Folder } from '@/types'

function song(id: number, updatedAt: number, name = `song-${id}`): Song {
  return {
    id,
    name,
    lrcText: '',
    offset: 0,
    pitch: 0,
  vocalRemoval: false,
    audioSource: 'youtube',
    youtubeId: null,
    audioFileName: null,
    folderId: null,
    createdAt: 1,
    updatedAt,
  }
}

function folder(id: number, updatedAt: number, name = `folder-${id}`): Folder {
  return { id, name, createdAt: 1, updatedAt }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('mergeLibraries', () => {
  it('keeps entries that exist on only one side', () => {
    const local: LibraryExport = { songs: [song(1, 10)], folders: [] }
    const remote: LibraryExport = { songs: [song(2, 10)], folders: [folder(9, 5)] }
    const merged = mergeLibraries(local, remote)
    expect(merged.songs.map((s) => s.id).sort()).toEqual([1, 2])
    expect(merged.folders.map((f) => f.id)).toEqual([9])
  })

  it('takes the newer updatedAt when both sides have the same id', () => {
    const local: LibraryExport = { songs: [song(1, 10, 'old'), song(2, 50, 'local-newer')], folders: [folder(1, 1, 'a')] }
    const remote: LibraryExport = { songs: [song(1, 20, 'remote-newer'), song(2, 40, 'stale')], folders: [folder(1, 2, 'b')] }
    const merged = mergeLibraries(local, remote)
    const byId = Object.fromEntries(merged.songs.map((s) => [s.id, s.name]))
    expect(byId).toEqual({ 1: 'remote-newer', 2: 'local-newer' })
    expect(merged.folders[0].name).toBe('b')
  })

  it('keeps the local entry on an exact updatedAt tie', () => {
    const merged = mergeLibraries(
      { songs: [song(1, 10, 'local')], folders: [] },
      { songs: [song(1, 10, 'remote')], folders: [] },
    )
    expect(merged.songs[0].name).toBe('local')
  })
})

describe('GitHub requests', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs a new private gist when no gist id is known', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'abc123' }))
    const id = await createOrUpdateBackup('tok', null, '{"songs":[]}')
    expect(id).toBe('abc123')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.github.com/gists')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect((init.headers as Record<string, string>).Accept).toBe('application/vnd.github+json')
    const body = JSON.parse(init.body as string)
    expect(body.public).toBe(false)
    expect(body.files[GIST_FILENAME].content).toBe('{"songs":[]}')
  })

  it('PATCHes the existing gist when a gist id is known', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'abc123' }))
    await createOrUpdateBackup('tok', 'abc123', '{}')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.github.com/gists/abc123')
    expect(init.method).toBe('PATCH')
  })

  it('throws GistError with the HTTP status on failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Bad credentials' }, 401))
    await expect(createOrUpdateBackup('bad', null, '{}')).rejects.toBeInstanceOf(GistError)
    await expect(createOrUpdateBackup('bad', null, '{}')).rejects.toMatchObject({ status: 401 })
  })

  it('fetchBackup parses the backup file content', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ files: { [GIST_FILENAME]: { content: '{"songs":[],"folders":[]}', truncated: false } } }),
    )
    await expect(fetchBackup('tok', 'abc')).resolves.toEqual({ songs: [], folders: [] })
  })

  it('fetchBackup falls back to raw_url when the file is truncated', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ files: { [GIST_FILENAME]: { content: '{"son', truncated: true, raw_url: 'https://raw/x' } } }),
      )
      .mockResolvedValueOnce(new Response('{"songs":[1]}', { status: 200 }))
    await expect(fetchBackup('tok', 'abc')).resolves.toEqual({ songs: [1] })
    expect(fetchMock.mock.calls[1][0]).toBe('https://raw/x')
  })

  it('fetchBackup rejects when the gist has no backup file', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ files: { 'other.txt': { content: 'x' } } }))
    await expect(fetchBackup('tok', 'abc')).rejects.toMatchObject({ status: 404 })
  })
})

describe('gistErrorMessage', () => {
  it('maps common statuses to zh-TW messages', () => {
    expect(gistErrorMessage(new GistError(401, 'x'))).toBe('Token 無效')
    expect(gistErrorMessage(new GistError(404, 'x'))).toBe('找不到 Gist')
    expect(gistErrorMessage(new TypeError('Failed to fetch'))).toBe('無法連線到 GitHub')
  })
})
