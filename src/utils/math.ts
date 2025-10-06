/**
 * Math utilities for medgfx
 * Array operations and coordinate transformations
 */

import arrayEqual from 'array-equal'
import { mat4, vec3, vec4 } from 'gl-matrix'

/**
 * Checks if two arrays are equal
 */
export function arraysAreEqual(a: unknown[], b: unknown[]): boolean {
  return arrayEqual(a, b)
}

/**
 * Generates a numeric range array
 * @param start - start value
 * @param stop - stop value
 * @param step - step value
 * @returns filled number array
 * @example
 * range(0, 10, 2) // [0, 2, 4, 6, 8, 10]
 */
export function range(start: number, stop: number, step: number): number[] {
  return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
}

/**
 * Converts spherical coordinates (azimuth, elevation) to Cartesian (x, y, z)
 *
 * CRITICAL: Validates inputs for medical imaging accuracy
 *
 * @param azimuth - azimuth angle in degrees
 * @param elevation - elevation angle in degrees
 * @returns normalized [x, y, z] coordinates
 * @throws {Error} If inputs are not finite numbers
 * @example
 * sph2cartDeg(42, 42) // normalized cartesian coordinates
 */
export function sph2cartDeg(azimuth: number, elevation: number): number[] {
  // Validate inputs are finite
  if (!Number.isFinite(azimuth)) {
    throw new Error(
      `Azimuth angle must be a finite number, got ${azimuth}. ` +
      'Medical imaging calculations require valid numerical inputs.'
    )
  }
  if (!Number.isFinite(elevation)) {
    throw new Error(
      `Elevation angle must be a finite number, got ${elevation}. ` +
      'Medical imaging calculations require valid numerical inputs.'
    )
  }

  const Phi = -elevation * (Math.PI / 180)
  const Theta = ((azimuth - 90) % 360) * (Math.PI / 180)
  const x = Math.cos(Phi) * Math.cos(Theta)
  const y = Math.cos(Phi) * Math.sin(Theta)
  const z = Math.sin(Phi)

  const len = Math.sqrt(x * x + y * y + z * z)
  if (len <= 0.0) {
    return [x, y, z]
  }

  const ret = [x / len, y / len, z / len]

  // Validate outputs
  if (!Number.isFinite(ret[0]) || !Number.isFinite(ret[1]) || !Number.isFinite(ret[2])) {
    throw new Error(
      `Spherical to Cartesian conversion produced invalid result for azimuth=${azimuth}°, elevation=${elevation}°`
    )
  }

  return ret
}

/**
 * Transforms voxel coordinates to millimeter coordinates using transformation matrix
 *
 * CRITICAL: This function validates all inputs to ensure medical imaging data integrity.
 * Incorrect transformations could lead to wrong patient positioning or anatomical measurements.
 *
 * @param XYZ - voxel coordinates [x, y, z]
 * @param mtx - 4x4 transformation matrix
 * @returns millimeter coordinates as vec3
 * @throws {Error} If inputs are invalid or matrix is singular
 */
export function vox2mm(XYZ: number[], mtx: mat4): vec3 {
  // Validate voxel coordinates
  if (XYZ.length !== 3) {
    throw new Error(
      `Voxel coordinates must have exactly 3 elements, got ${XYZ.length}. ` +
      'Medical image coordinate transformations require [x, y, z].'
    )
  }

  // Validate all coordinates are finite
  for (let i = 0; i < 3; i++) {
    if (!Number.isFinite(XYZ[i])) {
      throw new Error(
        `Voxel coordinate[${i}] must be a finite number, got ${XYZ[i]}. ` +
        'Medical imaging calculations require valid numerical inputs.'
      )
    }
  }

  // Check if matrix is approximately singular by computing determinant
  const det = mat4.determinant(mtx)
  if (Math.abs(det) < 1e-10) {
    throw new Error(
      'Cannot transform coordinates: transformation matrix is singular (determinant ≈ 0). ' +
      'This indicates the medical image has a degenerate coordinate system.'
    )
  }

  const sform = mat4.clone(mtx)
  mat4.transpose(sform, sform)
  const x = XYZ[0] ?? 0
  const y = XYZ[1] ?? 0
  const z = XYZ[2] ?? 0
  const pos = vec4.fromValues(x, y, z, 1)
  vec4.transformMat4(pos, pos, sform)
  const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])

  // Validate transformation results
  if (!Number.isFinite(pos3[0]) || !Number.isFinite(pos3[1]) || !Number.isFinite(pos3[2])) {
    throw new Error(
      `Voxel-to-millimeter transformation produced invalid coordinates [${pos3[0]}, ${pos3[1]}, ${pos3[2]}] ` +
      `from input [${XYZ[0]}, ${XYZ[1]}, ${XYZ[2]}]. Medical imaging coordinate accuracy is compromised.`
    )
  }

  return pos3
}

/**
 * Nice Numbers algorithm for graph labels
 * From "Nice Numbers for Graph Labels", Graphics Gems, pp 61-63
 * https://github.com/cenfun/nice-ticks/blob/master/docs/Nice-Numbers-for-Graph-Labels.pdf
 */
export const nice = (x: number, round: boolean): number => {
  const exp = Math.floor(Math.log(x) / Math.log(10))
  const f = x / Math.pow(10, exp)
  let nf
  if (round) {
    if (f < 1.5) {
      nf = 1
    } else if (f < 3) {
      nf = 2
    } else if (f < 7) {
      nf = 5
    } else {
      nf = 10
    }
  } else {
    if (f <= 1) {
      nf = 1
    } else if (f <= 2) {
      nf = 2
    } else if (f <= 5) {
      nf = 5
    } else {
      nf = 10
    }
  }
  return nf * Math.pow(10, exp)
}

/**
 * Helper function for calculating nice tick spacing
 */
function loose_label(min: number, max: number, ntick = 4): [number, number, number, boolean] {
  const range = nice(max - min, false)
  const d = nice(range / (ntick - 1), true)
  const graphmin = Math.floor(min / d) * d
  const graphmax = Math.ceil(max / d) * d
  const perfect = graphmin === min && graphmax === max
  return [d, graphmin, graphmax, perfect]
}

/**
 * Calculate optimal tick spacing for graph labels
 * @param mn - minimum value
 * @param mx - maximum value
 * @returns [spacing, graphmin, graphmax]
 */
export function tickSpacing(mn: number, mx: number): number[] {
  let v = loose_label(mn, mx, 3)
  if (!v[3]) {
    v = loose_label(mn, mx, 5)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 4)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 3)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 5)
  }
  return [v[0], v[1], v[2]]
}

/**
 * Convert degrees to radians
 * @param deg - angle in degrees
 * @returns angle in radians
 */
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180.0)
}

/**
 * Normalize negative min/max values
 * @param min - minimum positive value
 * @param max - maximum positive value
 * @param minNeg - minimum negative value
 * @param maxNeg - maximum negative value
 * @returns [normalized min, normalized max]
 */
export function negMinMax(min: number, max: number, minNeg: number, maxNeg: number): [number, number] {
  let mn = -min
  let mx = -max
  if (isFinite(minNeg) && isFinite(maxNeg)) {
    mn = minNeg
    mx = maxNeg
  }
  if (mn > mx) {
    ;[mn, mx] = [mx, mn]
  }
  return [mn, mx]
}

/**
 * Clamp a value between min and max
 * @param value - value to clamp
 * @param min - minimum value
 * @param max - maximum value
 * @returns clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
