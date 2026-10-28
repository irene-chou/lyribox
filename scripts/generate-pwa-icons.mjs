// Generates public/pwa-192.png, public/pwa-512.png and public/apple-touch-icon.png
// without any image dependency: the glyph (same shape as favicon.svg) is rendered
// with signed-distance functions and encoded as PNG via zlib.
//
// Usage: node scripts/generate-pwa-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BG = [0x7c, 0x6a, 0xef] // --lb-accent
const FG = [0xff, 0xff, 0xff]

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeData))
  return Buffer.concat([len, typeData, crc])
}
function encodePNG(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- signed distance helpers (all in icon pixel space) ---
const sdRoundRect = (x, y, cx, cy, half, r) => {
  const qx = Math.abs(x - cx) - half + r
  const qy = Math.abs(y - cy) - half + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
const sdSegment = (x, y, ax, ay, bx, by) => {
  const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay
  const h = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - dx * h, py - dy * h)
}
const sdRing = (x, y, cx, cy, r) => Math.abs(Math.hypot(x - cx, y - cy) - r)

/** Coverage 0..1 from a signed distance, with ~1px anti-aliasing. */
const cover = (d) => Math.min(1, Math.max(0, 0.5 - d))

function render(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4)
  // Glyph is drawn in the favicon's 24-unit box; maskable icons keep the glyph
  // inside the central 80% safe zone.
  const glyphScale = (maskable ? 0.52 : 0.62) * size / 24
  const off = (size - 24 * glyphScale) / 2
  const stroke = 2 * glyphScale
  const u = (v) => off + v * glyphScale
  const strokes = [
    ['seg', 3, 5, 16, 5],
    ['seg', 3, 12, 11, 12],
    ['seg', 3, 19, 11, 19],
    ['seg', 21, 5, 21, 16],
    ['ring', 18, 16, 3],
  ]
  const bgRadius = maskable ? 0 : size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5
      const bgCov = maskable ? 1 : cover(sdRoundRect(px, py, size / 2, size / 2, size / 2, bgRadius))
      let fgD = Infinity
      for (const s of strokes) {
        const d = s[0] === 'seg'
          ? sdSegment(px, py, u(s[1]), u(s[2]), u(s[3]), u(s[4]))
          : sdRing(px, py, u(s[1]), u(s[2]), s[3] * glyphScale)
        fgD = Math.min(fgD, d - stroke / 2)
      }
      const fgCov = cover(fgD) * bgCov
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(BG[c] * (1 - fgCov) + FG[c] * fgCov)
      }
      rgba[i + 3] = Math.round(bgCov * 255)
    }
  }
  return encodePNG(size, rgba)
}

const out = resolve(ROOT, 'public')
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'pwa-192.png'), render(192, { maskable: false }))
writeFileSync(resolve(out, 'pwa-512.png'), render(512, { maskable: false }))
writeFileSync(resolve(out, 'pwa-maskable-512.png'), render(512, { maskable: true }))
writeFileSync(resolve(out, 'apple-touch-icon.png'), render(180, { maskable: true }))
console.log('icons written to public/')
