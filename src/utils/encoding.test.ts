import { describe, test, expect } from "bun:test"
import {
  arrayBufferToBase64,
  base64ToUint8,
  uint8ToBase64,
  stringToUint8,
  uint8ToString,
} from "./encoding"

describe("encoding utilities", () => {
  describe("base64 encoding/decoding", () => {
    test("round-trip encodes and decodes data", () => {
      const original = new Uint8Array([0, 127, 255, 128, 64])
      const base64 = uint8ToBase64(original)
      const decoded = base64ToUint8(base64)
      expect(decoded).toEqual(original)
    })

    test("arrayBufferToBase64 works", () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer
      const base64 = arrayBufferToBase64(buffer)
      expect(base64).toBe("SGVsbG8=")
    })

    test("rejects oversized ArrayBuffer for base64 encoding", () => {
      // Create a 101MB buffer (exceeds 100MB limit)
      const largeBuffer = new ArrayBuffer(101 * 1024 * 1024)
      expect(() => arrayBufferToBase64(largeBuffer)).toThrow('too large for base64 encoding')
    })

    test("rejects oversized Uint8Array for base64 encoding", () => {
      const largeArray = new Uint8Array(101 * 1024 * 1024)
      expect(() => uint8ToBase64(largeArray)).toThrow('too large for base64 encoding')
    })
  })

  describe("string encoding/decoding", () => {
    test("converts string to Uint8Array and back", () => {
      const original = "Hello World"
      const uint8 = stringToUint8(original)
      const result = uint8ToString(uint8)
      expect(result).toBe(original)
    })

    test("handles UTF-8 characters", () => {
      const original = "Hello World ABC"
      const uint8 = stringToUint8(original)
      const result = uint8ToString(uint8)
      expect(result).toBe(original)
    })
  })
})
