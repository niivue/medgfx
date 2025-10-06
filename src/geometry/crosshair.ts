import { vec3, vec4 } from "gl-matrix"
import { Object3D } from "../rendering/object3d"
import { createCylinder } from "./primitives"
import type { Object3DGeometry } from "../types/object3d"

/**
 * Generates crosshair geometry for medical imaging slice navigation.
 * Creates three perpendicular cylinders aligned with anatomical axes.
 *
 * @param gl - WebGL2 rendering context
 * @param center - Center point in millimeter coordinates
 * @param boundsMin - Minimum bounds of the volume
 * @param boundsMax - Maximum bounds of the volume
 * @param radius - Radius of the crosshair cylinders
 * @param sides - Number of sides for cylinder tessellation
 * @param gap - Gap size around center (0 for continuous crosshairs)
 * @returns Geometry buffers for rendering
 */
export function createCrosshairGeometry(
  gl: WebGL2RenderingContext,
  center: vec4,
  boundsMin: vec3,
  boundsMax: vec3,
  radius: number,
  sides = 20,
  gap = 0
): Object3DGeometry {
  const vertices: number[] = []
  const indices: number[] = []
  const gapSize = radius * gap

  if (gapSize <= 0) {
    // Continuous crosshairs
    // Left-right (X axis)
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(boundsMin[0], center[1], center[2]),
      vec3.fromValues(boundsMax[0], center[1], center[2]),
      radius,
      sides
    )

    // Anterior-posterior (Y axis)
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0], boundsMin[1], center[2]),
      vec3.fromValues(center[0], boundsMax[1], center[2]),
      radius,
      sides
    )

    // Superior-inferior (Z axis)
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0], center[1], boundsMin[2]),
      vec3.fromValues(center[0], center[1], boundsMax[2]),
      radius,
      sides
    )
  } else {
    // Crosshairs with gap at center
    // Left-right (X axis) - two segments
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(boundsMin[0], center[1], center[2]),
      vec3.fromValues(center[0] - gapSize, center[1], center[2]),
      radius,
      sides,
      false
    )
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0] + gapSize, center[1], center[2]),
      vec3.fromValues(boundsMax[0], center[1], center[2]),
      radius,
      sides,
      false
    )

    // Anterior-posterior (Y axis) - two segments
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0], boundsMin[1], center[2]),
      vec3.fromValues(center[0], center[1] - gapSize, center[2]),
      radius,
      sides,
      false
    )
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0], center[1] + gapSize, center[2]),
      vec3.fromValues(center[0], boundsMax[1], center[2]),
      radius,
      sides,
      false
    )

    // Superior-inferior (Z axis) - two segments
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0], center[1], boundsMin[2]),
      vec3.fromValues(center[0], center[1], center[2] - gapSize),
      radius,
      sides,
      false
    )
    createCylinder(
      vertices,
      indices,
      vec3.fromValues(center[0], center[1], center[2] + gapSize),
      vec3.fromValues(center[0], center[1], boundsMax[2]),
      radius,
      sides,
      false
    )
  }

  // Create WebGL buffers
  const vertexBuffer = gl.createBuffer()
  if (!vertexBuffer) {
    throw new Error("Failed to create vertex buffer for crosshair geometry")
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

  const indexBuffer = gl.createBuffer()
  if (!indexBuffer) {
    throw new Error("Failed to create index buffer for crosshair geometry")
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW)

  // Create VAO
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)

  // Vertex position attribute (location 0): 3 floats for X,Y,Z
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(null)

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: indices.length,
    vao
  }
}

/**
 * Creates a crosshair Object3D ready for rendering.
 *
 * @param gl - WebGL2 rendering context
 * @param id - Unique identifier for the object
 * @param center - Center point in millimeter coordinates
 * @param boundsMin - Minimum bounds of the volume
 * @param boundsMax - Maximum bounds of the volume
 * @param radius - Radius of the crosshair cylinders
 * @param sides - Number of sides for cylinder tessellation
 * @param gap - Gap size around center (0 for continuous crosshairs)
 * @returns Object3D instance ready for rendering
 */
export function createCrosshair(
  gl: WebGL2RenderingContext,
  id: number,
  center: vec4,
  boundsMin: vec3,
  boundsMax: vec3,
  radius: number,
  sides = 20,
  gap = 0
): Object3D {
  const geometry = createCrosshairGeometry(gl, center, boundsMin, boundsMax, radius, sides, gap)

  const crosshair = new Object3D({
    id,
    vertexBuffer: geometry.vertexBuffer,
    mode: gl.TRIANGLES,
    indexCount: geometry.indexCount,
    indexBuffer: geometry.indexBuffer,
    vao: geometry.vao
  })

  // Store the center position for reference
  crosshair.mm = center

  return crosshair
}
