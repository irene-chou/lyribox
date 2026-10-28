import { describe, it, expect } from 'vitest'
import {
  addToPlaylist,
  removeFromPlaylist,
  togglePlaylist,
  movePlaylistItem,
  nextInPlaylist,
  nextInPlaylistNoWrap,
  pruneMissing,
  resolvePlaylist,
  playlistPosition,
} from '../playlist'

describe('playlist helpers', () => {
  describe('addToPlaylist / removeFromPlaylist / togglePlaylist', () => {
    it('appends new ids and ignores duplicates', () => {
      expect(addToPlaylist([], 1)).toEqual([1])
      expect(addToPlaylist([1, 2], 3)).toEqual([1, 2, 3])
      const ids = [1, 2]
      expect(addToPlaylist(ids, 2)).toBe(ids)
    })

    it('removes an id and returns the same array when absent', () => {
      expect(removeFromPlaylist([1, 2, 3], 2)).toEqual([1, 3])
      const ids = [1, 2]
      expect(removeFromPlaylist(ids, 9)).toBe(ids)
    })

    it('toggles membership', () => {
      expect(togglePlaylist([1], 2)).toEqual([1, 2])
      expect(togglePlaylist([1, 2], 2)).toEqual([1])
    })
  })

  describe('movePlaylistItem', () => {
    it('moves an item forward and backward', () => {
      expect(movePlaylistItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4])
      expect(movePlaylistItem([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3])
    })

    it('clamps out-of-range indices', () => {
      expect(movePlaylistItem([1, 2, 3], 0, 99)).toEqual([2, 3, 1])
      expect(movePlaylistItem([1, 2, 3], -5, 1)).toEqual([2, 1, 3])
    })

    it('returns the same array when nothing moves', () => {
      const ids = [1, 2, 3]
      expect(movePlaylistItem(ids, 1, 1)).toBe(ids)
      expect(movePlaylistItem([], 0, 1)).toEqual([])
    })
  })

  describe('nextInPlaylist', () => {
    it('returns null for an empty playlist', () => {
      expect(nextInPlaylist([], 1, 1)).toBeNull()
    })

    it('wraps around in both directions', () => {
      expect(nextInPlaylist([1, 2, 3], 3, 1)).toBe(1)
      expect(nextInPlaylist([1, 2, 3], 1, -1)).toBe(3)
      expect(nextInPlaylist([1, 2, 3], 2, 1)).toBe(3)
    })

    it('starts from the first/last entry when current is missing', () => {
      expect(nextInPlaylist([1, 2, 3], null, 1)).toBe(1)
      expect(nextInPlaylist([1, 2, 3], null, -1)).toBe(3)
      expect(nextInPlaylist([1, 2, 3], 42, 1)).toBe(1)
    })
  })

  describe('nextInPlaylistNoWrap', () => {
    it('returns the following id or null at the end', () => {
      expect(nextInPlaylistNoWrap([1, 2, 3], 1)).toBe(2)
      expect(nextInPlaylistNoWrap([1, 2, 3], 3)).toBeNull()
      expect(nextInPlaylistNoWrap([1, 2, 3], null)).toBeNull()
      expect(nextInPlaylistNoWrap([1, 2, 3], 9)).toBeNull()
    })
  })

  describe('pruneMissing / resolvePlaylist', () => {
    const songs = [{ id: 1 }, { id: 3 }]

    it('drops ids of deleted songs and keeps order', () => {
      expect(pruneMissing([3, 2, 1], songs)).toEqual([3, 1])
      const ids = [1, 3]
      expect(pruneMissing(ids, songs)).toBe(ids)
    })

    it('resolves ids to songs in playlist order, skipping missing', () => {
      expect(resolvePlaylist([3, 2, 1], songs)).toEqual([{ id: 3 }, { id: 1 }])
    })
  })

  describe('playlistPosition', () => {
    it('returns the 1-based position or null', () => {
      expect(playlistPosition([5, 6, 7], 6)).toBe(2)
      expect(playlistPosition([5, 6, 7], 8)).toBeNull()
      expect(playlistPosition([5, 6, 7], null)).toBeNull()
    })
  })
})
