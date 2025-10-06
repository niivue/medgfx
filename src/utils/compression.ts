/**
 * Compression and decompression utilities for medgfx
 * Supports gzip, deflate, deflate-raw, and ZIP formats
 */

import type { ZipEntry, CentralDirectoryEntry, EndOfCentralDirectory } from '../types/compression'

export type { ZipEntry }

/**
 * Maximum decompressed size for medical imaging files (2GB)
 * Prevents ZIP bomb attacks and excessive memory usage
 */
const MAX_DECOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024

/**
 * Maximum individual ZIP entry size (500MB)
 * Large medical imaging files should be chunked if exceeding this
 */
const MAX_INDIVIDUAL_ENTRY_SIZE = 500 * 1024 * 1024

/**
 * ZIP file reader with support for data descriptors and ZIP64
 * Uses asynchronous compression streams API
 */
export class ZipReader {
  #dataView: DataView
  #index: number = 0
  #localFiles: ZipEntry[] = []
  #centralDirectories: CentralDirectoryEntry[] = []
  #endOfCentralDirectory?: EndOfCentralDirectory

  constructor(arrayBuffer: ArrayBuffer) {
    this.#dataView = new DataView(arrayBuffer)
    this.read()
  }

  async extract(entry: ZipEntry): Promise<Uint8Array> {
    // Validate uncompressed size to prevent ZIP bombs
    if (entry.uncompressedSize > MAX_INDIVIDUAL_ENTRY_SIZE) {
      throw new Error(
        `ZIP entry "${entry.fileName}" exceeds maximum size: ` +
        `${(entry.uncompressedSize / 1024 / 1024).toFixed(2)}MB > ${MAX_INDIVIDUAL_ENTRY_SIZE / 1024 / 1024}MB. ` +
        'Medical imaging files this large should be chunked or streamed.'
      )
    }

    const buffer = new Uint8Array(this.#dataView.buffer.slice(entry.startsAt!, entry.startsAt! + entry.compressedSize))

    if (entry.compressionMethod === 0x00) {
      // Uncompressed
      if (buffer.byteLength !== entry.uncompressedSize) {
        throw new Error(
          `ZIP entry "${entry.fileName}" size mismatch: ` +
          `expected ${entry.uncompressedSize} bytes but got ${buffer.byteLength} bytes. ` +
          'Medical imaging data may be corrupted.'
        )
      }
      return buffer
    } else if (entry.compressionMethod === 0x08) {
      // Deflate
      const stream = new DecompressionStream('deflate-raw')
      const writer = stream.writable.getWriter()
      await writer.write(buffer as BufferSource)
      await writer.close()
      const response = new Response(stream.readable)
      const result = new Uint8Array(await response.arrayBuffer())

      // Validate decompressed data matches expected size
      if (result.byteLength !== entry.uncompressedSize) {
        throw new Error(
          `ZIP entry "${entry.fileName}" decompression size mismatch: ` +
          `expected ${entry.uncompressedSize} bytes but got ${result.byteLength} bytes. ` +
          'Medical imaging data may be corrupted.'
        )
      }

      return result
    }
    throw new Error(
      `Unsupported compression method ${entry.compressionMethod} for ZIP entry "${entry.fileName}". ` +
      'Medical imaging files must use uncompressed (0x00) or deflate (0x08) compression.'
    )
  }

  private read(): void {
    while (!this.#endOfCentralDirectory && this.#index < this.#dataView.byteLength) {
      const signature = this.#dataView.getUint32(this.#index, true)
      if (signature === 0x04034b50) {
        const entry = this.readLocalFile(this.#index)
        entry.extract = this.extract.bind(this, entry)
        this.#localFiles.push(entry)
        const hasDataDescriptor = (entry.generalPurpose & 0x0008) !== 0
        entry.startsAt = this.#index + 30 + entry.fileNameLength + entry.extraLength
        if (entry.compressedSize === 0 && hasDataDescriptor) {
          let scanIndex = entry.startsAt
          while (scanIndex! + 20 <= this.#dataView.byteLength) {
            const possibleSignature = this.#dataView.getUint32(scanIndex!, true)
            if (possibleSignature === 0x08074b50) {
              const nextPK = this.#dataView.getUint16(scanIndex! + 16, true) === 0x4b50
              if (nextPK) {
                scanIndex! += 4
                break
              }
            }
            scanIndex!++
          }
          entry.crc = this.#dataView.getUint32(scanIndex!, true)
          entry.compressedSize = this.#dataView.getUint32(scanIndex! + 4, true)
          entry.uncompressedSize = this.#dataView.getUint32(scanIndex! + 8, true)
          this.#index = scanIndex! + 12
        } else {
          this.#index = entry.startsAt + entry.compressedSize
        }
      } else if (signature === 0x02014b50) {
        const entry = this.readCentralDirectory(this.#index)
        this.#centralDirectories.push(entry)
        this.#index += 46 + entry.fileNameLength + entry.extraLength + entry.fileCommentLength
      } else if (signature === 0x06054b50) {
        this.#endOfCentralDirectory = this.readEndCentralDirectory(this.#index)
        break
      } else if (signature === 0x06064b50) {
        this.#endOfCentralDirectory = this.readEndCentralDirectory64(this.#index)
        break
      } else {
        console.error(`Unexpected ZIP signature 0x${signature.toString(16).padStart(8, '0')} at index ${this.#index}`)
        break
      }
    }
  }

  private readLocalFile(offset: number): ZipEntry {
    let compressedSize = this.#dataView.getUint32(offset + 18, true)
    let uncompressedSize = this.#dataView.getUint32(offset + 22, true)
    const fileNameLength = this.#dataView.getUint16(offset + 26, true)
    const extraLength = this.#dataView.getUint16(offset + 28, true)
    const extraOffset = offset + 30 + fileNameLength
    const extra = this.readString(extraOffset, extraLength)
    if (compressedSize === 0xffffffff && uncompressedSize === 0xffffffff) {
      let zip64Offset = extraOffset
      let foundZip64 = false
      while (zip64Offset < extraOffset + extraLength - 4) {
        const fieldSignature = this.#dataView.getUint16(zip64Offset, true)
        const fieldLength = this.#dataView.getUint16(zip64Offset + 2, true)
        zip64Offset += 4
        if (fieldSignature === 0x0001) {
          if (fieldLength >= 16) {
            uncompressedSize = Number(this.#dataView.getBigUint64(zip64Offset, true))
            zip64Offset += 8
            compressedSize = Number(this.#dataView.getBigUint64(zip64Offset, true))
            foundZip64 = true
            break
          } else {
            throw new Error(
              `ZIP64 extra field found but is too small (expected at least 16 bytes, got ${fieldLength}).`
            )
          }
        }
        zip64Offset += fieldLength
      }
      if (!foundZip64) {
        throw new Error('ZIP64 format missing extra field with signature 0x0001.')
      }
    }
    return {
      signature: this.readString(offset, 4),
      version: this.#dataView.getUint16(offset + 4, true),
      generalPurpose: this.#dataView.getUint16(offset + 6, true),
      compressionMethod: this.#dataView.getUint16(offset + 8, true),
      lastModifiedTime: this.#dataView.getUint16(offset + 10, true),
      lastModifiedDate: this.#dataView.getUint16(offset + 12, true),
      crc: this.#dataView.getUint32(offset + 14, true),
      compressedSize,
      uncompressedSize,
      fileNameLength,
      extraLength,
      fileName: this.readString(offset + 30, fileNameLength),
      extra: this.readString(offset + 30 + fileNameLength, extraLength)
    }
  }

  private readCentralDirectory(offset: number): CentralDirectoryEntry {
    return {
      versionCreated: this.#dataView.getUint16(offset + 4, true),
      versionNeeded: this.#dataView.getUint16(offset + 6, true),
      fileNameLength: this.#dataView.getUint16(offset + 28, true),
      extraLength: this.#dataView.getUint16(offset + 30, true),
      fileCommentLength: this.#dataView.getUint16(offset + 32, true),
      diskNumber: this.#dataView.getUint16(offset + 34, true),
      internalAttributes: this.#dataView.getUint16(offset + 36, true),
      externalAttributes: this.#dataView.getUint32(offset + 38, true),
      offset: this.#dataView.getUint32(offset + 42, true),
      comments: this.readString(offset + 46, this.#dataView.getUint16(offset + 32, true))
    }
  }

  private readEndCentralDirectory(offset: number): EndOfCentralDirectory {
    const commentLength = this.#dataView.getUint16(offset + 20, true)
    return {
      numberOfDisks: this.#dataView.getUint16(offset + 4, true),
      centralDirectoryStartDisk: this.#dataView.getUint16(offset + 6, true),
      numberCentralDirectoryRecordsOnThisDisk: this.#dataView.getUint16(offset + 8, true),
      numberCentralDirectoryRecords: this.#dataView.getUint16(offset + 10, true),
      centralDirectorySize: this.#dataView.getUint32(offset + 12, true),
      centralDirectoryOffset: this.#dataView.getUint32(offset + 16, true),
      commentLength,
      comment: this.readString(offset + 22, commentLength)
    }
  }

  private readEndCentralDirectory64(offset: number): EndOfCentralDirectory {
    const commentLength = Number(this.#dataView.getBigUint64(offset + 0, true))
    return {
      numberOfDisks: this.#dataView.getUint32(offset + 16, true),
      centralDirectoryStartDisk: this.#dataView.getUint32(offset + 20, true),
      numberCentralDirectoryRecordsOnThisDisk: Number(this.#dataView.getBigUint64(offset + 24, true)),
      numberCentralDirectoryRecords: Number(this.#dataView.getBigUint64(offset + 32, true)),
      centralDirectorySize: Number(this.#dataView.getBigUint64(offset + 40, true)),
      centralDirectoryOffset: Number(this.#dataView.getBigUint64(offset + 48, true)),
      commentLength,
      comment: ''
    }
  }

  private readString(offset: number, length: number): string {
    return Array.from({ length }, (_, i) => String.fromCharCode(this.#dataView.getUint8(offset + i))).join('')
  }

  get entries(): ZipEntry[] {
    return this.#localFiles
  }
}

/**
 * Automatically detects compression format and decompresses data
 *
 * CRITICAL: Validates input and output to prevent data loss in medical imaging workflows
 *
 * Supports gzip, deflate, and deflate-raw
 * @param data - Compressed data to decompress
 * @returns Decompressed data
 * @throws {Error} If input is empty, output is empty, or size exceeds limits
 */
export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  // Validate input is not empty
  if (!data || data.byteLength === 0) {
    throw new Error(
      'Cannot decompress empty data. ' +
      'Medical imaging files must contain data.'
    )
  }

  const format =
    data[0] === 31 && data[1] === 139 && data[2] === 8
      ? 'gzip'
      : data[0] === 120 && (data[1] === 1 || data[1] === 94 || data[1] === 156 || data[1] === 218)
        ? 'deflate'
        : 'deflate-raw'

  const stream = new DecompressionStream(format)
  const writer = stream.writable.getWriter()
  await writer.write(data as BufferSource)
  await writer.close()
  const response = new Response(stream.readable)
  const result = new Uint8Array(await response.arrayBuffer())

  // CRITICAL: Validate decompressed data is not empty (data loss prevention)
  if (result.byteLength === 0) {
    throw new Error(
      `Decompression failed: output is empty for ${data.byteLength} byte input (format: ${format}). ` +
      'Medical imaging data has been lost. File may be corrupted or use unsupported compression.'
    )
  }

  // Validate decompressed size doesn't exceed safety limits (ZIP bomb protection)
  if (result.byteLength > MAX_DECOMPRESSED_SIZE) {
    throw new Error(
      `Decompressed data exceeds maximum size: ` +
      `${(result.byteLength / 1024 / 1024 / 1024).toFixed(2)}GB > ${MAX_DECOMPRESSED_SIZE / 1024 / 1024 / 1024}GB. ` +
      'This may be a ZIP bomb attack or corrupted medical imaging file.'
    )
  }

  return result
}

/**
 * Decompresses data and returns as ArrayBuffer
 */
export async function decompressToBuffer(data: Uint8Array): Promise<ArrayBuffer> {
  const decompressed = await decompress(data)
  return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength) as ArrayBuffer
}

/**
 * Compresses data using specified format
 */
export async function compress(data: Uint8Array, format: CompressionFormat = 'gzip'): Promise<ArrayBuffer> {
  const stream = new CompressionStream(format)
  const writer = stream.writable.getWriter()
  await writer.write(data as BufferSource)
  await writer.close()
  const response = new Response(stream.readable)
  const result = await response.arrayBuffer()
  return result
}

/**
 * Checks if an ArrayBuffer contains compressed data (gzip format)
 */
export function isArrayBufferCompressed(buffer: ArrayBuffer | undefined): boolean {
  if (buffer && buffer.byteLength >= 2) {
    const arr = new Uint8Array(buffer)
    const magicNumber = (arr[0]! << 8) | arr[1]!
    return magicNumber === 0x1f8b
  }
  return false
}
