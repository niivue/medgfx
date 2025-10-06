import { describe, test, expect } from "bun:test"
import { vec3 } from "gl-matrix"
import { createSphere, createCylinder, createColoredSphere, createColoredCylinder } from "./primitives"

describe("createSphere", () => {
  test("generates vertices and indices", () => {
    const vertices: number[] = []
    const indices: number[] = []

    createSphere(vertices, indices, 1.0, [0, 0, 0])

    expect(vertices.length).toBeGreaterThan(0)
    expect(indices.length).toBeGreaterThan(0)
    expect(vertices.length % 3).toBe(0)
    expect(indices.length % 3).toBe(0)
  })

  test("applies radius scaling", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const radius = 5.0

    createSphere(vertices, indices, radius, [0, 0, 0])

    // Check that vertices are approximately at the correct radius
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const z = vertices[i + 2]

      if (x === undefined || y === undefined || z === undefined) {
        throw new Error(`Missing vertex data at index ${i}`)
      }

      const dist = Math.sqrt(x * x + y * y + z * z)
      expect(Math.abs(dist - radius)).toBeLessThan(0.1)
    }
  })

  test("applies origin translation", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const origin = vec3.fromValues(10, 20, 30)

    createSphere(vertices, indices, 1.0, origin)

    // Calculate centroid
    let sumX = 0,
      sumY = 0,
      sumZ = 0
    const vertexCount = vertices.length / 3
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const z = vertices[i + 2]

      if (x === undefined || y === undefined || z === undefined) {
        throw new Error(`Missing vertex data at index ${i}`)
      }

      sumX += x
      sumY += y
      sumZ += z
    }

    const centroid = [sumX / vertexCount, sumY / vertexCount, sumZ / vertexCount]

    expect(centroid[0]).toBeCloseTo(origin[0], 1)
    expect(centroid[1]).toBeCloseTo(origin[1], 1)
    expect(centroid[2]).toBeCloseTo(origin[2], 1)
  })

  test("appends to existing arrays", () => {
    const vertices = [1, 2, 3]
    const indices = [0]

    createSphere(vertices, indices, 1.0, [0, 0, 0])

    expect(vertices[0]).toBe(1)
    expect(vertices[1]).toBe(2)
    expect(vertices[2]).toBe(3)
    expect(indices[0]).toBe(0)
  })

  test("offsets indices for existing vertices", () => {
    const vertices = [0, 0, 0, 1, 1, 1] // 2 existing vertices
    const indices: number[] = []

    createSphere(vertices, indices, 1.0, [0, 0, 0])

    // All new indices should be >= 2
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(2)
    }
  })
})

describe("createCylinder", () => {
  test("generates vertices and indices", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const start = vec3.fromValues(0, 0, 0)
    const end = vec3.fromValues(0, 0, 10)

    createCylinder(vertices, indices, start, end, 1.0, 8)

    expect(vertices.length).toBeGreaterThan(0)
    expect(indices.length).toBeGreaterThan(0)
    expect(vertices.length % 3).toBe(0)
    expect(indices.length % 3).toBe(0)
  })

  test("creates cylinder with specified number of sides", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const sides = 6

    createCylinder(vertices, indices, [0, 0, 0], [0, 0, 1], 1.0, sides, false)

    // Without endcaps: 2 * sides vertices
    expect(vertices.length / 3).toBe(2 * sides)
  })

  test("includes endcaps when requested", () => {
    const verticesWithCaps: number[] = []
    const indicesWithCaps: number[] = []

    const verticesNoCaps: number[] = []
    const indicesNoCaps: number[] = []

    const sides = 8

    createCylinder(verticesWithCaps, indicesWithCaps, [0, 0, 0], [0, 0, 1], 1.0, sides, true)
    createCylinder(verticesNoCaps, indicesNoCaps, [0, 0, 0], [0, 0, 1], 1.0, sides, false)

    // With endcaps: 2 * sides + 2 pole vertices
    expect(verticesWithCaps.length / 3).toBe(2 * sides + 2)
    expect(verticesNoCaps.length / 3).toBe(2 * sides)

    // With endcaps: more faces
    expect(indicesWithCaps.length).toBeGreaterThan(indicesNoCaps.length)
  })

  test("enforces minimum of 3 sides", () => {
    const vertices: number[] = []
    const indices: number[] = []

    createCylinder(vertices, indices, [0, 0, 0], [0, 0, 1], 1.0, 2, false)

    // Should use 3 sides minimum
    expect(vertices.length / 3).toBe(6) // 2 * 3
  })

  test("creates cylinder along arbitrary axis", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const start = vec3.fromValues(1, 2, 3)
    const end = vec3.fromValues(4, 5, 6)

    createCylinder(vertices, indices, start, end, 0.5, 8)

    expect(vertices.length).toBeGreaterThan(0)
    expect(indices.length).toBeGreaterThan(0)
  })
})

describe("createColoredSphere", () => {
  test("generates colors matching vertex count", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []
    const rgba = [255, 128, 64, 200]

    createColoredSphere(vertices, indices, colors, 1.0, [0, 0, 0], rgba)

    const vertexCount = vertices.length / 3
    const colorCount = colors.length / 4

    expect(colorCount).toBe(vertexCount)
  })

  test("applies specified color to all vertices", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []
    const rgba = [100, 150, 200, 250]

    createColoredSphere(vertices, indices, colors, 1.0, [0, 0, 0], rgba)

    // Check that colors match the specified RGBA
    for (let i = 0; i < colors.length; i += 4) {
      expect(colors[i]).toBe(rgba[0])
      expect(colors[i + 1]).toBe(rgba[1])
      expect(colors[i + 2]).toBe(rgba[2])
      expect(colors[i + 3]).toBe(rgba[3])
    }
  })

  test("uses default blue color when not specified", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []

    createColoredSphere(vertices, indices, colors, 1.0)

    expect(colors[0]).toBe(0)
    expect(colors[1]).toBe(0)
    expect(colors[2]).toBe(192)
    expect(colors[3]).toBe(255)
  })
})

describe("createColoredCylinder", () => {
  test("generates colors matching vertex count", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []
    const rgba = [200, 100, 50, 255]

    createColoredCylinder(vertices, indices, colors, [0, 0, 0], [0, 0, 5], 1.0, rgba)

    const vertexCount = vertices.length / 3
    const colorCount = colors.length / 4

    expect(colorCount).toBe(vertexCount)
  })

  test("applies specified color to all vertices", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []
    const rgba = [50, 100, 150, 200]

    createColoredCylinder(vertices, indices, colors, [0, 0, 0], [1, 1, 1], 0.5, rgba)

    for (let i = 0; i < colors.length; i += 4) {
      expect(colors[i]).toBe(rgba[0])
      expect(colors[i + 1]).toBe(rgba[1])
      expect(colors[i + 2]).toBe(rgba[2])
      expect(colors[i + 3]).toBe(rgba[3])
    }
  })

  test("uses default red color when not specified", () => {
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []

    createColoredCylinder(vertices, indices, colors, [0, 0, 0], [0, 0, 1], 1.0)

    expect(colors[0]).toBe(192)
    expect(colors[1]).toBe(0)
    expect(colors[2]).toBe(0)
    expect(colors[3]).toBe(255)
  })
})
