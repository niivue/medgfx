import { mat4, vec3, vec4 } from "gl-matrix"
import type { Object3DOptions } from "../types/object3d"

/**
 * Represents a 3D object for WebGL rendering with geometry, transformations, and state.
 * Core rendering primitive used for meshes, crosshairs, and other 3D visualizations.
 */
export class Object3D {
  // Render flags
  static readonly BLEND = 1
  static readonly CULL_FACE = 2
  static readonly CULL_FRONT = 4
  static readonly CULL_BACK = 8
  static readonly ENABLE_DEPTH_TEST = 16

  // WebGL buffers and state
  readonly vertexBuffer: WebGLBuffer
  readonly indexBuffer: WebGLVertexArrayObject | null
  readonly vao: WebGLVertexArrayObject | null
  readonly indexCount: number
  readonly mode: number

  // Object identification
  readonly id: number
  readonly colorId: [number, number, number, number]

  // Visibility and interaction
  isVisible = true
  isPickable = true

  // Transformation state
  readonly modelMatrix = mat4.create()
  scale: [number, number, number] = [1, 1, 1]
  position: [number, number, number] = [0, 0, 0]
  rotation: [number, number, number] = [0, 0, 0]
  rotationRadians = 0.0

  // Bounding box
  extentsMin: number[] = []
  extentsMax: number[] = []

  // Render flags
  glFlags = 0

  // Shader references
  renderShaders: number[] = []

  // Optional properties for specific use cases
  furthestVertexFromOrigin?: number
  originNegate?: vec3
  fieldOfViewDeObliqueMM?: vec3
  mm?: vec4

  constructor(options: Object3DOptions) {
    this.id = options.id
    this.vertexBuffer = options.vertexBuffer
    this.indexCount = options.indexCount
    this.indexBuffer = options.indexBuffer ?? null
    this.vao = options.vao ?? null
    this.mode = options.mode

    // Generate unique color ID for picking
    this.colorId = [
      ((options.id >> 0) & 0xff) / 255.0,
      ((options.id >> 8) & 0xff) / 255.0,
      ((options.id >> 16) & 0xff) / 255.0,
      ((options.id >> 24) & 0xff) / 255.0
    ]
  }

  /**
   * Updates the model matrix based on current position, rotation, and scale
   */
  updateModelMatrix(): void {
    mat4.identity(this.modelMatrix)
    mat4.translate(this.modelMatrix, this.modelMatrix, this.position as vec3)

    if (this.rotationRadians !== 0) {
      mat4.rotate(this.modelMatrix, this.modelMatrix, this.rotationRadians, this.rotation as vec3)
    }

    mat4.scale(this.modelMatrix, this.modelMatrix, this.scale as vec3)
  }

  /**
   * Sets object position
   */
  setPosition(x: number, y: number, z: number): void {
    this.position = [x, y, z]
  }

  /**
   * Sets object scale
   */
  setScale(x: number, y: number, z: number): void {
    this.scale = [x, y, z]
  }

  /**
   * Sets object rotation axis and angle
   */
  setRotation(x: number, y: number, z: number, radians: number): void {
    this.rotation = [x, y, z]
    this.rotationRadians = radians
  }
}
