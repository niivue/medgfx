/**
 * MATLAB file format utilities for medgfx
 * Supports MATLAB v4 .mat files
 */

import { decompress } from './compression'
import type { TypedNumberArray } from '../types/utils'

/**
 * Reads MATLAB v4 .mat file format
 * @param buffer - ArrayBuffer containing .mat file data
 * @param isReplaceDots - Replace dots in variable names with underscores (for DSI Studio compatibility)
 * @returns Object mapping variable names to typed arrays
 */
export async function readMatV4(
  buffer: ArrayBuffer,
  isReplaceDots: boolean = false
): Promise<Record<string, TypedNumberArray>> {
  let len = buffer.byteLength
  if (len < 40) {
    throw new Error('File too small to be MAT v4: bytes = ' + buffer.byteLength)
  }
  let reader = new DataView(buffer)
  let magic = reader.getUint16(0, true)
  let _buffer = buffer
  if (magic === 35615 || magic === 8075) {
    // gzip signature 0x1F8B in little and big endian
    const raw = await decompress(new Uint8Array(buffer))
    const rawBuffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
    reader = new DataView(rawBuffer)
    magic = reader.getUint16(0, true)
    _buffer = rawBuffer
    len = _buffer.byteLength
  }
  const textDecoder = new TextDecoder('utf-8')
  const bytes = new Uint8Array(_buffer)
  let pos = 0
  const mat: Record<string, TypedNumberArray> = {}

  function getTensDigit(v: number): number {
    return Math.floor(v / 10) % 10
  }

  function readArray(tagDataType: number, tagBytesStart: number, tagBytesEnd: number): TypedNumberArray {
    const byteArray = new Uint8Array(bytes.subarray(tagBytesStart, tagBytesEnd))
    if (tagDataType === 1) {
      return new Float32Array(byteArray.buffer)
    }
    if (tagDataType === 2) {
      return new Int32Array(byteArray.buffer)
    }
    if (tagDataType === 3) {
      return new Int16Array(byteArray.buffer)
    }
    if (tagDataType === 4) {
      return new Uint16Array(byteArray.buffer)
    }
    if (tagDataType === 5) {
      return new Uint8Array(byteArray.buffer)
    }
    return new Float64Array(byteArray.buffer)
  }

  function readTag(): void {
    // Validate we have enough bytes to read the header
    if (pos + 20 > len) {
      throw new Error(
        `Cannot read MATLAB v4 header at offset ${pos}: ` +
        `need 20 bytes but only ${len - pos} bytes remaining. ` +
        'File is truncated or corrupted.'
      )
    }

    const mtype = reader.getUint32(pos, true)
    const mrows = reader.getUint32(pos + 4, true)
    const ncols = reader.getUint32(pos + 8, true)
    const imagf = reader.getUint32(pos + 12, true)
    const namlen = reader.getUint32(pos + 16, true)
    pos += 20 // skip header

    // Validate header values
    if (imagf !== 0) {
      throw new Error('MATLAB V4 reader does not support imaginary numbers')
    }
    const tagArrayItems = mrows * ncols
    if (tagArrayItems < 1) {
      throw new Error(
        `Invalid matrix dimensions ${mrows}x${ncols} in MATLAB v4 file. ` +
        'Both rows and columns must be > 0.'
      )
    }
    if (namlen > 256) {
      throw new Error(
        `Suspicious variable name length ${namlen} in MATLAB v4 file. ` +
        'Expected < 256 characters. File may be corrupted.'
      )
    }

    // Validate name can be read
    if (pos + namlen > len) {
      throw new Error(
        `Cannot read variable name at offset ${pos}: ` +
        `need ${namlen} bytes but only ${len - pos} bytes remaining. ` +
        'MATLAB v4 file is truncated.'
      )
    }

    const byteArray = new Uint8Array(bytes.subarray(pos, pos + namlen))
    let tagName = textDecoder.decode(byteArray).trim().replaceAll('\x00', '')
    if (isReplaceDots) {
      // kludge for invalid DSI studio FZ files
      tagName = tagName.replaceAll('.', '_')
    }
    const tagDataType = getTensDigit(mtype)

    // Validate data type
    if (tagDataType > 5) {
      throw new Error(
        `Invalid MATLAB type code ${tagDataType} in MAT v4 file. ` +
        'Expected value 0-5. File may be corrupted.'
      )
    }

    // 0 double-precision (64-bit) floating-point numbers
    // 1 single-precision (32-bit) floating-point numbers
    // 2 32-bit signed integers
    // 3 16-bit signed integers
    // 4 16-bit unsigned integers
    // 5 8-bit unsigned integers
    let tagBytesPerItem = 8
    if (tagDataType >= 1 && tagDataType <= 2) {
      tagBytesPerItem = 4
    } else if (tagDataType >= 3 && tagDataType <= 4) {
      tagBytesPerItem = 2
    } else if (tagDataType === 5) {
      tagBytesPerItem = 1
    } else if (tagDataType !== 0) {
      throw new Error(`Unsupported MATLAB v4 datatype ${tagDataType}`)
    }

    pos += namlen // skip name

    if (mtype > 50) {
      throw new Error('Does not appear to be little-endian V4 Matlab file')
    }

    const totalDataBytes = tagArrayItems * tagBytesPerItem
    const posEnd = pos + totalDataBytes

    // Validate data can be read
    if (posEnd > len) {
      throw new Error(
        `Cannot read matrix data for variable "${tagName}" at offset ${pos}: ` +
        `need ${totalDataBytes} bytes (${mrows}x${ncols} elements of ${tagBytesPerItem} bytes each) ` +
        `but only ${len - pos} bytes remaining. MATLAB v4 file is truncated.`
      )
    }

    mat[tagName] = readArray(tagDataType, pos, posEnd)
    pos = posEnd
  }

  while (pos + 20 < len) {
    readTag()
  }
  return mat
}
