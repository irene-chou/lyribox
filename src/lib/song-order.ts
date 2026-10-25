import type { Song, Folder } from '@/types'

const collator = new Intl.Collator('zh-TW')

/**
 * Flatten songs into the order shown in the library drawer:
 * folders (A→Z) with their songs (A→Z), then uncategorized songs (A→Z).
 */
export function orderSongs(songs: Song[], folders: Folder[]): Song[] {
  const sortedFolders = [...folders].sort((a, b) => collator.compare(a.name, b.name))
  const byName = (a: Song, b: Song) => collator.compare(a.name, b.name)
  const folderIds = new Set(sortedFolders.map((f) => f.id))

  const result: Song[] = []
  for (const folder of sortedFolders) {
    result.push(...songs.filter((s) => s.folderId === folder.id).sort(byName))
  }
  result.push(
    ...songs.filter((s) => s.folderId === null || s.folderId === undefined || !folderIds.has(s.folderId)).sort(byName),
  )
  return result
}

/**
 * Pick the previous/next song relative to `currentId`, wrapping around.
 * With no current song, returns the first (next) or last (prev) song.
 */
export function adjacentSong(ordered: Song[], currentId: number | null, direction: 1 | -1): Song | null {
  if (ordered.length === 0) return null
  const idx = currentId === null ? -1 : ordered.findIndex((s) => s.id === currentId)
  if (idx === -1) return direction === 1 ? ordered[0] : ordered[ordered.length - 1]
  const next = (idx + direction + ordered.length) % ordered.length
  return ordered[next]
}
