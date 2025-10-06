import { describe, test, expect } from "bun:test"
import { arraysAreEqual, range, sph2cartDeg, vox2mm, nice, tickSpacing, deg2rad, negMinMax, clamp } from "./math"
import { mat4 } from "gl-matrix"

describe("math utilities", () => {
  describe("arraysAreEqual", () => {
    test("returns true for equal arrays", () => {
      expect(arraysAreEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    })

    test("returns false for different arrays", () => {
      expect(arraysAreEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    })
  })

  describe("range", () => {
    test("generates range with step", () => {
      const result = range(0, 10, 2)
      expect(result).toEqual([0, 2, 4, 6, 8, 10])
    })
  })

  describe("sph2cartDeg", () => {
    test("converts spherical to cartesian", () => {
      const result = sph2cartDeg(0, 0)
      expect(result[0]).toBeCloseTo(0, 5)
      expect(result[1]).toBeCloseTo(-1, 5)
      expect(result[2]).toBeCloseTo(0, 5)
    })
  })

  describe("vox2mm", () => {
    test("converts voxel to mm coordinates", () => {
      const identity = mat4.create()
      const result = vox2mm([1, 2, 3], identity)
      expect(result[0]).toBe(1)
      expect(result[1]).toBe(2)
      expect(result[2]).toBe(3)
    })
  })

  describe("nice", () => {
    test("rounds to nice numbers when round=true", () => {
      expect(nice(1.2, true)).toBe(1)
      expect(nice(2.5, true)).toBe(2)
      expect(nice(6.0, true)).toBe(5)
      expect(nice(12, true)).toBe(10)
    })

    test("uses floor logic when round=false", () => {
      expect(nice(0.8, false)).toBe(1)
      expect(nice(1.5, false)).toBe(2)
      expect(nice(4.0, false)).toBe(5)
      expect(nice(7.0, false)).toBe(10)
    })

    test("handles different scales", () => {
      expect(nice(0.12, true)).toBeCloseTo(0.1, 5)
      expect(nice(120, true)).toBe(100)
      expect(nice(1200, true)).toBe(1000)
    })
  })

  describe("tickSpacing", () => {
    test("calculates spacing for simple range", () => {
      const [spacing, min, max] = tickSpacing(0, 10)
      expect(spacing).toBeGreaterThan(0)
      expect(min).toBeLessThanOrEqual(0)
      expect(max).toBeGreaterThanOrEqual(10)
    })

    test("handles negative ranges", () => {
      const [spacing, min, max] = tickSpacing(-10, 10)
      expect(spacing).toBeGreaterThan(0)
      expect(min).toBeLessThanOrEqual(-10)
      expect(max).toBeGreaterThanOrEqual(10)
    })

    test("handles fractional ranges", () => {
      const [spacing, min, max] = tickSpacing(0.5, 2.5)
      expect(spacing).toBeGreaterThan(0)
      expect(min).toBeLessThanOrEqual(0.5)
      expect(max).toBeGreaterThanOrEqual(2.5)
    })
  })

  describe("deg2rad", () => {
    test("converts 0 degrees to 0 radians", () => {
      expect(deg2rad(0)).toBe(0)
    })

    test("converts 180 degrees to π radians", () => {
      expect(deg2rad(180)).toBeCloseTo(Math.PI, 5)
    })

    test("converts 90 degrees to π/2 radians", () => {
      expect(deg2rad(90)).toBeCloseTo(Math.PI / 2, 5)
    })

    test("converts 360 degrees to 2π radians", () => {
      expect(deg2rad(360)).toBeCloseTo(2 * Math.PI, 5)
    })

    test("handles negative angles", () => {
      expect(deg2rad(-90)).toBeCloseTo(-Math.PI / 2, 5)
    })
  })

  describe("negMinMax", () => {
    test("negates min/max when negatives are not finite", () => {
      const [mn, mx] = negMinMax(5, 10, NaN, NaN)
      expect(mn).toBe(-10)
      expect(mx).toBe(-5)
    })

    test("uses provided negative values when finite", () => {
      const [mn, mx] = negMinMax(5, 10, -15, -3)
      expect(mn).toBe(-15)
      expect(mx).toBe(-3)
    })

    test("swaps values if min > max", () => {
      const [mn, mx] = negMinMax(5, 10, -3, -15)
      expect(mn).toBe(-15)
      expect(mx).toBe(-3)
    })

    test("handles infinity correctly", () => {
      const [mn, mx] = negMinMax(5, 10, Infinity, Infinity)
      expect(mn).toBe(-10)
      expect(mx).toBe(-5)
    })
  })

  describe("clamp", () => {
    test("returns value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    test("returns min when value is below range", () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    test("returns max when value is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    test("returns min when value equals min", () => {
      expect(clamp(0, 0, 10)).toBe(0)
    })

    test("returns max when value equals max", () => {
      expect(clamp(10, 0, 10)).toBe(10)
    })

    test("handles negative ranges", () => {
      expect(clamp(-5, -10, -1)).toBe(-5)
      expect(clamp(-15, -10, -1)).toBe(-10)
      expect(clamp(0, -10, -1)).toBe(-1)
    })

    test("handles fractional values", () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5)
      expect(clamp(1.5, 0, 1)).toBe(1)
      expect(clamp(-0.5, 0, 1)).toBe(0)
    })
  })
})
