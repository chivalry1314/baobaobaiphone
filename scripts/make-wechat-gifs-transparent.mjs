import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'src', 'assets', 'wechat', 'gif-emojis');

const readU16 = (buffer, offset) => buffer[offset] | (buffer[offset + 1] << 8);

const readSubBlocks = (buffer, offset) => {
  const chunks = [];
  let cursor = offset;
  while (cursor < buffer.length) {
    const size = buffer[cursor];
    cursor += 1;
    if (size === 0) break;
    chunks.push(...buffer.subarray(cursor, cursor + size));
    cursor += size;
  }
  return { data: chunks, end: cursor };
};

const decodeLzw = (minCodeSize, data, expectedLength) => {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let bitPos = 0;
  let dict = [];
  const output = [];

  const resetDict = () => {
    dict = Array.from({ length: clearCode }, (_, index) => [index]);
    dict[clearCode] = [];
    dict[endCode] = [];
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  const readCode = () => {
    let code = 0;
    for (let bit = 0; bit < codeSize; bit += 1) {
      const byte = data[bitPos >> 3] ?? 0;
      code |= ((byte >> (bitPos & 7)) & 1) << bit;
      bitPos += 1;
    }
    return code;
  };

  resetDict();
  let previous = null;

  while (bitPos < data.length * 8 && output.length < expectedLength) {
    const code = readCode();
    if (code === clearCode) {
      resetDict();
      previous = null;
      continue;
    }
    if (code === endCode) break;

    let entry;
    if (dict[code]) {
      entry = dict[code].slice();
    } else if (code === nextCode && previous) {
      entry = previous.concat(previous[0]);
    } else {
      break;
    }

    output.push(...entry);

    if (previous) {
      dict[nextCode] = previous.concat(entry[0]);
      nextCode += 1;
      if (nextCode === (1 << codeSize) && codeSize < 12) {
        codeSize += 1;
      }
    }

    previous = entry;
  }

  return output.slice(0, expectedLength);
};

const chooseBorderIndex = (pixels, width, height) => {
  const counts = new Map();
  const count = (index) => counts.set(index, (counts.get(index) || 0) + 1);
  for (let x = 0; x < width; x += 1) {
    count(pixels[x]);
    count(pixels[(height - 1) * width + x]);
  }
  for (let y = 1; y < height - 1; y += 1) {
    count(pixels[y * width]);
    count(pixels[y * width + width - 1]);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
};

const processGif = (path) => {
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 6).toString('ascii') !== 'GIF89a' && buffer.subarray(0, 6).toString('ascii') !== 'GIF87a') {
    return;
  }

  let cursor = 13;
  const packed = buffer[10];
  if (packed & 0x80) {
    cursor += 3 * (1 << ((packed & 0x07) + 1));
  }

  const bytePatches = new Map();
  const insertions = [];
  let pendingGceStart = null;

  while (cursor < buffer.length) {
    const marker = buffer[cursor];
    if (marker === 0x3b) break;

    if (marker === 0x21) {
      const label = buffer[cursor + 1];
      if (label === 0xf9 && buffer[cursor + 2] === 0x04) {
        pendingGceStart = cursor;
        cursor += 8;
        continue;
      }
      cursor += 2;
      while (cursor < buffer.length) {
        const size = buffer[cursor];
        cursor += 1;
        if (size === 0) break;
        cursor += size;
      }
      continue;
    }

    if (marker === 0x2c) {
      const imageStart = cursor;
      const width = readU16(buffer, cursor + 5);
      const height = readU16(buffer, cursor + 7);
      const imagePacked = buffer[cursor + 9];
      cursor += 10;
      if (imagePacked & 0x80) {
        cursor += 3 * (1 << ((imagePacked & 0x07) + 1));
      }

      const lzwMinCodeSize = buffer[cursor];
      const subBlockStart = cursor + 1;
      const { data, end } = readSubBlocks(buffer, subBlockStart);
      const pixels = decodeLzw(lzwMinCodeSize, data, width * height);
      const transparentIndex = chooseBorderIndex(pixels, width, height);

      if (pendingGceStart !== null) {
        bytePatches.set(pendingGceStart + 3, buffer[pendingGceStart + 3] | 0x01);
        bytePatches.set(pendingGceStart + 6, transparentIndex);
      } else {
        insertions.push({
          offset: imageStart,
          bytes: [0x21, 0xf9, 0x04, 0x01, 0x08, 0x00, transparentIndex, 0x00],
        });
      }

      pendingGceStart = null;
      cursor = end;
      continue;
    }

    cursor += 1;
  }

  const output = [];
  const insertionsByOffset = new Map();
  insertions.forEach((insertion) => {
    const list = insertionsByOffset.get(insertion.offset) || [];
    list.push(insertion.bytes);
    insertionsByOffset.set(insertion.offset, list);
  });

  for (let index = 0; index < buffer.length; index += 1) {
    const before = insertionsByOffset.get(index);
    if (before) before.forEach((bytes) => output.push(...bytes));
    output.push(bytePatches.has(index) ? bytePatches.get(index) : buffer[index]);
  }

  writeFileSync(path, Buffer.from(output));
};

[
  'angry.gif',
  'cool.gif',
  'cry.gif',
  'heart.gif',
  'kiss.gif',
  'laugh.gif',
  'no.gif',
  'party.gif',
  'poop.gif',
  'shock.gif',
  'shy.gif',
  'sick.gif',
  'sleep.gif',
  'smile.gif',
  'sob.gif',
  'thumbs-up.gif',
  'wink.gif',
].forEach((file) => processGif(join(dir, file)));
