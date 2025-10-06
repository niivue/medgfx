/**
 * Compression and decompression type definitions
 */

/**
 * ZIP file entry metadata
 */
export interface ZipEntry {
  signature: string
  version: number
  generalPurpose: number
  compressionMethod: number
  lastModifiedTime: number
  lastModifiedDate: number
  crc: number
  compressedSize: number
  uncompressedSize: number
  fileNameLength: number
  extraLength: number
  fileName: string
  extra: string
  startsAt?: number
  extract?: () => Promise<Uint8Array>
}

/**
 * ZIP central directory entry metadata
 */
export interface CentralDirectoryEntry {
  versionCreated: number
  versionNeeded: number
  fileNameLength: number
  extraLength: number
  fileCommentLength: number
  diskNumber: number
  internalAttributes: number
  externalAttributes: number
  offset: number
  comments: string
}

/**
 * ZIP end of central directory record
 */
export interface EndOfCentralDirectory {
  numberOfDisks: number
  centralDirectoryStartDisk: number
  numberCentralDirectoryRecordsOnThisDisk: number
  numberCentralDirectoryRecords: number
  centralDirectorySize: number
  centralDirectoryOffset: number
  commentLength: number
  comment: string
}
