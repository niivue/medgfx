/**
 * medgfx utilities
 * Organized utility functions for medical imaging graphics
 */

// Compression utilities
export { ZipReader, decompress, decompressToBuffer, compress, isArrayBufferCompressed } from './compression'
export type { ZipEntry } from './compression'

// Encoding utilities
export {
  arrayBufferToBase64,
  base64ToUint8,
  uint8ToBase64,
  decompressBase64String,
  compressToBase64String,
  compressStringToArrayBuffer,
  decompressArrayBuffer,
  stringToUint8,
  uint8ToString
} from './encoding'

// File I/O utilities
export { download, readFileAsync, blobToBase64 } from './file-io'

// MATLAB format utilities
export { readMatV4 } from './matlab'

// Math utilities
export { arraysAreEqual, range, sph2cartDeg, vox2mm, clamp, deg2rad } from './math'

// Vector utilities
export { getFirstPerpVector } from './vector'

// Mesh utilities
export { subdivideSphereMesh, weldVertices } from './mesh'
