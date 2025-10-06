import { vec3, vec4 } from "gl-matrix"
import { getFirstPerpVector } from "../utils/vector"
import { subdivideSphereMesh, weldVertices } from "../utils/mesh"

/**
 * Generates a unit icosphere and adds it to the provided vertex and index arrays.
 * The sphere is created through subdivision of an icosahedron.
 *
 * @param vertices - Array to append vertex positions (x,y,z) to
 * @param indices - Array to append triangle indices to
 * @param radius - Radius of the sphere
 * @param origin - Center point of the sphere (defaults to origin)
 */
export function createSphere(
  vertices: number[],
  indices: number[],
  radius: number,
  origin: vec3 | vec4 = [0, 0, 0]
): void {
  // Start with icosahedron vertices
  let vtx = [
    0.0, 0.0, 1.0, 0.894, 0.0, 0.447, 0.276, 0.851, 0.447, -0.724, 0.526, 0.447, -0.724, -0.526, 0.447, 0.276, -0.851,
    0.447, 0.724, 0.526, -0.447, -0.276, 0.851, -0.447, -0.894, 0.0, -0.447, -0.276, -0.851, -0.447, 0.724, -0.526,
    -0.447, 0.0, 0.0, -1.0
  ]

  const idx = [
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 1, 7, 6, 11, 8, 7, 11, 9, 8, 11, 10, 9, 11, 6, 10, 11, 6, 2, 1, 7, 3, 2,
    8, 4, 3, 9, 5, 4, 10, 1, 5, 6, 7, 2, 7, 8, 3, 8, 9, 4, 9, 10, 5, 10, 6, 1
  ]

  // Subdivide twice for smooth sphere
  subdivideSphereMesh(vtx, idx)
  subdivideSphereMesh(vtx, idx)

  // Remove duplicate vertices
  vtx = weldVertices(vtx, idx)

  // Scale and translate vertices
  const vertexCount = vtx.length / 3
  for (let i = 0; i < vertexCount; i++) {
    const base = i * 3
    const x = vtx[base]
    const y = vtx[base + 1]
    const z = vtx[base + 2]

    if (x === undefined || y === undefined || z === undefined) {
      throw new Error(`Missing vertex data at index ${i}`)
    }

    vtx[base] = x * radius + origin[0]
    vtx[base + 1] = y * radius + origin[1]
    vtx[base + 2] = z * radius + origin[2]
  }

  // Offset indices for existing vertices
  const indexOffset = Math.floor(vertices.length / 3)
  const offsetIndices = idx.map((i) => i + indexOffset)

  indices.push(...offsetIndices)
  vertices.push(...vtx)
}

/**
 * Generates a cylinder mesh between two points.
 *
 * @param vertices - Array to append vertex positions to
 * @param indices - Array to append triangle indices to
 * @param start - Start point of cylinder axis
 * @param end - End point of cylinder axis
 * @param radius - Radius of the cylinder
 * @param sides - Number of sides (minimum 3)
 * @param endcaps - Whether to include circular endcaps
 */
export function createCylinder(
  vertices: number[],
  indices: number[],
  start: vec3,
  end: vec3,
  radius: number,
  sides = 20,
  endcaps = true
): void {
  const clampedSides = Math.max(3, sides)

  // Calculate cylinder axis
  const axis = vec3.create()
  vec3.subtract(axis, end, start)
  vec3.normalize(axis, axis)

  // Get two perpendicular vectors to form coordinate system
  const perp1 = getFirstPerpVector(axis)
  const perp2 = vec3.create()
  vec3.cross(perp2, axis, perp1)
  vec3.normalize(perp2, perp2)

  // Calculate vertex and face counts
  const vertexCount = endcaps ? 2 * clampedSides + 2 : 2 * clampedSides
  const faceCount = endcaps ? 4 * clampedSides : 2 * clampedSides

  const indexOffset = Math.floor(vertices.length / 3)
  const idx = new Uint32Array(faceCount * 3)
  const vtx = new Float32Array(vertexCount * 3)

  // Helper to set vertex position
  const setVertex = (i: number, pos: vec3): void => {
    vtx[i * 3] = pos[0]
    vtx[i * 3 + 1] = pos[1]
    vtx[i * 3 + 2] = pos[2]
  }

  // Helper to set triangle indices
  const setTriangle = (i: number, a: number, b: number, c: number): void => {
    idx[i * 3] = a + indexOffset
    idx[i * 3 + 1] = b + indexOffset
    idx[i * 3 + 2] = c + indexOffset
  }

  // Pole vertices for endcaps
  const startPoleIndex = 2 * clampedSides
  const endPoleIndex = startPoleIndex + 1

  if (endcaps) {
    setVertex(startPoleIndex, start)
    setVertex(endPoleIndex, end)
  }

  // Generate ring vertices and faces
  const offset = vec3.create()
  const point = vec3.create()

  for (let i = 0; i < clampedSides; i++) {
    const angle = (i / clampedSides) * 2 * Math.PI
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // Calculate offset from axis
    offset[0] = radius * (cos * perp1[0] + sin * perp2[0])
    offset[1] = radius * (cos * perp1[1] + sin * perp2[1])
    offset[2] = radius * (cos * perp1[2] + sin * perp2[2])

    // Start ring vertex
    vec3.add(point, start, offset)
    setVertex(i, point)

    // End ring vertex
    vec3.add(point, end, offset)
    setVertex(i + clampedSides, point)

    // Next index (wraps around)
    const next = i < clampedSides - 1 ? i + 1 : 0

    // Cylinder side faces (two triangles per quad)
    setTriangle(i * 2, i, next, i + clampedSides)
    setTriangle(i * 2 + 1, next, next + clampedSides, i + clampedSides)

    // Endcap faces
    if (endcaps) {
      setTriangle(clampedSides * 2 + i, i, startPoleIndex, next)
      setTriangle(clampedSides * 2 + i + clampedSides, endPoleIndex, i + clampedSides, next + clampedSides)
    }
  }

  indices.push(...idx)
  vertices.push(...vtx)
}

/**
 * Creates a colored sphere by generating geometry and corresponding RGBA colors.
 *
 * @param vertices - Array to append vertex positions to
 * @param indices - Array to append triangle indices to
 * @param colors - Array to append RGBA8 colors to (0-255 range)
 * @param radius - Radius of the sphere
 * @param origin - Center point of the sphere
 * @param rgba255 - Color as [R, G, B, A] in 0-255 range
 */
export function createColoredSphere(
  vertices: number[],
  indices: number[],
  colors: number[],
  radius: number,
  origin: vec3 | vec4 = [0, 0, 0],
  rgba255 = [0, 0, 192, 255]
): void {
  const initialVertexCount = vertices.length / 3
  createSphere(vertices, indices, radius, origin)
  const addedVertexCount = vertices.length / 3 - initialVertexCount

  // Add color for each vertex
  for (let i = 0; i < addedVertexCount; i++) {
    colors.push(...rgba255)
  }
}

/**
 * Creates a colored cylinder by generating geometry and corresponding RGBA colors.
 *
 * @param vertices - Array to append vertex positions to
 * @param indices - Array to append triangle indices to
 * @param colors - Array to append RGBA8 colors to
 * @param start - Start point of cylinder
 * @param end - End point of cylinder
 * @param radius - Radius of the cylinder
 * @param rgba255 - Color as [R, G, B, A] in 0-255 range
 * @param sides - Number of sides
 * @param endcaps - Whether to include endcaps
 */
export function createColoredCylinder(
  vertices: number[],
  indices: number[],
  colors: number[],
  start: vec3,
  end: vec3,
  radius: number,
  rgba255 = [192, 0, 0, 255],
  sides = 20,
  endcaps = false
): void {
  const initialVertexCount = vertices.length / 3
  createCylinder(vertices, indices, start, end, radius, sides, endcaps)
  const addedVertexCount = vertices.length / 3 - initialVertexCount

  // Add color for each vertex
  for (let i = 0; i < addedVertexCount; i++) {
    colors.push(...rgba255)
  }
}
