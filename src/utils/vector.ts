import { vec3 } from "gl-matrix"

/**
 * Finds the first perpendicular vector to the given vector.
 * Uses a deterministic approach based on which components are zero.
 */
export function getFirstPerpVector(v: vec3): vec3 {
  const result = vec3.create()

  if (v[0] === 0.0) {
    result[0] = 1.0
  } else if (v[1] === 0.0) {
    result[1] = 1.0
  } else if (v[2] === 0.0) {
    result[2] = 1.0
  } else {
    // All components non-zero: construct perpendicular vector
    // Set z as first two components, negated sum as third for zero dot product
    result[0] = v[2]
    result[1] = v[2]
    result[2] = -(v[0] + v[1])
    vec3.normalize(result, result)
  }

  return result
}
