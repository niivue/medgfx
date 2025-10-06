import { describe, test, expect } from "bun:test"
import { subdivideSphereMesh, weldVertices } from "./mesh"

describe("subdivideSphereMesh", () => {
  test("subdivides a single triangle into four triangles", () => {
    const vertices = [0, 0, 1, 1, 0, 0, 0, 1, 0] // 3 vertices
    const faces = [0, 1, 2] // 1 triangle

    subdivideSphereMesh(vertices, faces)

    expect(vertices.length).toBe(6 * 3) // Original 3 + 3 midpoints
    expect(faces.length).toBe(4 * 3) // 4 triangles
  })

  test("projects new vertices onto unit sphere", () => {
    const vertices = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const faces = [0, 1, 2]

    subdivideSphereMesh(vertices, faces)

    // Check that all vertices are on unit sphere (with reasonable tolerance)
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const z = vertices[i + 2]

      if (x === undefined || y === undefined || z === undefined) {
        throw new Error(`Missing vertex data at index ${i}`)
      }

      const length = Math.sqrt(x * x + y * y + z * z)
      expect(Math.abs(length - 1.0)).toBeLessThan(1e-6)
    }
  })

  test("creates correct connectivity for subdivided triangles", () => {
    const vertices = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const faces = [0, 1, 2]

    subdivideSphereMesh(vertices, faces)

    // Should have 4 triangles with indices referencing 6 vertices
    expect(faces).toHaveLength(12)

    // All indices should be valid
    for (const idx of faces) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(6)
    }
  })
})

describe("weldVertices", () => {
  test("removes duplicate vertices", () => {
    const vertices = [
      0, 0, 0, // 0
      1, 0, 0, // 1
      0, 0, 0, // 2 (duplicate of 0)
      1, 0, 0 // 3 (duplicate of 1)
    ]
    const faces = [0, 1, 2, 1, 3, 2]

    const welded = weldVertices(vertices, faces)

    // Should have 2 unique vertices
    expect(welded.length).toBe(6)
    expect(faces).toEqual([0, 1, 0, 1, 1, 0]) // Updated indices
  })

  test("preserves unique vertices", () => {
    const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0]
    const faces = [0, 1, 2]

    const welded = weldVertices(vertices, faces)

    expect(welded.length).toBe(9) // All 3 vertices are unique
    expect(faces).toEqual([0, 1, 2]) // Indices unchanged
  })

  test("returns original array when no duplicates exist", () => {
    const vertices = [0, 0, 0, 1, 1, 1, 2, 2, 2]
    const faces = [0, 1, 2]

    const welded = weldVertices(vertices, faces)

    expect(welded).toEqual(vertices)
    expect(faces).toEqual([0, 1, 2])
  })

  test("updates face indices correctly after welding", () => {
    const vertices = [
      1, 2, 3, // 0
      4, 5, 6, // 1
      1, 2, 3, // 2 (dup of 0)
      7, 8, 9, // 3
      4, 5, 6 // 4 (dup of 1)
    ]
    const faces = [0, 1, 2, 3, 4, 0]

    const welded = weldVertices(vertices, faces)

    expect(welded.length).toBe(9) // 3 unique vertices
    expect(faces).toEqual([0, 1, 0, 2, 1, 0])
  })

  test("handles exact floating point equality", () => {
    const v = 0.123456789
    const vertices = [v, v, v, v, v, v]
    const faces = [0, 1, 0]

    const welded = weldVertices(vertices, faces)

    expect(welded.length).toBe(3) // Should detect as duplicates
    expect(faces).toEqual([0, 0, 0])
  })
})
