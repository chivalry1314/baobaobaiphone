import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'public', 'wechat', 'gif-emojis');
mkdirSync(outDir, { recursive: true });

const W = 96;
const H = 96;
const palette = [
  [0, 0, 0],
  [255, 210, 58],
  [246, 154, 32],
  [45, 35, 28],
  [255, 255, 255],
  [68, 148, 255],
  [239, 76, 76],
  [255, 134, 171],
  [52, 190, 92],
  [139, 92, 56],
  [250, 236, 162],
  [230, 230, 230],
  [255, 185, 201],
  [112, 76, 38],
  [255, 244, 215],
  [180, 220, 255],
];

const indexes = {
  transparent: 0,
  yellow: 1,
  orange: 2,
  dark: 3,
  white: 4,
  blue: 5,
  red: 6,
  pink: 7,
  green: 8,
  brown: 9,
  light: 10,
  gray: 11,
  blush: 12,
  tan: 13,
  cream: 14,
  paleBlue: 15,
};

const setPixel = (pixels, x, y, color) => {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || px >= W || py < 0 || py >= H) return;
  pixels[py * W + px] = color;
};

const fillCircle = (pixels, cx, cy, r, color) => {
  const minX = Math.floor(cx - r);
  const maxX = Math.ceil(cx + r);
  const minY = Math.floor(cy - r);
  const maxY = Math.ceil(cy + r);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r ** 2) setPixel(pixels, x, y, color);
    }
  }
};

const fillEllipse = (pixels, cx, cy, rx, ry, color) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) {
        setPixel(pixels, x, y, color);
      }
    }
  }
};

const line = (pixels, x0, y0, x1, y1, color, width = 2) => {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillCircle(pixels, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width, color);
  }
};

const arc = (pixels, cx, cy, rx, ry, start, end, color, width = 2) => {
  const steps = 44;
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (end - start) * (i / steps);
    fillCircle(pixels, cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, width, color);
  }
};

const heart = (pixels, cx, cy, scale, color) => {
  for (let t = 0; t < Math.PI * 2; t += 0.02) {
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    fillCircle(pixels, cx + x * scale, cy + y * scale, scale * 1.4, color);
  }
};

const base = (expression, frame) => {
  const pixels = new Uint8Array(W * H);
  fillCircle(pixels, 48, 48 + Math.sin(frame * 0.9) * 1.5, 35, indexes.yellow);
  fillCircle(pixels, 35, 56, 8, indexes.blush);
  fillCircle(pixels, 61, 56, 8, indexes.blush);
  expression(pixels, frame);
  return pixels;
};

const expressions = {
  cry: (pixels, frame) => {
    fillCircle(pixels, 36, 40, 5, indexes.dark);
    fillCircle(pixels, 60, 40, 5, indexes.dark);
    const drop = (frame * 7) % 28;
    fillEllipse(pixels, 61, 49 + drop, 4, 8, indexes.blue);
    arc(pixels, 48, 66, 14, 8, Math.PI * 1.05, Math.PI * 1.95, indexes.dark, 2);
  },
  sob: (pixels, frame) => {
    fillEllipse(pixels, 34, 41, 6, 8, indexes.dark);
    fillEllipse(pixels, 62, 41, 6, 8, indexes.dark);
    fillEllipse(pixels, 34, 58 + frame * 3, 4, 15, indexes.blue);
    fillEllipse(pixels, 62, 58 + frame * 3, 4, 15, indexes.blue);
    fillEllipse(pixels, 48, 69, 9, 12, indexes.dark);
  },
  laugh: (pixels, frame) => {
    arc(pixels, 35, 39, 8, 6, 0, Math.PI, indexes.dark, 2);
    arc(pixels, 61, 39, 8, 6, 0, Math.PI, indexes.dark, 2);
    fillEllipse(pixels, 48, 61, 16, 11 + frame, indexes.dark);
    fillEllipse(pixels, 48, 57, 12, 4, indexes.white);
  },
  angry: (pixels, frame) => {
    line(pixels, 28, 32 + frame, 42, 39, indexes.dark, 2);
    line(pixels, 68, 32 + frame, 54, 39, indexes.dark, 2);
    fillCircle(pixels, 36, 44, 4, indexes.dark);
    fillCircle(pixels, 60, 44, 4, indexes.dark);
    arc(pixels, 48, 70, 13, 8, Math.PI * 1.08, Math.PI * 1.92, indexes.dark, 2);
    fillEllipse(pixels, 48, 53, 36, 18, indexes.orange);
  },
  heart: (pixels, frame) => {
    fillCircle(pixels, 36, 43, 3, indexes.dark);
    fillCircle(pixels, 60, 43, 3, indexes.dark);
    arc(pixels, 48, 56, 15, 10, 0.2, Math.PI - 0.2, indexes.dark, 2);
    heart(pixels, 32, 27 - frame, 0.7, indexes.red);
    heart(pixels, 65, 27 + frame, 0.6, indexes.pink);
  },
  thumbs: (pixels, frame) => {
    fillCircle(pixels, 48, 48, 24, indexes.yellow);
    fillEllipse(pixels, 45, 61, 20, 8, indexes.dark);
    fillEllipse(pixels, 45, 57, 16, 4, indexes.white);
    fillCircle(pixels, 34, 39, 4, indexes.dark);
    fillCircle(pixels, 58, 39, 4, indexes.dark);
    line(pixels, 67, 70 - frame * 2, 78, 48 - frame * 2, indexes.yellow, 6);
    line(pixels, 70, 70 - frame * 2, 86, 70 - frame * 2, indexes.yellow, 6);
  },
  shy: (pixels, frame) => {
    arc(pixels, 35, 43, 7, 5, 0, Math.PI, indexes.dark, 2);
    arc(pixels, 61, 43, 7, 5, 0, Math.PI, indexes.dark, 2);
    fillEllipse(pixels, 34, 58, 11 + frame, 5, indexes.blush);
    fillEllipse(pixels, 62, 58, 11 + frame, 5, indexes.blush);
    arc(pixels, 48, 62, 8, 5, 0.1, Math.PI - 0.1, indexes.dark, 2);
  },
  shock: (pixels, frame) => {
    fillEllipse(pixels, 34, 40, 8, 10, indexes.white);
    fillEllipse(pixels, 62, 40, 8, 10, indexes.white);
    fillCircle(pixels, 34, 40, 4, indexes.dark);
    fillCircle(pixels, 62, 40, 4, indexes.dark);
    fillEllipse(pixels, 48, 64, 8 + frame, 11 + frame, indexes.dark);
    fillCircle(pixels, 72, 23, 9, indexes.white);
    line(pixels, 72, 28, 72, 36, indexes.dark, 1);
    fillCircle(pixels, 72, 39, 2, indexes.dark);
  },
  kiss: (pixels, frame) => {
    fillCircle(pixels, 35, 42, 4, indexes.dark);
    arc(pixels, 61, 41, 8, 5, 0, Math.PI, indexes.dark, 2);
    fillEllipse(pixels, 46, 63, 8, 5, indexes.dark);
    heart(pixels, 70, 54 - frame * 3, 0.35 + frame * 0.03, indexes.red);
  },
  sleep: (pixels, frame) => {
    arc(pixels, 36, 43, 7, 5, 0, Math.PI, indexes.dark, 2);
    arc(pixels, 60, 43, 7, 5, 0, Math.PI, indexes.dark, 2);
    arc(pixels, 48, 64, 10, 4, 0.1, Math.PI - 0.1, indexes.dark, 2);
    line(pixels, 66, 24 - frame * 2, 78, 24 - frame * 2, indexes.blue, 2);
    line(pixels, 78, 24 - frame * 2, 66, 36 - frame * 2, indexes.blue, 2);
    line(pixels, 66, 36 - frame * 2, 80, 36 - frame * 2, indexes.blue, 2);
  },
  poop: (pixels, frame) => {
    fillEllipse(pixels, 48, 68, 27, 13, indexes.brown);
    fillEllipse(pixels, 48, 52, 22, 12, indexes.brown);
    fillEllipse(pixels, 48, 37, 15, 10, indexes.brown);
    fillCircle(pixels, 40, 54, 4, indexes.white);
    fillCircle(pixels, 56, 54, 4, indexes.white);
    fillCircle(pixels, 40 + frame, 54, 2, indexes.dark);
    fillCircle(pixels, 56 + frame, 54, 2, indexes.dark);
    arc(pixels, 48, 63, 10, 5, 0.2, Math.PI - 0.2, indexes.dark, 2);
  },
  party: (pixels, frame) => {
    fillCircle(pixels, 48, 48, 30, indexes.yellow);
    fillCircle(pixels, 36, 40, 4, indexes.dark);
    fillCircle(pixels, 60, 40, 4, indexes.dark);
    fillEllipse(pixels, 48, 61, 14, 8, indexes.dark);
    line(pixels, 24, 22, 34, 12 + frame, indexes.red, 2);
    line(pixels, 70, 16, 82, 22 + frame, indexes.green, 2);
    line(pixels, 48, 12, 48, 3 + frame, indexes.blue, 2);
  },
};

const lzwEncode = (indices, minCodeSize = 4) => {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const codeSize = minCodeSize + 1;
  const out = [];
  let bitBuffer = 0;
  let bitCount = 0;
  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuffer & 255);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };
  writeCode(clear);
  indices.forEach((index, pixelIndex) => {
    if (pixelIndex > 0 && pixelIndex % 12 === 0) writeCode(clear);
    writeCode(index);
  });
  writeCode(end);
  if (bitCount > 0) out.push(bitBuffer & 255);
  return out;
};

const subBlocks = (data) => {
  const blocks = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return blocks;
};

const word = (value) => [value & 255, (value >> 8) & 255];

const makeGif = (frames) => {
  const bytes = [
    ...Buffer.from('GIF89a', 'ascii'),
    ...word(W), ...word(H),
    0b11110011,
    0,
    0,
  ];
  for (let i = 0; i < 16; i += 1) bytes.push(...(palette[i] || [0, 0, 0]));
  bytes.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0', 'ascii'), 0x03, 0x01, 0x00, 0x00, 0x00);
  frames.forEach((pixels) => {
    bytes.push(0x21, 0xf9, 0x04, 0x09, ...word(9), 0, 0);
    bytes.push(0x2c, 0, 0, 0, 0, ...word(W), ...word(H), 0);
    bytes.push(4, ...subBlocks(lzwEncode(pixels, 4)));
  });
  bytes.push(0x3b);
  return Buffer.from(bytes);
};

const specs = [
  ['cry', 'cry'],
  ['sob', 'sob'],
  ['laugh', 'laugh'],
  ['angry', 'angry'],
  ['heart', 'heart'],
  ['thumbs-up', 'thumbs'],
  ['shy', 'shy'],
  ['shock', 'shock'],
  ['kiss', 'kiss'],
  ['sleep', 'sleep'],
  ['poop', 'poop'],
  ['party', 'party'],
];

specs.forEach(([file, expressionName]) => {
  const expression = expressions[expressionName];
  const frames = Array.from({ length: 6 }, (_, frame) => base(expression, frame));
  writeFileSync(join(outDir, `${file}.gif`), makeGif(frames));
});

writeFileSync(
  join(outDir, 'manifest.json'),
  `${JSON.stringify(specs.map(([file]) => ({ id: file, file: `${file}.gif` })), null, 2)}\n`
);
