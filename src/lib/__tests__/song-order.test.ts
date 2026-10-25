import { describe, it, expect } from 'vitest'
import { orderSongs, adjacentSong } from '../song-order'
import type { Song, Folder } from '@/types'

function song(id: number, name: string, folderId: number | null = null): Song {
  return { id, name, lrcText: '', offset: 0, pitch: 0, audioSource: 'youtube', youtubeId: null, audioFileName: null, folderId, createdAt: id, updatedAt: id }
}
function folder(id: number, name: string): Folder {
  return { id, name, createdAt: id, updatedAt: id }
}

const folders = [folder(2, 'B 資料夾'), folder(1, 'A 資料夾')]
const songs = [
  song(10, 'z 未分類'),
  song(11, 'a 未分類'),
  song(12, 'b in A', 1),
  song(13, 'a in A', 1),
  song(14, 'only in B', 2),
  song(15, 'orphan folder', 99),
]

describe('orderSongs', () => {
  it('orders folders A→Z, songs within A→Z, then uncategorized (incl. orphans)', () => {
    expect(orderSongs(songs, folders).map((s) => s.id)).toEqual([13, 12, 14, 11, 15, 10])
  })
})

describe('adjacentSong', () => {
  const ordered = orderSongs(songs, folders)

  it('moves forward and wraps', () => {
    expect(adjacentSong(ordered, 13, 1)?.id).toBe(12)
    expect(adjacentSong(ordered, 10, 1)?.id).toBe(13)
  })

  it('moves backward and wraps', () => {
    expect(adjacentSong(ordered, 12, -1)?.id).toBe(13)
    expect(adjacentSong(ordered, 13, -1)?.id).toBe(10)
  })

  it('with no current song picks first/last', () => {
    expect(adjacentSong(ordered, null, 1)?.id).toBe(13)
    expect(adjacentSong(ordered, null, -1)?.id).toBe(10)
  })

  it('returns null for an empty list', () => {
    expect(adjacentSong([], null, 1)).toBeNull()
  })
})
