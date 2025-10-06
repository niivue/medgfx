/**
 * Encoding and decoding utilities for medgfx
 * Handles base64, UTF-8, and binary conversions
 */

import { compress, decompress } from './compression'

/**
 * Maximum size for base64 encoding/decoding (100MB)
 * Prevents excessive memory usage with large medical imaging files
 */
const MAX_BASE64_SIZE = 100 * 1024 * 1024

/**
 * Converts ArrayBuffer to base64 string
 * @param arrayBuffer - Binary data to encode
 * @returns Base64-encoded string
 * @throws {Error} If input exceeds size limit
 */
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  if (arrayBuffer.byteLength > MAX_BASE64_SIZE) {
    throw new Error(
      `ArrayBuffer too large for base64 encoding: ` +
      `${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB > ${MAX_BASE64_SIZE / 1024 / 1024}MB. ` +
      'Large medical imaging files should use binary transfer instead of base64.'
    )
  }

  const bytes = new Uint8Array(arrayBuffer)
  return uint8ToBase64(bytes)
}

/**
 * Converts base64 string to Uint8Array
 * @param base64 - Base64-encoded string
 * @returns Decoded binary data
 * @throws {Error} If decoded size exceeds limit
 */
export function base64ToUint8(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const length = binaryString.length

  if (length > MAX_BASE64_SIZE) {
    throw new Error(
      `Base64 decoded size too large: ` +
      `${(length / 1024 / 1024).toFixed(2)}MB > ${MAX_BASE64_SIZE / 1024 / 1024}MB. ` +
      'Large medical imaging files should use binary transfer instead of base64.'
    )
  }

  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Converts Uint8Array to base64 string
 * Implementation from: https://gist.github.com/jonleighton/958841 (MIT License)
 * @param bytes - Binary data to encode
 * @returns Base64-encoded string
 * @throws {Error} If input exceeds size limit
 */
export function uint8ToBase64(bytes: Uint8Array): string {
  if (bytes.byteLength > MAX_BASE64_SIZE) {
    throw new Error(
      `Uint8Array too large for base64 encoding: ` +
      `${(bytes.byteLength / 1024 / 1024).toFixed(2)}MB > ${MAX_BASE64_SIZE / 1024 / 1024}MB. ` +
      'Large medical imaging files should use binary transfer instead of base64.'
    )
  }

  let base64 = ''
  const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const byteLength = bytes.byteLength
  const byteRemainder = byteLength % 3
  const mainLength = byteLength - byteRemainder

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    const byte1 = bytes[i] ?? 0
    const byte2 = bytes[i + 1] ?? 0
    const byte3 = bytes[i + 2] ?? 0
    const chunk = (byte1 << 16) | (byte2 << 8) | byte3

    // Use bitmasks to extract 6-bit segments from the triplet
    const a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    const b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
    const c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
    const d = chunk & 63 // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += (encodings[a] ?? '') + (encodings[b] ?? '') + (encodings[c] ?? '') + (encodings[d] ?? '')
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    const chunk = bytes[mainLength] ?? 0
    const a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    const b = (chunk & 3) << 4 // 3   = 2^2 - 1

    base64 += (encodings[a] ?? '') + (encodings[b] ?? '') + '=='
  } else if (byteRemainder === 2) {
    const byte1 = bytes[mainLength] ?? 0
    const byte2 = bytes[mainLength + 1] ?? 0
    const chunk = (byte1 << 8) | byte2

    const a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    const b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    const c = (chunk & 15) << 2 // 15    = 2^4 - 1

    base64 += (encodings[a] ?? '') + (encodings[b] ?? '') + (encodings[c] ?? '') + '='
  }

  return base64
}

/**
 * Decompresses base64-encoded compressed string
 */
export async function decompressBase64String(base64: string): Promise<string> {
  const compressed = atob(base64)
  const compressedBuffer = new ArrayBuffer(compressed.length)
  const compressedView = new Uint8Array(compressedBuffer)
  for (let i = 0; i < compressed.length; i++) {
    compressedView[i] = compressed.charCodeAt(i)
  }
  return decompressArrayBuffer(compressedView.buffer)
}

/**
 * Compresses string and returns base64-encoded result
 */
export async function compressToBase64String(string: string): Promise<string> {
  const buf = await compressStringToArrayBuffer(string)
  return uint8ToBase64(new Uint8Array(buf))
}

/**
 * Compresses string to ArrayBuffer
 */
export async function compressStringToArrayBuffer(input: string): Promise<ArrayBuffer> {
  const uint8Array = stringToUint8(input)
  return await compress(uint8Array)
}

/**
 * Decompresses ArrayBuffer to string
 */
export async function decompressArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const decompressed = await decompress(new Uint8Array(buffer))
  return uint8ToString(decompressed)
}

/**
 * Converts string to Uint8Array with UTF-8 encoding
 * Implementation from 101arrowz/fflate (MIT License)
 */
export function stringToUint8(str: string, latin1?: boolean): Uint8Array {
  if (latin1) {
    const ar = new Uint8Array(str.length)
    for (let i = 0; i < str.length; ++i) {
      ar[i] = str.charCodeAt(i)
    }
    return ar
  }
  const l = str.length
  const slc = (v: Uint8Array, s: number, e?: number): Uint8Array => {
    if (s == null || s < 0) {
      s = 0
    }
    if (e == null || e > v.length) {
      e = v.length
    }
    return new Uint8Array(v.subarray(s, e))
  }
  let ar = new Uint8Array(str.length + (str.length >> 1))
  let ai = 0
  const w = (v: number): void => {
    ar[ai++] = v
  }
  for (let i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      const n = new Uint8Array(ai + 8 + ((l - i) << 1))
      n.set(ar)
      ar = n
    }
    let c = str.charCodeAt(i)
    if (c < 128 || latin1) {
      w(c)
    } else if (c < 2048) {
      w(192 | (c >> 6))
      w(128 | (c & 63))
    } else if (c > 55295 && c < 57344) {
      c = (65536 + (c & (1023 << 10))) | (str.charCodeAt(++i) & 1023)
      w(240 | (c >> 18))
      w(128 | ((c >> 12) & 63))
      w(128 | ((c >> 6) & 63))
      w(128 | (c & 63))
    } else {
      c = (65536 + (c & (1023 << 10))) | (str.charCodeAt(++i) & 1023)
      w(240 | (c >> 18))
      w(128 | ((c >> 12) & 63))
      w(128 | ((c >> 6) & 63))
      w(128 | (c & 63))
    }
  }
  return slc(ar, 0, ai)
}

/**
 * Converts Uint8Array to string with UTF-8 decoding
 * Implementation from 101arrowz/fflate (MIT License)
 * @param dat - Binary data to decode
 * @param latin1 - Use Latin-1 encoding instead of UTF-8
 * @returns Decoded string
 */
export function uint8ToString(dat: Uint8Array, latin1?: boolean): string {
  if (latin1) {
    let r = ''
    for (let i = 0; i < dat.length; i += 16384) {
      r += String.fromCharCode(...Array.from(dat.subarray(i, i + 16384)))
    }
    return r
  }
  const slc = (v: Uint8Array, s: number, e?: number): Uint8Array => {
    if (s == null || s < 0) {
      s = 0
    }
    if (e == null || e > v.length) {
      e = v.length
    }
    return new Uint8Array(v.subarray(s, e))
  }
  const dutf8 = (d: Uint8Array): { s: string; r: Uint8Array } => {
    let result = ''
    for (let i = 0; i < d.length; ) {
      const c = d[i++]
      if (c === undefined) {
        return { s: result, r: slc(d, i - 1) }
      }
      const eb = ((c > 127) as unknown as number) + ((c > 223) as unknown as number) + ((c > 239) as unknown as number)
      if (i + eb > d.length) {
        return { s: result, r: slc(d, i - 1) }
      }
      if (!eb) {
        result += String.fromCharCode(c)
      } else if (eb === 3) {
        const b1 = d[i++] ?? 0
        const b2 = d[i++] ?? 0
        const b3 = d[i++] ?? 0
        const codePoint = (((c & 15) << 18) | ((b1 & 63) << 12) | ((b2 & 63) << 6) | (b3 & 63)) - 65536
        result += String.fromCharCode(55296 | (codePoint >> 10), 56320 | (codePoint & 1023))
      } else if (eb & 1) {
        const b1 = d[i++] ?? 0
        result += String.fromCharCode(((c & 31) << 6) | (b1 & 63))
      } else {
        const b1 = d[i++] ?? 0
        const b2 = d[i++] ?? 0
        result += String.fromCharCode(((c & 15) << 12) | ((b1 & 63) << 6) | (b2 & 63))
      }
    }
    return { s: result, r: new Uint8Array(0) }
  }
  const { s, r } = dutf8(dat)
  if (r.length) {
    throw new Error('Unexpected trailing bytes in UTF-8 decoding')
  }
  return s
}
