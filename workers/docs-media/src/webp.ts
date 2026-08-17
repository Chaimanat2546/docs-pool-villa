export type WebpImageMetadata = {
  width: number;
  height: number;
};

function readUint32LE(bytes: Uint8Array, offset: number): number | null {
  if (offset + 4 > bytes.length) return null;
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function readChunkTag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + 4));
}

function validDimensions(width: number, height: number): WebpImageMetadata | null {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 1920 && height <= 1920
    ? { width, height }
    : null;
}

function parseVp8(bytes: Uint8Array): WebpImageMetadata | null {
  if (bytes.length < 10 || bytes[3] !== 0x9d || bytes[4] !== 0x01 || bytes[5] !== 0x2a) return null;
  const width = (bytes[6] | (bytes[7] << 8)) & 0x3fff;
  const height = (bytes[8] | (bytes[9] << 8)) & 0x3fff;
  return validDimensions(width, height);
}

function parseVp8l(bytes: Uint8Array): WebpImageMetadata | null {
  if (bytes.length < 5 || bytes[0] !== 0x2f) return null;
  const width = 1 + (bytes[1] | ((bytes[2] & 0x3f) << 8));
  const height = 1 + ((bytes[2] >> 6) | (bytes[3] << 2) | ((bytes[4] & 0x0f) << 10));
  return validDimensions(width, height);
}

function parseVp8x(bytes: Uint8Array): WebpImageMetadata | null {
  if (bytes.length < 10) return null;
  const width = 1 + bytes[4] + (bytes[5] << 8) + (bytes[6] << 16);
  const height = 1 + bytes[7] + (bytes[8] << 8) + (bytes[9] << 16);
  return validDimensions(width, height);
}

export function parseWebpImage(bytes: Uint8Array): WebpImageMetadata | null {
  if (bytes.length < 20 || readChunkTag(bytes, 0) !== "RIFF" || readChunkTag(bytes, 8) !== "WEBP") return null;
  const riffSize = readUint32LE(bytes, 4);
  if (riffSize === null || riffSize + 8 !== bytes.length) return null;

  let offset = 12;
  let dimensions: WebpImageMetadata | null = null;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return null;
    const tag = readChunkTag(bytes, offset);
    const size = readUint32LE(bytes, offset + 4);
    if (size === null) return null;
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) return null;

    const chunk = bytes.slice(dataStart, dataEnd);
    const parsed = tag === "VP8 " ? parseVp8(chunk) : tag === "VP8L" ? parseVp8l(chunk) : tag === "VP8X" ? parseVp8x(chunk) : null;
    if (parsed) {
      if (dimensions && (dimensions.width !== parsed.width || dimensions.height !== parsed.height)) return null;
      dimensions = parsed;
    }

    offset = dataEnd + (size % 2);
  }

  return offset === bytes.length ? dimensions : null;
}
