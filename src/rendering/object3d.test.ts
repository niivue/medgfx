import { describe, test, expect } from "bun:test"
import { mat4 } from "gl-matrix"
import { Object3D } from "./object3d"

describe("Object3D", () => {
  test("creates instance with required properties", () => {
    const mockBuffer = {} as WebGLBuffer
    const GL_TRIANGLES = 4 // WebGL constant
    const obj = new Object3D({
      id: 42,
      vertexBuffer: mockBuffer,
      mode: GL_TRIANGLES,
      indexCount: 100
    })

    expect(obj.id).toBe(42)
    expect(obj.vertexBuffer).toBe(mockBuffer)
    expect(obj.indexCount).toBe(100)
    expect(obj.mode).toBe(GL_TRIANGLES)
    expect(obj.indexBuffer).toBeNull()
    expect(obj.vao).toBeNull()
  })

  test("creates unique color ID from object ID", () => {
    const obj = new Object3D({
      id: 0x12345678,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    expect(obj.colorId).toEqual([
      0x78 / 255.0, // Byte 0
      0x56 / 255.0, // Byte 1
      0x34 / 255.0, // Byte 2
      0x12 / 255.0 // Byte 3
    ])
  })

  test("initializes with default transform state", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    expect(obj.position).toEqual([0, 0, 0])
    expect(obj.scale).toEqual([1, 1, 1])
    expect(obj.rotation).toEqual([0, 0, 0])
    expect(obj.rotationRadians).toBe(0)
  })

  test("initializes with default visibility state", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    expect(obj.isVisible).toBe(true)
    expect(obj.isPickable).toBe(true)
  })

  test("setPosition updates position", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setPosition(1, 2, 3)
    expect(obj.position).toEqual([1, 2, 3])
  })

  test("setScale updates scale", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setScale(2, 3, 4)
    expect(obj.scale).toEqual([2, 3, 4])
  })

  test("setRotation updates rotation axis and angle", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setRotation(0, 1, 0, Math.PI / 2)
    expect(obj.rotation).toEqual([0, 1, 0])
    expect(obj.rotationRadians).toBe(Math.PI / 2)
  })

  test("updateModelMatrix creates identity matrix for default transform", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.updateModelMatrix()

    const identity = mat4.create()
    expect(obj.modelMatrix).toEqual(identity)
  })

  test("updateModelMatrix applies translation", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setPosition(5, 10, 15)
    obj.updateModelMatrix()

    const expected = mat4.create()
    mat4.translate(expected, expected, [5, 10, 15])

    expect(obj.modelMatrix).toEqual(expected)
  })

  test("updateModelMatrix applies scale", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setScale(2, 3, 4)
    obj.updateModelMatrix()

    const expected = mat4.create()
    mat4.scale(expected, expected, [2, 3, 4])

    expect(obj.modelMatrix).toEqual(expected)
  })

  test("updateModelMatrix applies rotation", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setRotation(0, 0, 1, Math.PI / 4)
    obj.updateModelMatrix()

    const expected = mat4.create()
    mat4.rotate(expected, expected, Math.PI / 4, [0, 0, 1])

    expect(obj.modelMatrix).toEqual(expected)
  })

  test("updateModelMatrix applies combined transformations in correct order", () => {
    const obj = new Object3D({
      id: 1,
      vertexBuffer: {} as WebGLBuffer,
      mode: 0,
      indexCount: 0
    })

    obj.setPosition(10, 20, 30)
    obj.setRotation(0, 1, 0, Math.PI / 2)
    obj.setScale(2, 2, 2)
    obj.updateModelMatrix()

    // Expected order: translate -> rotate -> scale
    const expected = mat4.create()
    mat4.translate(expected, expected, [10, 20, 30])
    mat4.rotate(expected, expected, Math.PI / 2, [0, 1, 0])
    mat4.scale(expected, expected, [2, 2, 2])

    expect(obj.modelMatrix).toEqual(expected)
  })

  test("has correct render flag constants", () => {
    expect(Object3D.BLEND).toBe(1)
    expect(Object3D.CULL_FACE).toBe(2)
    expect(Object3D.CULL_FRONT).toBe(4)
    expect(Object3D.CULL_BACK).toBe(8)
    expect(Object3D.ENABLE_DEPTH_TEST).toBe(16)
  })
})
