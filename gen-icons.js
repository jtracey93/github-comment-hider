// One-off icon generator. Produces icons/icon16.png, icon48.png, icon128.png.
// Pure Node (zlib) PNG encoder — no external deps. Run: node gen-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// --- CRC32 ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const r = size * 0.40;
  const slashHalf = size * 0.07;
  const set = (x, y, rr, gg, bb, aa) => {
    const i = (y * size + x) * 4;
    buf[i] = rr; buf[i + 1] = gg; buf[i + 2] = bb; buf[i + 3] = aa;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const inCircle = dx * dx + dy * dy <= r * r;
      // diagonal "hide" slash (top-right to bottom-left): x + y near constant
      const onSlash = Math.abs((x + y) - size) <= slashHalf * 1.42;
      if (onSlash && inCircle) {
        set(x, y, 13, 17, 23, 255); // dark slash
      } else if (inCircle) {
        set(x, y, 210, 153, 34, 255); // amber disc
      } else {
        set(x, y, 0, 0, 0, 0); // transparent
      }
    }
  }
  return buf;
}

const outDir = path.join(__dirname, "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = encodePNG(size, size, draw(size));
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log("wrote", `icon${size}.png`, png.length, "bytes");
}
