// Generates icon-192.png and icon-512.png — navy field, red rounded "A" tile.
// Pure Node (zlib) PNG encoder so we need no image deps. Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// ---- color helpers ----
const NAVY = [26, 39, 54]
const RED = [213, 23, 42]
const WHITE = [255, 255, 255]

// CRC32 (for PNG chunks)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// rounded-rect signed test
function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

// distance from point to line segment
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const qx = ax + t * dx
  const qy = ay + t * dy
  return Math.hypot(px - qx, py - qy)
}

function buildA(S) {
  // Clean even-width "A": two diagonal strokes from the apex plus a crossbar.
  const cx = S / 2
  const apexX = cx
  const apexY = S * 0.3
  const botY = S * 0.72
  const lbx = S * 0.33
  const rbx = S * 0.67
  const half = S * 0.05 // half stroke width
  const barY = S * 0.575
  const bar = { x: S * 0.405, y: barY - half * 0.85, w: S * 0.19, h: half * 1.7 }
  return (px, py) => {
    if (py < apexY - half || py > botY + half) return false
    if (distToSeg(px, py, apexX, apexY, lbx, botY) <= half) return true
    if (distToSeg(px, py, apexX, apexY, rbx, botY) <= half) return true
    if (px >= bar.x && px <= bar.x + bar.w && py >= bar.y && py <= bar.y + bar.h) return true
    return false
  }
}

function render(S) {
  const tile = { x: S * 0.16, y: S * 0.16, w: S * 0.68, h: S * 0.68, r: S * 0.18 }
  const isA = buildA(S)
  // raw image: each row prefixed with filter byte 0, RGB
  const row = S * 3 + 1
  const raw = Buffer.alloc(row * S)
  for (let y = 0; y < S; y++) {
    raw[y * row] = 0
    for (let x = 0; x < S; x++) {
      let col = NAVY
      if (inRoundRect(x, y, tile.x, tile.y, tile.w, tile.h, tile.r)) col = RED
      if (isA(x, y)) col = WHITE
      const o = y * row + 1 + x * 3
      raw[o] = col[0]
      raw[o + 1] = col[1]
      raw[o + 2] = col[2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(S, 0)
  ihdr.writeUInt32BE(S, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

for (const size of [192, 512]) {
  const out = resolve(here, `../public/icon-${size}.png`)
  writeFileSync(out, render(size))
  console.log('Wrote', out)
}
