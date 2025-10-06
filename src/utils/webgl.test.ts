import { describe, expect, test } from 'bun:test'
import { mat4, vec3, vec4 } from 'gl-matrix'
import { swizzleVec3, isRadiological, unProject } from './webgl'

describe('swizzleVec3', () => {
  test('should return same vector with default order', () => {
    const input = vec3.fromValues(1, 2, 3)
    const result = swizzleVec3(input)
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(2)
    expect(result[2]).toBe(3)
  })

  test('should swap x and y components', () => {
    const input = vec3.fromValues(1, 2, 3)
    const result = swizzleVec3(input, [1, 0, 2])
    expect(result[0]).toBe(2)
    expect(result[1]).toBe(1)
    expect(result[2]).toBe(3)
  })

  test('should reverse all components', () => {
    const input = vec3.fromValues(1, 2, 3)
    const result = swizzleVec3(input, [2, 1, 0])
    expect(result[0]).toBe(3)
    expect(result[1]).toBe(2)
    expect(result[2]).toBe(1)
  })

  test('should handle zero vector', () => {
    const input = vec3.fromValues(0, 0, 0)
    const result = swizzleVec3(input, [2, 1, 0])
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0)
  })
})

describe('isRadiological', () => {
  test('should return positive for identity matrix', () => {
    const mtx = mat4.create()
    const result = isRadiological(mtx)
    expect(result).toBe(1)
  })

  test('should return negative for flipped x-axis', () => {
    const mtx = mat4.create()
    mat4.scale(mtx, mtx, vec3.fromValues(-1, 1, 1))
    const result = isRadiological(mtx)
    expect(result).toBe(-1)
  })

  test('should handle rotation around y-axis', () => {
    const mtx = mat4.create()
    mat4.rotateY(mtx, mtx, Math.PI) // 180 degree rotation
    const result = isRadiological(mtx)
    expect(result).toBeCloseTo(-1, 5)
  })

  test('should handle rotation around z-axis', () => {
    const mtx = mat4.create()
    mat4.rotateZ(mtx, mtx, Math.PI / 2) // 90 degree rotation
    const result = isRadiological(mtx)
    expect(result).toBeCloseTo(0, 5)
  })
})

describe('unProject', () => {
  test('should return identity for centered point with identity MVP', () => {
    const mvp = mat4.create()
    const result = unProject(0.5, 0.5, 0.5, mvp)
    expect(result[0]).toBeCloseTo(0, 5)
    expect(result[1]).toBeCloseTo(0, 5)
    expect(result[2]).toBeCloseTo(0, 5)
    expect(result[3]).toBe(1)
  })

  test('should unproject corner points', () => {
    const mvp = mat4.create()
    const result = unProject(0, 0, 0.5, mvp)
    expect(result[0]).toBeCloseTo(-1, 5)
    expect(result[1]).toBeCloseTo(-1, 5)
  })

  test('should handle w component division', () => {
    const mvp = mat4.create()
    const result = unProject(1, 1, 0.5, mvp)
    expect(result[0]).toBeCloseTo(1, 5)
    expect(result[1]).toBeCloseTo(1, 5)
    expect(result[3]).toBe(1)
  })

  test('should return early if w is zero', () => {
    const mvp = mat4.create()
    // Create a degenerate matrix that produces w=0
    mat4.set(mvp,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 0
    )
    const result = unProject(0.5, 0.5, 0.5, mvp)
    expect(result[3]).toBe(0)
  })

  test('should handle perspective projection', () => {
    const mvp = mat4.create()
    mat4.perspective(mvp, Math.PI / 4, 1, 0.1, 100)
    const result = unProject(0.5, 0.5, 0.5, mvp)
    // Should get valid coordinates (note: w component may not be 1 before normalization)
    expect(Number.isFinite(result[0])).toBe(true)
    expect(Number.isFinite(result[1])).toBe(true)
    expect(Number.isFinite(result[2])).toBe(true)
    expect(Number.isFinite(result[3])).toBe(true)
  })
})
