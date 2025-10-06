import { mat4, vec3, vec4 } from 'gl-matrix'

/**
 * Reorder the components of a vec3 according to the specified order
 * @param vec - Input vector
 * @param order - Array specifying the component order [x, y, z] indices
 * @returns New vec3 with reordered components
 */
export function swizzleVec3(vec: vec3, order: readonly [number, number, number] = [0, 1, 2]): vec3 {
  const vout = vec3.create()
  const [x, y, z] = order
  vout[0] = vec[x] ?? 0
  vout[1] = vec[y] ?? 0
  vout[2] = vec[z] ?? 0
  return vout
}

/**
 * Determine if a 2D slice view is in radiological orientation
 * @param mtx - Transformation matrix
 * @returns Sign of the transformed right vector's x component (positive for radiological)
 * @note Ambiguous for pure sagittal views
 */
export function isRadiological(mtx: mat4): number {
  const vRight = vec4.fromValues(1, 0, 0, 0) // pure right vector
  const vRotated = vec4.create()
  vec4.transformMat4(vRotated, vRight, mtx)
  return vRotated[0]
}

/**
 * Convert window coordinates to world coordinates
 * @param winX - Window X coordinate (normalized 0-1)
 * @param winY - Window Y coordinate (normalized 0-1)
 * @param winZ - Window Z coordinate (normalized 0-1)
 * @param mvpMatrix - Model-view-projection matrix
 * @returns World space coordinates as vec4
 * @see https://github.com/bringhurst/webgl-unproject
 */
export function unProject(winX: number, winY: number, winZ: number, mvpMatrix: mat4): vec4 {
  const inp = vec4.fromValues(winX, winY, winZ, 1.0)
  const finalMatrix = mat4.clone(mvpMatrix)
  mat4.invert(finalMatrix, finalMatrix)

  // Map to range -1 to 1
  inp[0] = inp[0] * 2 - 1
  inp[1] = inp[1] * 2 - 1
  inp[2] = inp[2] * 2 - 1

  const out = vec4.create()
  vec4.transformMat4(out, inp, finalMatrix)

  if (out[3] === 0.0) {
    return out // error case
  }

  out[0] /= out[3]
  out[1] /= out[3]
  out[2] /= out[3]

  return out
}
