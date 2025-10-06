/**
 * File I/O utilities for medgfx
 * Handles file reading, downloading, and blob operations
 */

/**
 * Downloads content as a file in the browser
 * @param content - File content (string or binary data)
 * @param fileName - Name for downloaded file
 * @param contentType - MIME type (e.g., 'application/dicom', 'application/octet-stream')
 * @throws {Error} If content is empty or fileName is invalid
 */
export function download(content: string | ArrayBuffer, fileName: string, contentType: string): void {
  // Validate inputs
  if (!content || (typeof content === 'string' && content.length === 0) ||
      (content instanceof ArrayBuffer && content.byteLength === 0)) {
    throw new Error(
      'Cannot download empty content. ' +
      'Medical imaging files must contain data.'
    )
  }

  if (!fileName || fileName.trim().length === 0) {
    throw new Error(
      'Cannot download file: fileName is required. ' +
      'Provide a descriptive name like "patient_scan.dcm" or "brain_mri.nii.gz".'
    )
  }

  const contentArray = Array.isArray(content) ? content : [content]
  const file = new Blob(contentArray, { type: contentType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = fileName
  a.click()

  // Clean up object URL to prevent memory leaks
  setTimeout(() => URL.revokeObjectURL(a.href), 100)
}

/**
 * Reads a Blob/File as ArrayBuffer asynchronously
 * @param file - Blob or File to read
 * @returns Promise resolving to ArrayBuffer containing file data
 * @throws {Error} If file is empty or read fails
 */
export function readFileAsync(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (!file || file.size === 0) {
      reject(new Error(
        'Cannot read empty file. ' +
        'Medical imaging files must contain data.'
      ))
      return
    }

    const reader = new FileReader()

    reader.onload = (): void => {
      const result = reader.result as ArrayBuffer
      if (!result || result.byteLength === 0) {
        reject(new Error(
          `File read completed but result is empty for ${file.size} byte file. ` +
          'Medical imaging data may be corrupted.'
        ))
        return
      }
      resolve(result)
    }

    reader.onerror = (): void => {
      const fileName = (file as File).name || 'unknown file'
      const fileSize = `${(file.size / 1024 / 1024).toFixed(2)}MB`
      reject(new Error(
        `Failed to read file "${fileName}" (${fileSize}): ${reader.error?.message || 'unknown error'}. ` +
        'Medical imaging file may be inaccessible or corrupted.'
      ))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Converts Blob to base64-encoded data URL
 * @param blob - Blob to convert
 * @returns Promise resolving to data URL (e.g., "data:image/png;base64,...")
 * @throws {Error} If blob is empty or conversion fails
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!blob || blob.size === 0) {
      reject(new Error(
        'Cannot convert empty blob to base64. ' +
        'Medical imaging files must contain data.'
      ))
      return
    }

    const reader = new FileReader()

    reader.onloadend = (): void => {
      const result = reader.result as string
      if (!result || result.length === 0) {
        reject(new Error(
          `Blob to base64 conversion failed for ${blob.size} byte blob. ` +
          'Medical imaging data may be corrupted.'
        ))
        return
      }
      resolve(result)
    }

    reader.onerror = (): void => {
      const fileSize = `${(blob.size / 1024 / 1024).toFixed(2)}MB`
      reject(new Error(
        `Failed to convert blob to base64 (${fileSize}): ${reader.error?.message || 'unknown error'}. ` +
        'Medical imaging file may be inaccessible or corrupted.'
      ))
    }

    reader.readAsDataURL(blob)
  })
}
