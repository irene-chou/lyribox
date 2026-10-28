import Dexie, { type EntityTable } from 'dexie'
import type { Song, Folder, AudioFileRecord } from '@/types'

const db = new Dexie('lyribox-db') as Dexie & {
  songs: EntityTable<Song, 'id'>
  folders: EntityTable<Folder, 'id'>
  audioFiles: EntityTable<AudioFileRecord, 'songId'>
}

db.version(1).stores({
  songs: 'id',
})

db.version(2).stores({
  songs: 'id',
}).upgrade(tx => {
  return tx.table('songs').toCollection().modify(song => {
    if (song.pitch === undefined) {
      song.pitch = 0
    }
  })
})

db.version(3).stores({
  songs: 'id',
  folders: 'id',
}).upgrade(tx => {
  return tx.table('songs').toCollection().modify(song => {
    if (song.folderId === undefined) {
      song.folderId = null
    }
  })
})

// Audio blobs live in their own table so song-list live queries never load them.
db.version(4).stores({
  songs: 'id',
  folders: 'id',
  audioFiles: 'songId',
})

db.version(5).stores({
  songs: 'id',
  folders: 'id',
  audioFiles: 'songId',
}).upgrade(tx => {
  return tx.table('songs').toCollection().modify(song => {
    if (song.vocalRemoval === undefined) {
      song.vocalRemoval = false
    }
  })
})

export { db }
