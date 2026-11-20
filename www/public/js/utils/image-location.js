'use strict';

const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0, 0];

export async function readImageExifCoordinates(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const tiffOffset = findTiffOffset(bytes, view);
  if (tiffOffset == null) return null;

  const coordinates = parseTiffGps(view, tiffOffset);
  if (!coordinates) return null;
  const { latitude, longitude } = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return {
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
  };
}

function findTiffOffset(bytes, view) {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 4 <= bytes.length;) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      offset += 2;
      if (marker === 0xda || marker === 0xd9) return null;
      if (offset + 2 > bytes.length) return null;
      const segmentLength = view.getUint16(offset, false);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
      const dataOffset = offset + 2;
      if (marker === 0xe1 && hasBytes(bytes, dataOffset, EXIF_SIGNATURE)) {
        return dataOffset + EXIF_SIGNATURE.length;
      }
      offset += segmentLength;
    }
    return null;
  }

  if (bytes.length >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47) {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const chunkLength = view.getUint32(offset, false);
      const dataOffset = offset + 8;
      if (dataOffset + chunkLength + 4 > bytes.length) return null;
      if (ascii(bytes, offset + 4, 4) === 'eXIf') return dataOffset;
      offset = dataOffset + chunkLength + 4;
    }
    return null;
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF'
      && ascii(bytes, 8, 4) === 'WEBP') {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunkType = ascii(bytes, offset, 4);
      const chunkLength = view.getUint32(offset + 4, true);
      const dataOffset = offset + 8;
      if (dataOffset + chunkLength > bytes.length) return null;
      if (chunkType === 'EXIF') {
        return hasBytes(bytes, dataOffset, EXIF_SIGNATURE)
          ? dataOffset + EXIF_SIGNATURE.length
          : dataOffset;
      }
      offset = dataOffset + chunkLength + (chunkLength % 2);
    }
  }
  return null;
}

function parseTiffGps(view, tiffOffset) {
  if (tiffOffset + 8 > view.byteLength) return null;
  const byteOrder = ascii(new Uint8Array(view.buffer), tiffOffset, 2);
  if (byteOrder !== 'II' && byteOrder !== 'MM') return null;
  const littleEndian = byteOrder === 'II';
  if (view.getUint16(tiffOffset + 2, littleEndian) !== 42) return null;

  const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
  const gpsIfdOffset = findIfdValue(view, tiffOffset, ifdOffset, 0x8825, littleEndian);
  if (gpsIfdOffset == null) return null;

  const latitudeRef = readAsciiValue(
    view, tiffOffset, gpsIfdOffset, 1, littleEndian);
  const latitudeParts = readRationalArray(
    view, tiffOffset, gpsIfdOffset, 2, littleEndian);
  const longitudeRef = readAsciiValue(
    view, tiffOffset, gpsIfdOffset, 3, littleEndian);
  const longitudeParts = readRationalArray(
    view, tiffOffset, gpsIfdOffset, 4, littleEndian);
  if (!latitudeRef || !longitudeRef || !latitudeParts || !longitudeParts) return null;

  const latitude = toDecimal(latitudeParts, latitudeRef, 'N', 'S');
  const longitude = toDecimal(longitudeParts, longitudeRef, 'E', 'W');
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function findIfdValue(view, tiffOffset, ifdOffset, tag, littleEndian) {
  const count = readUint16(view, ifdOffset, littleEndian);
  if (count == null || ifdOffset + 2 + count * 12 > view.byteLength) return null;
  for (let index = 0; index < count; index++) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (view.getUint16(entryOffset, littleEndian) === tag) {
      if (view.getUint16(entryOffset + 2, littleEndian) !== 4
          || view.getUint32(entryOffset + 4, littleEndian) !== 1) return null;
      const relativeOffset = view.getUint32(entryOffset + 8, littleEndian);
      return tiffOffset + relativeOffset < view.byteLength
        ? tiffOffset + relativeOffset
        : null;
    }
  }
  return null;
}

function readAsciiValue(view, tiffOffset, ifdOffset, tag, littleEndian) {
  const entry = findGpsEntry(view, ifdOffset, tag, littleEndian);
  if (!entry || entry.type !== 2 || entry.count < 1) return null;
  const offset = entry.count <= 4 ? entry.entryOffset + 8
    : tiffOffset + view.getUint32(entry.entryOffset + 8, littleEndian);
  if (offset + entry.count > view.byteLength) return null;
  let value = '';
  for (let i = 0; i < entry.count; i++) {
    const character = view.getUint8(offset + i);
    if (character === 0) break;
    value += String.fromCharCode(character);
  }
  return value;
}

function readRationalArray(view, tiffOffset, ifdOffset, tag, littleEndian) {
  const entry = findGpsEntry(view, ifdOffset, tag, littleEndian);
  if (!entry || entry.type !== 5 || entry.count !== 3) return null;
  const offset = tiffOffset + view.getUint32(entry.entryOffset + 8, littleEndian);
  if (offset + entry.count * 8 > view.byteLength) return null;
  const values = [];
  for (let i = 0; i < entry.count; i++) {
    const numerator = view.getUint32(offset + i * 8, littleEndian);
    const denominator = view.getUint32(offset + i * 8 + 4, littleEndian);
    if (!denominator) return null;
    values.push(numerator / denominator);
  }
  return values;
}

function findGpsEntry(view, ifdOffset, tag, littleEndian) {
  const count = readUint16(view, ifdOffset, littleEndian);
  if (count == null || ifdOffset + 2 + count * 12 > view.byteLength) return null;
  for (let index = 0; index < count; index++) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (view.getUint16(entryOffset, littleEndian) === tag) {
      return {
        entryOffset,
        type: view.getUint16(entryOffset + 2, littleEndian),
        count: view.getUint32(entryOffset + 4, littleEndian),
      };
    }
  }
  return null;
}

function readUint16(view, offset, littleEndian) {
  return offset + 2 <= view.byteLength
    ? view.getUint16(offset, littleEndian)
    : null;
}

function toDecimal(parts, reference, positive, negative) {
  if (parts.some(value => !Number.isFinite(value) || value < 0)
      || parts[1] >= 60 || parts[2] >= 60
      || (reference !== positive && reference !== negative)) {
    return null;
  }
  const value = parts[0] + parts[1] / 60 + parts[2] / 3600;
  return reference === negative ? -value : value;
}

function hasBytes(bytes, offset, expected) {
  return offset + expected.length <= bytes.length
    && expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes, offset, length) {
  if (offset + length > bytes.length) return '';
  let value = '';
  for (let index = 0; index < length; index++) {
    value += String.fromCharCode(bytes[offset + index]);
  }
  return value;
}
