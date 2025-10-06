import { describe, test, expect } from "bun:test"
import { readMatV4 } from "./matlab"

describe("matlab utilities", () => {
  describe("readMatV4", () => {
    test("throws error for invalid file", async () => {
      const invalidBuffer = new ArrayBuffer(10)
      await expect(readMatV4(invalidBuffer)).rejects.toThrow()
    })

    test("throws error for empty buffer", async () => {
      const emptyBuffer = new ArrayBuffer(0)
      await expect(readMatV4(emptyBuffer)).rejects.toThrow()
    })
  })
})
