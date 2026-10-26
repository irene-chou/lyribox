import type { Song } from '@/types'

/**
 * Pure helpers for the ordered playlist (array of song ids). The playlist
 * never contains duplicates; the UI stores it in `useUISettingsStore`.
 */

export function addToPlaylist(ids: number[], songId: number): number[] {
  if (ids.includes(songId)) return ids
  return [...ids, songId]
}

export function removeFromPlaylist(ids: number[], songId: number): number[] {
  if (!ids.includes(songId)) return ids
  return ids.filter((id) => id !== songId)
}

export function togglePlaylist(ids: number[], songId: number): number[] {
  return ids.includes(songId) ? removeFromPlaylist(ids, songId) : addToPlaylist(ids, songId)
}

/** Move the item at `from` to position `to` (both clamped to the array). */
export function movePlaylistItem(ids: number[], from: number, to: number): number[] {
  if (ids.length === 0) return ids
  const clamp = (n: number) => Math.max(0, Math.min(ids.length - 1, n))
  const f = clamp(from)
  const t = clamp(to)
  if (f === t) return ids
  const next = [...ids]
  const [item] = next.splice(f, 1)
  next.splice(t, 0, item)
  return next
}

/**
 * Next (+1) / previous (-1) song id in playlist order, wrapping around.
 * With no current song (or one not in the playlist), returns the first
 * (next) or last (prev) entry. Returns null for an empty playlist.
 */
export function nextInPlaylist(ids: number[], currentId: number | null, direction: 1 | -1): number | null {
  if (ids.length === 0) return null
  const idx = currentId === null ? -1 : ids.indexOf(currentId)
  if (idx === -1) return direction === 1 ? ids[0] : ids[ids.length - 1]
  return ids[(idx + direction + ids.length) % ids.length]
}

/**
 * Like {@link nextInPlaylist} but without wrapping: returns null at the end
 * (used by auto-next so the last song does not loop back to the first).
 */
export function nextInPlaylistNoWrap(ids: number[], currentId: number | null): number | null {
  if (ids.length === 0 || currentId === null) return null
  const idx = ids.indexOf(currentId)
  if (idx === -1 || idx === ids.length - 1) return null
  return ids[idx + 1]
}

/** Drop ids whose song no longer exists (deleted songs). */
export function pruneMissing(ids: number[], songs: Pick<Song, 'id'>[]): number[] {
  const existing = new Set(songs.map((s) => s.id))
  const pruned = ids.filter((id) => existing.has(id))
  return pruned.length === ids.length ? ids : pruned
}

/** Resolve playlist ids to songs, skipping missing ones, preserving order. */
export function resolvePlaylist<T extends Pick<Song, 'id'>>(ids: number[], songs: T[]): T[] {
  const byId = new Map(songs.map((s) => [s.id, s]))
  const out: T[] = []
  for (const id of ids) {
    const song = byId.get(id)
    if (song) out.push(song)
  }
  return out
}

/** 1-based position of `songId` in the playlist, or null when absent. */
export function playlistPosition(ids: number[], songId: number | null): number | null {
  if (songId === null) return null
  const idx = ids.indexOf(songId)
  return idx === -1 ? null : idx + 1
}
