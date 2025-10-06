import { describe, test, expect } from "bun:test"
import { ZipReader, decompress, compress, isArrayBufferCompressed } from "./compression"

describe("compression utilities", () => {
  describe("isArrayBufferCompressed", () => {
    test("detects compressed data", () => {
      const gzipData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00])
      expect(isArrayBufferCompressed(gzipData.buffer)).toBe(true)
    })

    test("detects uncompressed data", () => {
      const plainData = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      expect(isArrayBufferCompressed(plainData.buffer)).toBe(false)
    })

    test("handles undefined buffer", () => {
      expect(isArrayBufferCompressed(undefined)).toBe(false)
    })

    test("handles empty buffer", () => {
      expect(isArrayBufferCompressed(new ArrayBuffer(0))).toBe(false)
    })
  })

  // Note: DecompressionStream not available in Bun test environment
  // Compression/decompression tests require browser APIs
  // These tests verify input validation only

  describe("decompress validation", () => {
    test("rejects empty data", async () => {
      const emptyData = new Uint8Array(0)
      await expect(decompress(emptyData)).rejects.toThrow('Cannot decompress empty data')
    })

    test("rejects null data", async () => {
      await expect(decompress(null as any)).rejects.toThrow('Cannot decompress empty data')
    })
  })

  describe("ZipReader", () => {
    test("handles empty ZIP", () => {
      const emptyZip = new Uint8Array([
        0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ])
      const reader = new ZipReader(emptyZip.buffer)
      expect(reader.entries.length).toBe(0)
    })
  })
})
