import { vec3 } from "gl-matrix"

/**
 * Subdivides each triangle in a mesh into four smaller triangles,
 * projecting new vertices onto the unit sphere.
 * Modifies the input arrays in place.
 */
export function subdivideSphereMesh(vertices: number[], faces: number[]): void {
  const initialFaceCount = faces.length / 3
  let vertexCount = vertices.length / 3

  const newVertex = vec3.create()
  const normalized = vec3.create()

  for (let faceIndex = 0; faceIndex < initialFaceCount; faceIndex++) {
    const i0 = faces[faceIndex * 3 + 0]
    const i1 = faces[faceIndex * 3 + 1]
    const i2 = faces[faceIndex * 3 + 2]

    // Validate indices exist
    if (i0 === undefined || i1 === undefined || i2 === undefined) {
      throw new Error(`Invalid face indices at face ${faceIndex}`)
    }

    const v0x = vertices[i0 * 3 + 0]
    const v0y = vertices[i0 * 3 + 1]
    const v0z = vertices[i0 * 3 + 2]
    const v1x = vertices[i1 * 3 + 0]
    const v1y = vertices[i1 * 3 + 1]
    const v1z = vertices[i1 * 3 + 2]
    const v2x = vertices[i2 * 3 + 0]
    const v2y = vertices[i2 * 3 + 1]
    const v2z = vertices[i2 * 3 + 2]

    // Validate vertex data exists
    if (v0x === undefined || v0y === undefined || v0z === undefined ||
        v1x === undefined || v1y === undefined || v1z === undefined ||
        v2x === undefined || v2y === undefined || v2z === undefined) {
      throw new Error(`Missing vertex data for face ${faceIndex}`)
    }

    const v0 = vec3.fromValues(v0x, v0y, v0z)
    const v1 = vec3.fromValues(v1x, v1y, v1z)
    const v2 = vec3.fromValues(v2x, v2y, v2z)

    // Create three midpoint vertices on unit sphere
    const mid0 = vertexCount
    const mid1 = vertexCount + 1
    const mid2 = vertexCount + 2

    // Midpoint of v0-v1
    vec3.add(newVertex, v0, v1)
    vec3.normalize(normalized, newVertex)
    vertices.push(...normalized)

    // Midpoint of v1-v2
    vec3.add(newVertex, v1, v2)
    vec3.normalize(normalized, newVertex)
    vertices.push(...normalized)

    // Midpoint of v0-v2
    vec3.add(newVertex, v0, v2)
    vec3.normalize(normalized, newVertex)
    vertices.push(...normalized)

    // Create four new triangles
    faces.push(mid0, mid1, mid2)
    faces.push(i0, mid0, mid2)
    faces.push(mid0, i1, mid1)

    // Replace original triangle with center triangle
    faces[faceIndex * 3 + 0] = mid2
    faces[faceIndex * 3 + 1] = mid1
    faces[faceIndex * 3 + 2] = i2

    vertexCount += 3
  }
}

/**
 * Removes duplicate vertices and updates face indices accordingly.
 * Returns a new vertex array with duplicates removed.
 */
export function weldVertices(vertices: number[], faces: number[]): number[] {
  const vertexCount = vertices.length / 3
  const remap = new Int32Array(vertexCount).fill(-1) // Use -1 to indicate unprocessed
  let uniqueCount = 0

  // Build remap table - map each vertex to its unique representative
  for (let i = 0; i < vertexCount; i++) {
    const remapValue = remap[i]
    if (remapValue !== undefined && remapValue !== -1) continue // Already processed

    const iBase = i * 3
    const x = vertices[iBase]
    const y = vertices[iBase + 1]
    const z = vertices[iBase + 2]

    // Validate vertex data exists
    if (x === undefined || y === undefined || z === undefined) {
      throw new Error(`Missing vertex data at index ${i}`)
    }

    remap[i] = uniqueCount

    // Find all duplicates
    for (let j = i + 1; j < vertexCount; j++) {
      const jBase = j * 3
      const jx = vertices[jBase]
      const jy = vertices[jBase + 1]
      const jz = vertices[jBase + 2]

      if (jx !== undefined && jy !== undefined && jz !== undefined &&
          x === jx && y === jy && z === jz) {
        remap[j] = uniqueCount
      }
    }

    uniqueCount++
  }

  // No duplicates found
  if (uniqueCount === vertexCount) {
    return vertices
  }

  // Update face indices
  for (let f = 0; f < faces.length; f++) {
    const faceIndex = faces[f]
    if (faceIndex === undefined) {
      throw new Error(`Missing face index at position ${f}`)
    }
    const remappedIndex = remap[faceIndex]
    if (remappedIndex === undefined || remappedIndex === -1) {
      throw new Error(`Invalid remap for face index ${faceIndex}`)
    }
    faces[f] = remappedIndex
  }

  // Create compacted vertex array
  const welded = new Float32Array(uniqueCount * 3)
  for (let i = 0; i < vertexCount; i++) {
    const srcBase = i * 3
    const remapIndex = remap[i]
    if (remapIndex === undefined || remapIndex === -1) {
      throw new Error(`Invalid remap index for vertex ${i}`)
    }
    const dstBase = remapIndex * 3

    const vx = vertices[srcBase]
    const vy = vertices[srcBase + 1]
    const vz = vertices[srcBase + 2]

    if (vx === undefined || vy === undefined || vz === undefined) {
      throw new Error(`Missing vertex data at index ${i}`)
    }

    welded[dstBase] = vx
    welded[dstBase + 1] = vy
    welded[dstBase + 2] = vz
  }

  return Array.from(welded)
}
