// news-image-20261122 — "Sunday 22 November 2026 in one image"
// A dense newspaper front page, drawn entirely in code: no network, no
// assets, no timestamps. Renders one deterministic 1024x1024 PNG to
// $MAKEFUN_OUTPUT_DIR/entry.png (Node 22 stdlib only).
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- font
// Hand-drawn 5x7 bitmap font. Each glyph is 7 rows of 5 cells ('#' = ink).
// Uppercase, lowercase, digits and punctuation; every story is written
// in plain ASCII so this set covers all text on the page.
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
};

Object.assign(FONT, {
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".###."],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".####", "#....", "#....", "#....", ".####"],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#...", ".#...", "####.", ".#...", ".#...", ".#..."],
  g: [".....", ".....", ".####", "#...#", "#...#", ".####", "...#."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: [".....", "..#..", ".....", ".##..", "..#..", "..#..", ".###."],
  j: [".....", "...#.", ".....", "..##.", "...#.", "...#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#...."],
  q: [".....", ".....", ".####", "#...#", "#...#", ".####", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#...", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".####"],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", "#...#", ".####", "...#."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
  $: ["..#..", ".####", "#.#.#", ".###.", "..#.#", "####.", "..#.."],
  "&": [".##..", "#..#.", "#..#.", ".#...", "#.#.#", "#..#.", ".##.#"],
  "*": [".....", ".#.#.", "..#..", "#####", "..#..", ".#.#.", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  "|": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "·": [".....", ".....", ".....", ".##..", ".....", ".....", "....."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
});

// ---------------------------------------------------------------- canvas
type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 232];
const INK: RGB = [20, 20, 20];
const RED: RGB = [179, 32, 44];
const NAVY: RGB = [22, 35, 63];
const TEAL: RGB = [14, 107, 107];
const GOLD: RGB = [176, 128, 0];
const PURPLE: RGB = [91, 62, 138];
const GREEN: RGB = [46, 107, 52];
const ORANGE: RGB = [194, 94, 30];
const LIGHT: RGB = [233, 228, 214];
const WHITE: RGB = [255, 255, 255];

const buf = Buffer.alloc(W * H * 3);
function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; i += 3;
    }
  }
}
function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, t, h, c);
}
function rectBorder(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let n = 0; n < 4000; n++) {
    fillRect(x, y, t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = -r; yy <= r; yy++) {
    const half = Math.floor(Math.sqrt(r * r - yy * yy));
    for (let xx = -half; xx <= half; xx++) px(cx + xx, cy + yy, c);
  }
}
function circleOutline(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

// ---------------------------------------------------------------- text
function boldOff(scale: number): number { return scale >= 4 ? 2 : 1; }
function charW(scale: number, bold = false): number {
  return 5 * scale + 1 + (bold ? boldOff(scale) : 0);
}
function textW(s: string, scale: number, bold = false): number {
  return s.length === 0 ? 0 : s.length * charW(scale, bold) - 1;
}
function drawChar(ch: string, x: number, y: number, scale: number, c: RGB, bold: boolean): void {
  const g = FONT[ch] ?? FONT["?"] ?? FONT[" "];
  const off = bold ? boldOff(scale) : 0;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "#") {
        fillRect(x + col * scale, y + r * scale, scale, scale, c);
        if (off > 0) fillRect(x + col * scale + off, y + r * scale, scale, scale, c);
      }
    }
  }
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB, bold = false): void {
  let cx = x;
  for (const ch of s) {
    drawChar(ch, cx, y, scale, c, bold);
    cx += charW(scale, bold);
  }
}
function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB, bold = false): void {
  drawText(s, cx - Math.floor(textW(s, scale, bold) / 2), y, scale, c, bold);
}
// Word-wrap to lines of at most maxChars characters; returns the lines.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") { cur = w; continue; }
    if (cur.length + 1 + w.length <= maxChars) { cur += " " + w; }
    else { lines.push(cur); cur = w; }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawPara(s: string, x: number, y: number, maxPx: number, scale: number, c: RGB, leading = 2): number {
  const maxChars = Math.max(1, Math.floor((maxPx + 1) / charW(scale)));
  const lines = wrap(s, maxChars);
  lines.forEach((ln, i) => drawText(ln, x, y + i * (7 * scale + leading), scale, c));
  return y + lines.length * (7 * scale + leading);
}

// ---------------------------------------------------------------- png
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- pictograms
// Small original scenes drawn with the canvas primitives above. Each draws
// inside the box (x, y, w, h); the caller paints the background first.
function burst(x: number, y: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 30) {
    const t = (a * Math.PI) / 180;
    line(x, y, Math.round(x + r * Math.cos(t)), Math.round(y + r * Math.sin(t)), c, 2);
  }
  circle(x, y, Math.max(2, Math.floor(r / 3)), c);
}
function picGlobe(x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w * 0.3), cy = y + Math.floor(h * 0.52), r = Math.floor(h * 0.36);
  circle(cx, cy, r, [44, 110, 160]);
  circleOutline(cx, cy, r, NAVY);
  vline(cx, cy - r, 2 * r, WHITE, 1);
  hline(cx - r, cy, 2 * r, WHITE, 1);
  circle(cx - Math.floor(r * 0.4), cy - Math.floor(r * 0.3), Math.floor(r * 0.28), GREEN);
  circle(cx + Math.floor(r * 0.45), cy + Math.floor(r * 0.35), Math.floor(r * 0.22), GREEN);
  // thermometer
  const tx = x + Math.floor(w * 0.62), ty = y + Math.floor(h * 0.16);
  fillRect(tx, ty, 8, Math.floor(h * 0.5), WHITE);
  rectBorder(tx, ty, 8, Math.floor(h * 0.5), INK, 1);
  fillRect(tx + 2, ty + Math.floor(h * 0.22), 4, Math.floor(h * 0.28), RED);
  circle(tx + 4, ty + Math.floor(h * 0.55), 7, RED);
  circleOutline(tx + 4, ty + Math.floor(h * 0.55), 7, INK);
  // clock
  const kx = x + Math.floor(w * 0.85), ky = y + Math.floor(h * 0.5), kr = Math.floor(h * 0.26);
  circle(kx, ky, kr, WHITE);
  circleOutline(kx, ky, kr, INK);
  line(kx, ky, kx, ky - kr + 3, INK, 2);
  line(kx, ky, kx + kr - 5, ky + 3, INK, 2);
}
function picNight(x: number, y: number, w: number, h: number, blasts: number): void {
  // dark sky, skyline, missile arcs, starbursts
  const base = y + h;
  const heights = [0.42, 0.6, 0.34, 0.52, 0.46, 0.66, 0.38, 0.56];
  for (let i = 0; i < 8; i++) {
    const bw = Math.floor(w / 8);
    const bh = Math.floor(h * heights[i]);
    fillRect(x + i * bw, base - bh, bw - 1, bh, [16, 22, 40]);
    for (let wy = base - bh + 4; wy < base - 4; wy += 9) {
      for (let wx = x + i * bw + 3; wx < x + (i + 1) * bw - 3; wx += 7) {
        if ((wx * 7 + wy * 13) % 23 < 6) px(wx, wy, [255, 214, 110]);
      }
    }
  }
  // missile arcs: dotted curves from left to right
  for (let k = 0; k < 2; k++) {
    const y0 = y + Math.floor(h * (0.22 + k * 0.16));
    const y1 = y + Math.floor(h * (0.1 + k * 0.12));
    for (let t = 0; t <= 20; t++) {
      const fx = t / 20;
      const px2 = x + Math.floor(fx * w * 0.9);
      const py2 = Math.floor(y0 + (y1 - y0) * fx - Math.sin(fx * Math.PI) * h * 0.18);
      circle(px2, py2, 1, [255, 230, 140]);
    }
  }
  for (let b = 0; b < blasts; b++) {
    const bx = x + Math.floor(w * (0.3 + b * 0.4));
    const by = y + Math.floor(h * (0.18 + (b % 2) * 0.14));
    burst(bx, by, Math.floor(h * 0.16), [255, 176, 66]);
    circle(bx, by, 3, [255, 240, 180]);
  }
}
function picShip(x: number, y: number, w: number, h: number): void {
  const seaY = y + Math.floor(h * 0.62);
  fillRect(x, seaY, w, h - Math.floor(h * 0.62), [32, 96, 140]);
  for (let i = 0; i < 3; i++) {
    hline(x + 4 + i * 3, seaY + 6 + i * 7, w - 8 - i * 6, [140, 190, 220], 1);
  }
  const hx = x + Math.floor(w * 0.14), hy = y + Math.floor(h * 0.4);
  fillRect(hx, hy, Math.floor(w * 0.68), Math.floor(h * 0.22), [30, 30, 34]);
  fillRect(hx + 6, hy - Math.floor(h * 0.16), 10, Math.floor(h * 0.16), RED);
  fillRect(hx + 20, hy - Math.floor(h * 0.16), 10, Math.floor(h * 0.16), GOLD);
  fillRect(hx + 34, hy - Math.floor(h * 0.16), 10, Math.floor(h * 0.16), TEAL);
  vline(hx + Math.floor(w * 0.6), hy - Math.floor(h * 0.34), Math.floor(h * 0.34), INK, 2);
  // drone above, dashed trail
  const dx = x + Math.floor(w * 0.8), dy = y + Math.floor(h * 0.16);
  circle(dx, dy, 3, INK);
  for (let i = 0; i < 5; i++) circle(dx - 8 - i * 7, dy + 4 + i * 3, 1, INK);
}
function picBallot(x: number, y: number, w: number, h: number): void {
  const bx = x + Math.floor(w * 0.22), by = y + Math.floor(h * 0.36);
  fillRect(bx, by, Math.floor(w * 0.56), Math.floor(h * 0.5), [70, 70, 78]);
  fillRect(bx + 4, by - Math.floor(h * 0.28), Math.floor(w * 0.34), Math.floor(h * 0.3), WHITE);
  rectBorder(bx + 4, by - Math.floor(h * 0.28), Math.floor(w * 0.34), Math.floor(h * 0.3), INK, 1);
  line(bx + 6, by - Math.floor(h * 0.13), bx + 12, by - Math.floor(h * 0.05), GREEN, 3);
  line(bx + 12, by - Math.floor(h * 0.05), bx + 24, by - Math.floor(h * 0.28), GREEN, 3);
  drawText("VOTE", bx + 2, by + Math.floor(h * 0.12), 1, WHITE, true);
}
function picQuake(x: number, y: number, w: number, h: number): void {
  const gy = y + Math.floor(h * 0.68);
  fillRect(x, gy, w, h - Math.floor(h * 0.68), [150, 110, 70]);
  // seismograph zigzag
  let lx = x + 4, ly = y + Math.floor(h * 0.3);
  const pts: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    pts.push([lx + i * Math.floor((w - 8) / 12), ly + (i % 2 === 0 ? -Math.floor(h * 0.14) : Math.floor(h * 0.14))]);
  }
  for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], RED, 2);
  // small house, cracked
  const hx = x + Math.floor(w * 0.62), hy = gy - Math.floor(h * 0.26);
  fillRect(hx, hy, Math.floor(w * 0.24), Math.floor(h * 0.26), WHITE);
  rectBorder(hx, hy, Math.floor(w * 0.24), Math.floor(h * 0.26), INK, 1);
  line(hx - 2, hy, hx + Math.floor(w * 0.12), hy - Math.floor(h * 0.14), RED, 2);
  line(hx + Math.floor(w * 0.12), hy - Math.floor(h * 0.14), hx + Math.floor(w * 0.24) + 2, hy, RED, 2);
  line(hx + Math.floor(w * 0.1), hy + 2, hx + Math.floor(w * 0.14), hy + Math.floor(h * 0.12), INK, 1);
}
function picParliament(x: number, y: number, w: number, h: number): void {
  const bx = x + Math.floor(w * 0.18), bw = Math.floor(w * 0.64);
  const ty = y + Math.floor(h * 0.2);
  line(bx, ty, bx + Math.floor(bw / 2), ty - Math.floor(h * 0.16), INK, 2);
  line(bx + Math.floor(bw / 2), ty - Math.floor(h * 0.16), bx + bw, ty, INK, 2);
  hline(bx, ty, bw, INK, 2);
  for (let i = 0; i < 3; i++) {
    const cx = bx + 4 + i * Math.floor((bw - 8) / 3);
    fillRect(cx, ty + 2, 6, Math.floor(h * 0.5), INK);
  }
  hline(bx, ty + 2 + Math.floor(h * 0.5), bw, INK, 2);
  hline(bx - 4, ty + 6 + Math.floor(h * 0.5), bw + 8, INK, 2);
}
function picPin(x: number, y: number, w: number, h: number): void {
  circle(x + Math.floor(w * 0.5), y + Math.floor(h * 0.62), Math.floor(w * 0.3), [190, 200, 170]);
  const px2 = x + Math.floor(w * 0.5), py2 = y + Math.floor(h * 0.38);
  circle(px2, py2, Math.floor(h * 0.2), RED);
  circle(px2, py2, Math.floor(h * 0.08), WHITE);
  line(px2 - Math.floor(h * 0.16), py2 + Math.floor(h * 0.1), px2, py2 + Math.floor(h * 0.34), RED, 3);
  line(px2 + Math.floor(h * 0.16), py2 + Math.floor(h * 0.1), px2, py2 + Math.floor(h * 0.34), RED, 3);
}
function picFence(x: number, y: number, w: number, h: number): void {
  const gy = y + Math.floor(h * 0.72);
  fillRect(x, gy, w, h - Math.floor(h * 0.72), [120, 130, 110]);
  for (let i = 0; i < 5; i++) {
    const fx = x + 4 + i * Math.floor((w - 8) / 4);
    vline(fx, y + Math.floor(h * 0.18), Math.floor(h * 0.54), INK, 3);
  }
  hline(x + 2, y + Math.floor(h * 0.3), w - 4, INK, 2);
  hline(x + 2, y + Math.floor(h * 0.56), w - 4, INK, 2);
  fillRect(x + Math.floor(w * 0.7), y + Math.floor(h * 0.08), Math.floor(w * 0.2), Math.floor(h * 0.12), RED);
}
function picBat(x: number, y: number, w: number, h: number): void {
  // cricket bat + ball on green
  const bx = x + Math.floor(w * 0.3), by = y + Math.floor(h * 0.2);
  fillRect(bx, by, Math.floor(w * 0.1), Math.floor(h * 0.52), [214, 178, 120]);
  rectBorder(bx, by, Math.floor(w * 0.1), Math.floor(h * 0.52), INK, 1);
  vline(bx + Math.floor(w * 0.05), by - Math.floor(h * 0.14), Math.floor(h * 0.14), INK, 3);
  circle(x + Math.floor(w * 0.72), y + Math.floor(h * 0.62), Math.floor(h * 0.16), RED);
  circleOutline(x + Math.floor(w * 0.72), y + Math.floor(h * 0.62), Math.floor(h * 0.16), WHITE);
  hline(x + Math.floor(w * 0.1), y + Math.floor(h * 0.84), Math.floor(w * 0.8), [240, 230, 200], 2);
}
function picBottle(x: number, y: number, w: number, h: number): void {
  const bx = x + Math.floor(w * 0.38), by = y + Math.floor(h * 0.18);
  fillRect(bx, by + Math.floor(h * 0.16), Math.floor(w * 0.24), Math.floor(h * 0.56), [40, 40, 44]);
  fillRect(bx + Math.floor(w * 0.07), by, Math.floor(w * 0.1), Math.floor(h * 0.18), [40, 40, 44]);
  fillRect(bx + 2, by + Math.floor(h * 0.3), Math.floor(w * 0.24) - 4, Math.floor(h * 0.2), WHITE);
  // warning triangle
  const tx = x + Math.floor(w * 0.68), ty = y + Math.floor(h * 0.5);
  line(tx, ty - 10, tx - 10, ty + 8, GOLD, 2);
  line(tx - 10, ty + 8, tx + 10, ty + 8, GOLD, 2);
  line(tx + 10, ty + 8, tx, ty - 10, GOLD, 2);
  drawText("!", tx - 2, ty - 6, 2, INK, true);
}
function picMic(x: number, y: number, w: number, h: number): void {
  const px2 = x + Math.floor(w * 0.5), py2 = y + Math.floor(h * 0.62);
  fillRect(px2 - Math.floor(w * 0.22), py2, Math.floor(w * 0.44), Math.floor(h * 0.26), NAVY);
  vline(px2, y + Math.floor(h * 0.3), Math.floor(h * 0.32), INK, 2);
  circle(px2, y + Math.floor(h * 0.26), Math.floor(h * 0.09), INK);
  // two small flags
  fillRect(x + Math.floor(w * 0.12), y + Math.floor(h * 0.2), Math.floor(w * 0.14), Math.floor(h * 0.16), [0, 91, 172]);
  fillRect(x + Math.floor(w * 0.74), y + Math.floor(h * 0.2), Math.floor(w * 0.14), Math.floor(h * 0.16), [255, 213, 0]);
}

// ---------------------------------------------------------------- world map
// Coarse land outline as [startCol, endCol] runs per row; 60 cols x 30 rows.
const MAP: number[][][] = [
  [[20, 26], [38, 59]], [[6, 19], [21, 26], [30, 34], [38, 59]],
  [[2, 19], [21, 25], [30, 34], [38, 59]], [[2, 20], [22, 25], [28, 29], [30, 35], [37, 59]],
  [[3, 20], [28, 36], [37, 59]], [[4, 20], [28, 36], [38, 58]],
  [[5, 20], [29, 36], [38, 58], [56, 58]], [[6, 19], [28, 36], [39, 57], [56, 58]],
  [[7, 19], [28, 36], [40, 56], [56, 58]], [[8, 19], [27, 37], [41, 55], [56, 57]],
  [[9, 18], [27, 37], [42, 54]], [[10, 17], [27, 37], [42, 53]],
  [[11, 16], [27, 36], [42, 52]], [[12, 14], [27, 36], [42, 51]],
  [[16, 18], [27, 35], [43, 50]], [[17, 22], [27, 34], [47, 54]],
  [[17, 23], [28, 33], [48, 53]], [[17, 23], [28, 33]], [[18, 23], [29, 32]],
  [[18, 22], [29, 32], [49, 55]], [[18, 22], [30, 31], [49, 56]],
  [[19, 22], [30, 31], [38, 39], [49, 56]], [[19, 22], [50, 55]],
  [[19, 21], [50, 54]], [[19, 21], [51, 53], [57, 58]],
  [[19, 20], [57, 58]], [[19, 20]], [[19, 20]], [[19, 20]], [],
];
function drawMap(mx: number, my: number, cell: number): void {
  fillRect(mx, my, 60 * cell, 30 * cell, [24, 68, 110]);
  for (let r = 0; r < MAP.length; r++) {
    for (const [c0, c1] of MAP[r]) {
      fillRect(mx + c0 * cell, my + r * cell, (c1 - c0 + 1) * cell, cell, [232, 214, 170]);
    }
  }
}
function mapXY(mx: number, my: number, cell: number, lon: number, lat: number): [number, number] {
  const col = (lon + 180) / 6;
  const row = (75 - lat) / 4.5;
  return [Math.round(mx + col * cell), Math.round(my + row * cell)];
}

// ---------------------------------------------------------------- raid scene
function picRaid(x: number, y: number, w: number, h: number): void {
  // dusk sky, orange blast with smoke, drone dots, a damaged block
  const ex = x + Math.floor(w * 0.68), ey = y + Math.floor(h * 0.34);
  circle(ex, ey, Math.floor(h * 0.13), [255, 110, 30]);
  circle(ex, ey, Math.floor(h * 0.06), [255, 220, 120]);
  burst(ex, ey, Math.floor(h * 0.2), [255, 140, 50]);
  burst(x + Math.floor(w * 0.3), y + Math.floor(h * 0.22), Math.floor(h * 0.11), [255, 160, 60]);
  // smoke puffs rising from the blast
  for (let s = 0; s < 3; s++) {
    circle(x + Math.floor(w * (0.6 + s * 0.06)), y + Math.floor(h * (0.24 - s * 0.07)), 5 - s, [110, 105, 100]);
  }
  for (let i = 0; i < 6; i++) {
    circle(x + Math.floor(w * (0.1 + i * 0.13)), y + Math.floor(h * (0.14 + (i % 3) * 0.08)), 2, [230, 230, 230]);
  }
  const base = y + h;
  fillRect(x + Math.floor(w * 0.08), base - Math.floor(h * 0.34), Math.floor(w * 0.2), Math.floor(h * 0.34), [20, 16, 16]);
  fillRect(x + Math.floor(w * 0.32), base - Math.floor(h * 0.26), Math.floor(w * 0.18), Math.floor(h * 0.26), [28, 20, 18]);
  line(x + Math.floor(w * 0.12), base - Math.floor(h * 0.34), x + Math.floor(w * 0.2), base - Math.floor(h * 0.2), [255, 200, 90], 2);
}

// ---------------------------------------------------------------- data
// Every story below happened, or was first reported, on Sunday 22 November
// 2026 (verified on its source page the morning of the 22nd, WIB). Sources
// are named beside each story. Saturday's news is listed only in the
// DATE CHECK box at the foot of the page.
type Story = {
  n: number; region: string; place: string; headline: string; summary: string;
  art: string; lon: number; lat: number;
};
const REGION_COLORS: Record<string, RGB> = {
  Europe: NAVY, Asia: RED, "Middle East": GOLD, Africa: PURPLE,
  Americas: TEAL, Oceania: GREEN, Global: [90, 90, 90],
};
function tint(c: RGB): RGB {
  return [
    Math.round(c[0] * 0.25 + PAPER[0] * 0.75),
    Math.round(c[1] * 0.25 + PAPER[1] * 0.75),
    Math.round(c[2] * 0.25 + PAPER[2] * 0.75),
  ];
}
const LEADS: Story[] = [
  { n: 1, region: "Middle East", place: "GULF · WAR",
    headline: "Iran hits US bases in the Gulf",
    summary: "Iran hit bases in Kuwait and Bahrain; its Guard claimed two Patriot radars hit. (ANI)",
    art: "night", lon: 48.0, lat: 29.4 },
  { n: 2, region: "Europe", place: "UKRAINE · WAR",
    headline: "Russia's biggest raid on Ukraine",
    summary: "400 drones and 110 missiles hit Ukraine; Lviv strike killed 2, hurt 10. (TOI)",
    art: "raid", lon: 24.0, lat: 49.8 },
  { n: 3, region: "Global", place: "ANTALYA · CLIMATE",
    headline: "COP31 deadlocked in overtime",
    summary: "Talks passed deadline with no deal, split on fossil fuels and finance. (Grand-Star)",
    art: "globe", lon: 30.7, lat: 36.9 },
];
const GRID: Story[] = [
  { n: 4, region: "Europe", place: "KYIV · WAR",
    headline: "Zelenskyy: NATO is Ukraine's best guard",
    summary: "NATO is the clearest security guarantee, Zelenskyy said. (ANI)",
    art: "mic", lon: 30.5, lat: 50.4 },
  { n: 5, region: "Europe", place: "BALTIC SEA · WAR",
    headline: "Drones hit Russian cargo ship",
    summary: "Finland blamed Ukraine and tightened Baltic security. (TOI)",
    art: "ship", lon: 21.0, lat: 59.0 },
  { n: 6, region: "Americas", place: "SINALOA · CRIME",
    headline: "'El Chapo Isidro' captured",
    summary: "Mexico seized the cartel boss; 11 died in the backlash. (TOI)",
    art: "pin", lon: -107.4, lat: 24.8 },
  { n: 7, region: "Asia", place: "HONG KONG · VOTE",
    headline: "Voting opens for Election Committee",
    summary: "5,700 voters began picking the committee. (Digest)",
    art: "ballot", lon: 114.2, lat: 22.3 },
  { n: 8, region: "Asia", place: "MYANMAR · QUAKE",
    headline: "M4.1 quake strikes at dawn",
    summary: "A 4.1 quake struck Myanmar in the early hours of Sunday. (ANI)",
    art: "quake", lon: 96.2, lat: 19.8 },
  { n: 9, region: "Middle East", place: "JERUSALEM · POLITICS",
    headline: "Eisenkot invites Likud to talks",
    summary: "Yashar opened talks with Netanyahu's Likud. (ANI)",
    art: "parliament", lon: 35.2, lat: 31.8 },
  { n: 10, region: "Africa", place: "BLUE NILE · WAR",
    headline: "Rebels seize Bau region",
    summary: "Tasis Alliance seized the key Bau region in Blue Nile. (Grand-Star)",
    art: "pin", lon: 34.3, lat: 11.2 },
  { n: 11, region: "Europe", place: "TALLINN · DIPLOMACY",
    headline: "Estonia to shut Russia border",
    summary: "Estonia to shut its Russia border; Moscow decried it. (Jagran)",
    art: "fence", lon: 24.7, lat: 59.4 },
];
const ALSO: string[] = [
  "12 Pant ton: India 629-6 (RTRS)",
  "13 Toxic alcohol kills 11 (AFP)",
  "14 Denmark expels envoy (AFP)",
  "15 UAE hosts US chief (WAM)",
  "16 Finland warns of spill (ANI)",
  "17 Modi opens Setu bridge (ANI)",
  "18 Akvan: 14 flights cut (ETV)",
  "19 William aids forests (AP)",
  "20 Jeddah flights cut (ANI)",
  "21 Japan trains in India (ANI)",
  "22 US airlines on alert (TOI)",
  "23 Qeshm blasts 'not attack'",
  "24 Tankers hit off Oman (TOI)",
  "25 Depardieu rape probe (AP)",
  "26 Real Madrid win 2-1 (RTRS)",
  "27 Zverev beats Medvedev (ATP)",
  "28 76ers 132-129 Bucks (NBA)",
  "29 Verstappen on Vegas pole (F1)",
  "30 Yale tops Harvard again (AP)",
  "31 UN arms talks fail (AFP)",
  "32 Zagreb rally over death (AFP)",
  "33 Andy Kim on dad's illness (AP)",
  "34 Iran: blockade hostile (ANI)",
  "35 Cummins keeps captaincy (CA)",
];
const NUMBERS: [string, string, string][] = [
  ["400", "DRONES FIRED", "AT UKRAINE"],
  ["110", "MISSILES IN", "THE SAME RAID"],
  ["98.5%", "TARIFFS CUT", "IN EU DEAL"],
  ["629-6", "INDIA'S TOTAL", "IN WELLINGTON"],
  ["5,700", "VOTERS IN", "HONG KONG"],
  ["4.1", "MYANMAR QUAKE", "MAGNITUDE"],
];
const REGIONS: [string, number][] = [
  ["Europe", 11], ["Asia", 7], ["Middle East", 7], ["Africa", 1],
  ["Americas", 6], ["Oceania", 1], ["Global", 2],
];
const DATE_CHECK =
  "DATE CHECK - Left out as Saturday 21 November's news: Wall Street's tech-stock crash, " +
  "the missiles that landed in Poland, Trump's tax warning on AI data centres abroad, the " +
  "Wallabies' win in Cardiff. Peru's quake is reported again today; its date is unconfirmed, " +
  "so it is not shown as today's news.";
const FOOTER =
  "Every story here happened, or was first reported, on Sunday 22 November 2026. " +
  "Sources named beside each story - original drawings";

// ---------------------------------------------------------------- layout
function drawArt(art: string, x: number, y: number, w: number, h: number): void {
  if (art === "night") picNight(x, y, w, h, 2);
  else if (art === "raid") picRaid(x, y, w, h);
  else if (art === "globe") picGlobe(x, y, w, h);
  else if (art === "ship") picShip(x, y, w, h);
  else if (art === "ballot") picBallot(x, y, w, h);
  else if (art === "quake") picQuake(x, y, w, h);
  else if (art === "parliament") picParliament(x, y, w, h);
  else if (art === "pin") picPin(x, y, w, h);
  else if (art === "fence") picFence(x, y, w, h);
  else if (art === "bat") picBat(x, y, w, h);
  else if (art === "bottle") picBottle(x, y, w, h);
  else if (art === "mic") picMic(x, y, w, h);
}

function render(): void {
  fillRect(0, 0, W, H, PAPER);
  fillRect(0, 0, W, 4, RED);

  // kicker line
  drawText("THE WORLD IN ONE DAY", 8, 8, 2, RED, true);
  const right = "35 STORIES · 7 REGIONS · ALL DATED SUNDAY 22 NOVEMBER 2026";
  drawText(right, W - 8 - textW(right, 2, true), 8, 2, INK, true);
  hline(8, 26, W - 16, INK, 1);

  // masthead + subhead (masthead unbolded: bold at scale 7 fills the counters)
  drawTextCentered("SUNDAY 22 NOVEMBER 2026", 512, 32, 7, NAVY, false);
  drawTextCentered("IRAN HITS US GULF BASES - RUSSIA'S BIG RAID - COP31 DEADLOCKED", 512, 86, 2, INK, true);
  hline(8, 104, W - 16, INK, 2);

  // numbers strip
  for (let i = 0; i < NUMBERS.length; i++) {
    const cx = 8 + i * 168 + 84;
    const [v, c1, c2] = NUMBERS[i];
    drawTextCentered(v, cx, 110, 3, RED, true);
    drawTextCentered(c1, cx, 136, 2, INK, true);
    drawTextCentered(c2, cx, 152, 2, INK, true);
    if (i > 0) vline(8 + i * 168, 110, 56, INK, 1);
  }

  // region legend + bar
  const legendParts: [string, number][] = REGIONS;
  let legendTotal = 0;
  for (const [name, count] of legendParts) {
    legendTotal += 14 + textW(name.toUpperCase() + " " + count, 2, true) + 16;
  }
  let lx = Math.floor((W - legendTotal + 16) / 2);
  for (const [name, count] of legendParts) {
    const col = REGION_COLORS[name];
    fillRect(lx, 174, 10, 10, col);
    drawText(name.toUpperCase() + " " + count, lx + 14, 172, 2, INK, true);
    lx += 14 + textW(name.toUpperCase() + " " + count, 2, true) + 16;
  }
  {
    let bx = 8;
    for (let i = 0; i < REGIONS.length; i++) {
      const [name, count] = REGIONS[i];
      const w = i === REGIONS.length - 1 ? W - 8 - bx : Math.round((count / 35) * 1008);
      fillRect(bx, 190, w, 12, REGION_COLORS[name]);
      bx += w;
    }
  }

  // three illustrated leads
  const leadBgs: RGB[] = [[18, 28, 52], [58, 30, 20], [214, 232, 226]];
  LEADS.forEach((s, i) => {
    const x = 8 + i * 339;
    const w = 330;
    fillRect(x, 208, w, 104, leadBgs[i]);
    drawArt(s.art, x, 208, w, 104);
    drawText(s.n + " " + s.place, x, 316, 2, RED, true);
    drawPara(s.headline, x, 332, w, 3, INK, 2);
    drawPara(s.summary, x, 380, w, 2, INK, 2);
  });

  // grid of ten
  GRID.forEach((s, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 8 + col * 254;
    const y = 434 + row * 136;
    const w = 246;
    const col1 = REGION_COLORS[s.region];
    fillRect(x, y, w, 44, tint(col1));
    drawArt(s.art, x, y, 48, 44);
    drawText(s.n + " " + s.place.split(" · ")[0], x + 52, y + 15, 2, col1, true);
    drawPara(s.headline, x, y + 48, w, 2, INK, 2);
    drawPara(s.summary, x, y + 82, w, 2, INK, 2);
  });

  // bottom: map + also list
  drawText("WHERE IT HAPPENED", 8, 706, 2, INK, true);
  drawMap(14, 724, 4);
  for (const s of [...LEADS, ...GRID]) {
    const [dx, dy] = mapXY(14, 724, 4, s.lon, s.lat);
    circle(dx, dy, 7, RED);
    const ns = String(s.n);
    drawText(ns, dx - Math.floor(textW(ns, 1) / 2), dy - 3, 1, WHITE, true);
  }
  drawPara("Each number is the story with that number on this page.", 8, 848, 284, 2, INK, 2);

  drawText("ALSO ON SUNDAY 22 NOVEMBER 2026 · 24 MORE STORIES", 308, 706, 2, INK, true);
  ALSO.forEach((item, i) => {
    const col = i < 12 ? 0 : 1;
    const row = i % 12;
    drawText(item, 308 + col * 348, 724 + row * 15, 2, INK);
  });

  // date check box
  rectBorder(8, 906, W - 16, 76, RED, 2);
  {
    const lines = wrap(DATE_CHECK, 90);
    lines.forEach((ln, i) => {
      const y = 914 + i * 16;
      if (i === 0) {
        const pre = "DATE CHECK - ";
        drawText(pre, 16, y, 2, RED, true);
        drawText(ln.slice(pre.length), 16 + textW(pre, 2, true), y, 2, INK);
      } else {
        drawText(ln, 16, y, 2, INK);
      }
    });
  }

  // footer
  drawTextCentered("Every story here happened, or was first reported, on Sunday 22 November 2026.", 512, 988, 2, INK, true);
  drawTextCentered("Sources named beside each story - original drawings", 512, 1004, 2, INK, true);
}

// ---------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
  fs.mkdirSync(outDir, { recursive: true });
  render();
  const png = encodePNG();
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  // Read-back self-check: the file on disk must be byte-identical to what
  // was just rendered, a whole 1024x1024 PNG, and under the 1 MiB cap.
  // Any mismatch (short write, wrong bytes, wrong size) fails the run.
  const back = fs.readFileSync(outPath);
  if (!back.equals(png)) throw new Error("self-check failed: entry.png bytes differ from rendered PNG");
  if (back.length > 1048576) throw new Error("self-check failed: entry.png exceeds 1 MiB");
  if (back.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("self-check failed: not a PNG");
  const w = back.readUInt32BE(16), h = back.readUInt32BE(20);
  if (w !== W || h !== H) throw new Error(`self-check failed: dimensions ${w}x${h}, expected ${W}x${H}`);
  console.log(`entry.png ${back.length} bytes ${w}x${h} sha256 ${crypto.createHash("sha256").update(back).digest("hex")}`);
}
main();
