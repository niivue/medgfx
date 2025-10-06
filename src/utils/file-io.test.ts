import { describe, test, expect } from "bun:test"
import { download, readFileAsync, blobToBase64 } from "./file-io"

describe("file-io utilities", () => {
  describe("readFileAsync", () => {
    test("reads file as ArrayBuffer", async () => {
      const file = new File(["test"], "test.txt")
      const result = await readFileAsync(file)
      expect(result).toBeInstanceOf(ArrayBuffer)
    })

    test("rejects empty file", async () => {
      const emptyFile = new File([], "empty.txt")
      await expect(readFileAsync(emptyFile)).rejects.toThrow('Cannot read empty file')
    })
  })

  describe("blobToBase64", () => {
    test("converts blob to base64", async () => {
      const blob = new Blob(["test"], { type: "text/plain" })
      const result = await blobToBase64(blob)
      expect(result).toContain("data:")
    })

    test("rejects empty blob", async () => {
      const emptyBlob = new Blob([], { type: "text/plain" })
      await expect(blobToBase64(emptyBlob)).rejects.toThrow('Cannot convert empty blob to base64')
    })
  })

  describe("download", () => {
    test("download function executes without error", () => {
      const data = new Uint8Array([1, 2, 3])
      expect(() => download(data.buffer, "test.bin", "application/octet-stream")).not.toThrow()
    })

    test("rejects empty content", () => {
      const emptyData = new ArrayBuffer(0)
      expect(() => download(emptyData, "test.bin", "application/octet-stream")).toThrow('Cannot download empty content')
    })

    test("rejects empty filename", () => {
      const data = new Uint8Array([1, 2, 3])
      expect(() => download(data.buffer, "", "application/octet-stream")).toThrow('fileName is required')
    })
  })
})
