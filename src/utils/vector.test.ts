import { describe, test, expect } from "bun:test"
import { vec3 } from "gl-matrix"
import { getFirstPerpVector } from "./vector"

describe("getFirstPerpVector", () => {
  test("returns unit X vector when input X is zero", () => {
    const input = vec3.fromValues(0, 5, 3)
    const result = getFirstPerpVector(input)
    expect(result).toEqual(vec3.fromValues(1, 0, 0))
  })

  test("returns unit Y vector when input Y is zero", () => {
    const input = vec3.fromValues(5, 0, 3)
    const result = getFirstPerpVector(input)
    expect(result).toEqual(vec3.fromValues(0, 1, 0))
  })

  test("returns unit Z vector when input Z is zero", () => {
    const input = vec3.fromValues(5, 3, 0)
    const result = getFirstPerpVector(input)
    expect(result).toEqual(vec3.fromValues(0, 0, 1))
  })

  test("returns normalized perpendicular vector when all components non-zero", () => {
    const input = vec3.fromValues(1, 1, 1)
    const result = getFirstPerpVector(input)

    // Check perpendicularity (dot product should be near zero)
    const dot = vec3.dot(input, result)
    expect(Math.abs(dot)).toBeLessThan(1e-6)

    // Check normalization
    const length = vec3.length(result)
    expect(Math.abs(length - 1.0)).toBeLessThan(1e-6)
  })

  test("returns perpendicular vector for arbitrary non-zero input", () => {
    const input = vec3.fromValues(3, 4, 5)
    const result = getFirstPerpVector(input)

    // Verify perpendicularity
    const dot = vec3.dot(input, result)
    expect(Math.abs(dot)).toBeLessThan(1e-6)

    // Verify unit length
    const length = vec3.length(result)
    expect(Math.abs(length - 1.0)).toBeLessThan(1e-6)
  })

  test("constructs vector using z-component formula", () => {
    const input = vec3.fromValues(2, 3, 4)
    const result = getFirstPerpVector(input)

    // Should be [z, z, -(x+y)] normalized
    const expected = vec3.fromValues(4, 4, -(2 + 3))
    vec3.normalize(expected, expected)

    expect(result[0]).toBeCloseTo(expected[0])
    expect(result[1]).toBeCloseTo(expected[1])
    expect(result[2]).toBeCloseTo(expected[2])
  })
})
