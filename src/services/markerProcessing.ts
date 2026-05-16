import decodeJpeg from './jpegDecode';

export type Point = {
  x: number;
  y: number;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExtractedMarker = {
  dataUrl: string;
  width: number;
  height: number;
  sourceUri: string;
  corners: [Point, Point, Point, Point];
};

export type DetectionCandidate = {
  area: number;
  boundingBox: BoundingBox;
  aspectRatio: number;
  isConvexQuad: boolean;
  borderScore: number;
  borderMean: number;
  interiorMean: number;
  contrast: number;
  corners: [Point, Point, Point, Point];
  rejectionReasons: string[];
};

export type MarkerDetectionResult = {
  candidate: DetectionCandidate;
  sourceWidth: number;
  sourceHeight: number;
  downscaledWidth: number;
  downscaledHeight: number;
  normalizedMarker: ExtractedMarker;
};

const NORMALIZED_MARKER_SIZE = 300;
const MIN_SHORT_EDGE = 120;
const TARGET_LONG_EDGE = 420;
const MIN_AREA_RATIO = 0.003;
const MIN_ABSOLUTE_AREA = 1200;
const ASPECT_RATIO_MIN = 0.65;
const ASPECT_RATIO_MAX = 1.55;
const BORDER_SCORE_MIN = 14;
const CONTRAST_MIN = 18;
const OCCUPANCY_MIN = 0.30;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeOtsuThreshold(gray: Uint8ClampedArray): number {
  const histogram = new Uint32Array(256);
  let sum = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const value = gray[i];
    histogram[value] += 1;
    sum += value;
  }

  const total = gray.length;
  let sumB = 0;
  let weightB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t += 1) {
    weightB += histogram[t];
    if (weightB === 0) {
      continue;
    }
    const weightF = total - weightB;
    if (weightF === 0) {
      break;
    }
    sumB += t * histogram[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const betweenVariance = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (betweenVariance > maxVariance) {
      maxVariance = betweenVariance;
      threshold = t;
    }
  }

  return clamp(threshold, 32, 224);
}

function downscaleToGrayscale(
  rgba: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
): { gray: Uint8ClampedArray; width: number; height: number } {
  const scale = Math.min(
    1,
    TARGET_LONG_EDGE / Math.max(sourceWidth, sourceHeight),
    MIN_SHORT_EDGE / Math.min(sourceWidth, sourceHeight),
  );
  const width = Math.max(64, Math.round(sourceWidth * scale));
  const height = Math.max(64, Math.round(sourceHeight * scale));
  const gray = new Uint8ClampedArray(width * height);
  const xRatio = sourceWidth / width;
  const yRatio = sourceHeight / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(y * yRatio));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(x * xRatio));
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const r = rgba[sourceIndex];
      const g = rgba[sourceIndex + 1];
      const b = rgba[sourceIndex + 2];
      gray[y * width + x] = (r * 299 + g * 587 + b * 114 + 500) / 1000;
    }
  }

  return { gray, width, height };
}

function thresholdImage(gray: Uint8ClampedArray, threshold: number): Uint8Array {
  const mask = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i += 1) {
    mask[i] = gray[i] < threshold ? 1 : 0;
  }
  return mask;
}

function orderQuadCorners(points: Point[]): [Point, Point, Point, Point] {
  if (points.length < 4) {
    return [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
  }

  const topLeft = points.reduce((current, next) =>
    next.x + next.y < current.x + current.y ? next : current,
  );
  const bottomRight = points.reduce((current, next) =>
    next.x + next.y > current.x + current.y ? next : current,
  );
  const topRight = points.reduce((current, next) =>
    next.x - next.y > current.x - current.y ? next : current,
  );
  const bottomLeft = points.reduce((current, next) =>
    next.x - next.y < current.x - current.y ? next : current,
  );

  return [topLeft, topRight, bottomRight, bottomLeft];
}

function estimateQuadCornersFromMask(
  mask: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
): [Point, Point, Point, Point] {
  const topLeft = findRegionCorner(mask, width, height, box, 1);
  const topRight = findRegionCorner(mask, width, height, box, 2);
  const bottomRight = findRegionCorner(mask, width, height, box, 3);
  const bottomLeft = findRegionCorner(mask, width, height, box, 4);

  const ordered = orderQuadCorners([topLeft, topRight, bottomRight, bottomLeft]);
  return ordered;
}

function findRegionCorner(
  mask: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
  cornerIndex: 1 | 2 | 3 | 4,
): Point {
  const left = box.x;
  const right = box.x + box.width - 1;
  const top = box.y;
  const bottom = box.y + box.height - 1;

  if (cornerIndex === 1) {
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        if (mask[y * width + x] === 1) {
          return { x, y };
        }
      }
    }
  }

  if (cornerIndex === 2) {
    for (let y = top; y <= bottom; y += 1) {
      for (let x = right; x >= left; x -= 1) {
        if (mask[y * width + x] === 1) {
          return { x, y };
        }
      }
    }
  }

  if (cornerIndex === 3) {
    for (let y = bottom; y >= top; y -= 1) {
      for (let x = right; x >= left; x -= 1) {
        if (mask[y * width + x] === 1) {
          return { x, y };
        }
      }
    }
  }

  for (let y = bottom; y >= top; y -= 1) {
    for (let x = left; x <= right; x += 1) {
      if (mask[y * width + x] === 1) {
        return { x, y };
      }
    }
  }

  return {
    x: box.x,
    y: box.y,
  };
}

function computePerspectiveTransform(
  src: [Point, Point, Point, Point],
  dst: [Point, Point, Point, Point],
): number[] {
  const matrix = new Array(8).fill(0).map(() => new Array(9).fill(0));

  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    const row = i * 2;
    matrix[row][0] = x;
    matrix[row][1] = y;
    matrix[row][2] = 1;
    matrix[row][3] = 0;
    matrix[row][4] = 0;
    matrix[row][5] = 0;
    matrix[row][6] = -u * x;
    matrix[row][7] = -u * y;
    matrix[row][8] = u;

    matrix[row + 1][0] = 0;
    matrix[row + 1][1] = 0;
    matrix[row + 1][2] = 0;
    matrix[row + 1][3] = x;
    matrix[row + 1][4] = y;
    matrix[row + 1][5] = 1;
    matrix[row + 1][6] = -v * x;
    matrix[row + 1][7] = -v * y;
    matrix[row + 1][8] = v;
  }

  for (let pivot = 0; pivot < 8; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < 8; row += 1) {
      if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[maxRow][pivot])) {
        maxRow = row;
      }
    }
    if (maxRow !== pivot) {
      const temp = matrix[pivot];
      matrix[pivot] = matrix[maxRow];
      matrix[maxRow] = temp;
    }

    const pivotValue = matrix[pivot][pivot];
    if (!pivotValue) {
      continue;
    }
    for (let col = pivot; col < 9; col += 1) {
      matrix[pivot][col] /= pivotValue;
    }

    for (let row = 0; row < 8; row += 1) {
      if (row === pivot) {
        continue;
      }
      const factor = matrix[row][pivot];
      for (let col = pivot; col < 9; col += 1) {
        matrix[row][col] -= factor * matrix[pivot][col];
      }
    }
  }

  return matrix.map((row) => row[8]);
}

function invertHomography(matrix: number[]): number[] {
  const a = matrix;
  const m = [
    [a[0], a[1], a[2]],
    [a[3], a[4], a[5]],
    [a[6], a[7], 1],
  ];

  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (det === 0) {
    return matrix;
  }

  const invDet = 1 / det;
  const inv = [
    (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
    (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet,
    (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet,
    (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet,
    (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
    (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet,
    (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
    (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet,
    (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet,
  ];

  return inv;
}

function mapPoint(matrix: number[], x: number, y: number): Point {
  const divisor = matrix[6] * x + matrix[7] * y + 1;
  if (!divisor) {
    return { x, y };
  }
  return {
    x: (matrix[0] * x + matrix[1] * y + matrix[2]) / divisor,
    y: (matrix[3] * x + matrix[4] * y + matrix[5]) / divisor,
  };
}

function bilinearSample(
  rgba: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) {
    const ix = clamp(Math.round(x), 0, width - 1);
    const iy = clamp(Math.round(y), 0, height - 1);
    const offset = (iy * width + ix) * 4;
    return [
      rgba[offset],
      rgba[offset + 1],
      rgba[offset + 2],
      rgba[offset + 3],
    ];
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const dx = x - x0;
  const dy = y - y0;

  const getPixel = (px: number, py: number) => {
    const offset = (py * width + px) * 4;
    return [
      rgba[offset],
      rgba[offset + 1],
      rgba[offset + 2],
      rgba[offset + 3],
    ] as [number, number, number, number];
  };

  const p00 = getPixel(x0, y0);
  const p10 = getPixel(x1, y0);
  const p01 = getPixel(x0, y1);
  const p11 = getPixel(x1, y1);

  const top = [
    p00[0] * (1 - dx) + p10[0] * dx,
    p00[1] * (1 - dx) + p10[1] * dx,
    p00[2] * (1 - dx) + p10[2] * dx,
    p00[3] * (1 - dx) + p10[3] * dx,
  ];
  const bottom = [
    p01[0] * (1 - dx) + p11[0] * dx,
    p01[1] * (1 - dx) + p11[1] * dx,
    p01[2] * (1 - dx) + p11[2] * dx,
    p01[3] * (1 - dx) + p11[3] * dx,
  ];

  return [
    top[0] * (1 - dy) + bottom[0] * dy,
    top[1] * (1 - dy) + bottom[1] * dy,
    top[2] * (1 - dy) + bottom[2] * dy,
    top[3] * (1 - dy) + bottom[3] * dy,
  ];
}

function warpToSquare(
  rgba: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  corners: [Point, Point, Point, Point],
  size: number,
): Uint8ClampedArray {
  const destinationCorners: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: size - 1, y: 0 },
    { x: size - 1, y: size - 1 },
    { x: 0, y: size - 1 },
  ];

  const matrix = computePerspectiveTransform(corners, destinationCorners);
  const inverse = invertHomography(matrix);
  const output = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sample = mapPoint(inverse, x, y);
      const [r, g, b, a] = bilinearSample(rgba, sourceWidth, sourceHeight, sample.x, sample.y);
      const index = (y * size + x) * 4;
      output[index] = clamp(Math.round(r), 0, 255);
      output[index + 1] = clamp(Math.round(g), 0, 255);
      output[index + 2] = clamp(Math.round(b), 0, 255);
      output[index + 3] = clamp(Math.round(a), 0, 255);
    }
  }

  return output;
}

function u32ToBytes(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function crc32(bytes: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  const MOD = 65521;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]) % MOD;
    b = (b + a) % MOD;
  }
  return ((b << 16) | a) >>> 0;
}

function concatArrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function zlibNoCompression(data: Uint8Array): Uint8Array {
  const header = new Uint8Array([0x78, 0x01]);
  const chunks: number[] = [];
  let remaining = data.length;
  let position = 0;

  while (remaining > 0) {
    const blockSize = Math.min(65535, remaining);
    const isFinal = remaining === blockSize ? 1 : 0;
    chunks.push(isFinal);
    chunks.push(blockSize & 0xff, (blockSize >> 8) & 0xff);
    const nlen = (~blockSize) & 0xffff;
    chunks.push(nlen & 0xff, (nlen >> 8) & 0xff);
    for (let i = 0; i < blockSize; i += 1) {
      chunks.push(data[position + i]);
    }
    position += blockSize;
    remaining -= blockSize;
  }

  const content = new Uint8Array(chunks);
  const adler = adler32(data);
  const footer = new Uint8Array(u32ToBytes(adler));
  return concatArrays([header, content, footer]);
}

function pngEncode(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = new Uint8Array([
    ...u32ToBytes(width),
    ...u32ToBytes(height),
    8,
    6,
    0,
    0,
    0,
  ]);
  const ihdr = makeChunk('IHDR', ihdrData);

  const scanlines = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width * 4; x += 1) {
      scanlines[rowStart + 1 + x] = rgba[rowOffset + x];
    }
  }

  const idatData = zlibNoCompression(scanlines);
  const idat = makeChunk('IDAT', idatData);
  const iend = makeChunk('IEND', new Uint8Array([]));

  return concatArrays([signature, ihdr, idat, iend]);
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array(type.split('').map((char) => char.charCodeAt(0)));
  const length = new Uint8Array(u32ToBytes(data.length));
  const crcPayload = concatArrays([typeBytes, data]);
  const crc = new Uint8Array(u32ToBytes(crc32(crcPayload)));
  return concatArrays([length, typeBytes, data, crc]);
}

function base64Encode(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++] >>> 0;
    const byte2 = i < bytes.length ? bytes[i++] >>> 0 : NaN;
    const byte3 = i < bytes.length ? bytes[i++] >>> 0 : NaN;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (isNaN(byte2) ? 0 : byte2 >> 4);
    const enc3 = isNaN(byte2) ? 64 : ((byte2 & 15) << 2) | (isNaN(byte3) ? 0 : byte3 >> 6);
    const enc4 = isNaN(byte3) ? 64 : byte3 & 63;

    result += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }

  return result;
}

function rgbaToDataUrl(rgba: Uint8ClampedArray, width: number, height: number): string {
  const png = pngEncode(rgba, width, height);
  const base64 = base64Encode(png);
  return `data:image/png;base64,${base64}`;
}

function sampleRegionMean(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  box: BoundingBox,
  sampleBorder: boolean,
): number {
  const insetX = Math.max(1, Math.floor(box.width * 0.12));
  const insetY = Math.max(1, Math.floor(box.height * 0.12));
  const left = box.x;
  const top = box.y;
  const right = box.x + box.width - 1;
  const bottom = box.y + box.height - 1;
  let sum = 0;
  let count = 0;

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const isBorder = x < left + insetX || x > right - insetX || y < top + insetY || y > bottom - insetY;
      if (sampleBorder !== isBorder) {
        continue;
      }
      sum += gray[y * width + x];
      count += 1;
    }
  }

  return count > 0 ? sum / count : 0;
}

function collectRegions(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  const regions: {
    area: number;
    bbox: BoundingBox;
    isConvexQuad: boolean;
  }[] = [];

  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 1 || visited[index]) {
      continue;
    }

    const toVisit = [index];
    visited[index] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (toVisit.length) {
      const pixel = toVisit.pop() as number;
      const y = Math.floor(pixel / width);
      const x = pixel - y * width;
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
      for (let i = 0; i < neighbors.length; i += 1) {
        const neighbor = neighbors[i];
        if (neighbor < 0 || neighbor >= mask.length) {
          continue;
        }
        if (visited[neighbor] || mask[neighbor] !== 1) {
          continue;
        }
        visited[neighbor] = 1;
        toVisit.push(neighbor);
      }
    }

    const bboxWidth = Math.max(1, maxX - minX + 1);
    const bboxHeight = Math.max(1, maxY - minY + 1);
    const occupancy = area / (bboxWidth * bboxHeight);

    regions.push({
      area,
      bbox: { x: minX, y: minY, width: bboxWidth, height: bboxHeight },
      isConvexQuad: occupancy >= OCCUPANCY_MIN,
    });
  }

  return regions;
}

function evaluateCandidate(
  gray: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number,
  region: { area: number; bbox: BoundingBox; isConvexQuad: boolean },
): DetectionCandidate {
  const { area, bbox, isConvexQuad } = region;
  const aspectRatio = bbox.width / bbox.height;
  const minArea = Math.max(MIN_ABSOLUTE_AREA, Math.floor(width * height * MIN_AREA_RATIO));
  const borderMean = sampleRegionMean(gray, width, height, bbox, true);
  const interiorMean = sampleRegionMean(gray, width, height, bbox, false);
  const contrast = Math.abs(interiorMean - borderMean);
  const borderScore = interiorMean - borderMean;
  const corners = estimateQuadCornersFromMask(mask, width, height, bbox);

  const rejectionReasons: string[] = [];

  if (area < minArea) {
    rejectionReasons.push('too small');
  }

  if (aspectRatio < ASPECT_RATIO_MIN || aspectRatio > ASPECT_RATIO_MAX) {
    rejectionReasons.push('aspect ratio invalid');
  }

  if (contrast < CONTRAST_MIN) {
    rejectionReasons.push('low contrast');
  }

  if (borderScore <= 0 || borderScore < BORDER_SCORE_MIN) {
    rejectionReasons.push('border check failed');
  }

  if (!isConvexQuad) {
    rejectionReasons.push('convex quad preference failed');
  }

  return {
    area,
    boundingBox: bbox,
    aspectRatio,
    isConvexQuad,
    borderScore,
    borderMean,
    interiorMean,
    contrast,
    corners,
    rejectionReasons,
  };
}

export async function detectMarkerFromUri(uri: string): Promise<MarkerDetectionResult | null> {
  const response = await fetch(uri);
  if (!response.ok) {
    console.warn('[MarkerProcessing] failed to fetch image', uri);
    return null;
  }
  const arrayBuffer = await response.arrayBuffer();
  const input = new Uint8Array(arrayBuffer);
  const jpegImage = decodeJpeg(input, { useTArray: true, formatAsRGBA: true });
  const detection = detectMarker(jpegImage.width, jpegImage.height, jpegImage.data);

  if (!detection) {
    return null;
  }

  return {
    ...detection,
    normalizedMarker: {
      ...detection.normalizedMarker,
      sourceUri: uri,
    },
  };
}

export function detectMarker(
  sourceWidth: number,
  sourceHeight: number,
  rgba: Uint8Array,
): MarkerDetectionResult | null {
  const { gray, width, height } = downscaleToGrayscale(rgba, sourceWidth, sourceHeight);
  const threshold = computeOtsuThreshold(gray);
  const mask = thresholdImage(gray, threshold);
  const regions = collectRegions(mask, width, height);

  if (regions.length === 0) {
    console.warn('[MarkerProcessing] no dark regions found');
    return null;
  }

  const candidates = regions.map((region) => evaluateCandidate(gray, mask, width, height, region));
  const accepted = candidates.filter((candidate) => candidate.rejectionReasons.length === 0);

  if (accepted.length === 0) {
    candidates.forEach((candidate) => {
      console.warn('[MarkerProcessing] rejected candidate', {
        boundingBox: candidate.boundingBox,
        area: candidate.area,
        aspectRatio: candidate.aspectRatio.toFixed(2),
        contrast: candidate.contrast.toFixed(1),
        borderScore: candidate.borderScore.toFixed(1),
        rejectionReasons: candidate.rejectionReasons,
      });
    });
    return null;
  }

  const bestCandidate = accepted.sort((a, b) => {
    const scoreA = a.area * (a.borderScore + 1);
    const scoreB = b.area * (b.borderScore + 1);
    return scoreB - scoreA;
  })[0];

  const scaleX = sourceWidth / width;
  const scaleY = sourceHeight / height;
  const originalCorners: [Point, Point, Point, Point] = bestCandidate.corners.map((corner) => ({
    x: corner.x * scaleX,
    y: corner.y * scaleY,
  })) as [Point, Point, Point, Point];

  const normalizedRgba = warpToSquare(rgba, sourceWidth, sourceHeight, originalCorners, NORMALIZED_MARKER_SIZE);
  const normalizedDataUrl = rgbaToDataUrl(normalizedRgba, NORMALIZED_MARKER_SIZE, NORMALIZED_MARKER_SIZE);

  return {
    candidate: bestCandidate,
    sourceWidth,
    sourceHeight,
    downscaledWidth: width,
    downscaledHeight: height,
    normalizedMarker: {
      dataUrl: normalizedDataUrl,
      width: NORMALIZED_MARKER_SIZE,
      height: NORMALIZED_MARKER_SIZE,
      sourceUri: '',
      corners: originalCorners,
    },
  };
}
