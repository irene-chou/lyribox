import { describe, it, expect, afterEach, vi } from 'vitest'
import { searchLyrics } from '../lrclib'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchLyrics', () => {
  it('queries lrclib with the encoded query and returns the JSON body', async () => {
    const results = [{ id: 1, trackName: 'Song', artistName: 'A', syncedLyrics: '[00:01.00]x' }]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(results) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchLyrics('夜に駆ける YOASOBI')).resolves.toEqual(results)
    expect(fetchMock).toHaveBeenCalledWith(
      `https://lrclib.net/api/search?q=${encodeURIComponent('夜に駆ける YOASOBI')}`,
    )
  })

  it('throws with the HTTP status when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(searchLyrics('x')).rejects.toThrow('搜尋失敗 (503)')
  })
})
