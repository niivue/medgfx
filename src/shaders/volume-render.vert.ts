/**
 * Volume rendering vertex shader
 * Sets up ray entry and exit points for GPU raycasting
 */

export const volumeRenderVertexShader = /* glsl */ `
// Vertex shader outputs
varying vec3 vPosition;      // Object-space position (for raycasting)
varying vec3 vWorldPosition; // World-space position
varying vec3 vNormal;        // Interpolated normal

void main() {
  // Pass object-space position to fragment shader
  // This will be used as ray entry point
  vPosition = position;

  // Calculate world position
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Pass normal for lighting (if needed)
  vNormal = normalMatrix * normal;

  // Standard MVP transformation
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
