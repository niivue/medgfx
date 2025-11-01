/**
 * Volume rendering fragment shader
 * Implements GPU raycasting through 3D texture with opacity accumulation
 * Based on NiiVue's volume rendering approach
 */

export const volumeRenderFragmentShader = /* glsl */ `
precision highp float;
precision highp sampler3D;

// Inputs from vertex shader
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// Volume data
uniform sampler3D volumeTexture;
uniform sampler2D cmapTexture;

// Raymarching parameters
uniform float numSamples;
uniform float alphaCorrection;

// Intensity windowing (DICOM-style)
uniform float intensityMin;
uniform float intensityMax;
uniform float scaleSlope;
uniform float scaleIntercept;

// Clipping plane
uniform vec3 clipPlaneNormal;
uniform float clipPlaneDistance;
uniform float clipPlaneEnabled;

// Early ray termination
uniform float earlyTerminationThreshold;

// Camera position
uniform vec3 cameraPosition;

/**
 * Ray-box intersection
 * Returns entry (tnear) and exit (tfar) distances along ray
 */
vec2 rayBoxIntersection(vec3 rayOrigin, vec3 rayDir) {
  // Box bounds in object space [-0.5, 0.5]
  vec3 boxMin = vec3(-0.5);
  vec3 boxMax = vec3(0.5);

  vec3 invDir = 1.0 / rayDir;
  vec3 tbot = invDir * (boxMin - rayOrigin);
  vec3 ttop = invDir * (boxMax - rayOrigin);

  vec3 tmin = min(ttop, tbot);
  vec3 tmax = max(ttop, tbot);

  float tnear = max(max(tmin.x, tmin.y), tmin.z);
  float tfar = min(min(tmax.x, tmax.y), tmax.z);

  return vec2(tnear, tfar);
}

/**
 * Apply intensity windowing and colormap lookup
 */
vec4 applyColormap(float intensity) {
  // Apply DICOM scaling
  float scaledIntensity = intensity * scaleSlope + scaleIntercept;

  // Window/level mapping to [0, 1]
  float normalized = (scaledIntensity - intensityMin) / (intensityMax - intensityMin);
  normalized = clamp(normalized, 0.0, 1.0);

  // Lookup in colormap (1D texture stored as 2D with height=1)
  vec4 color = texture2D(cmapTexture, vec2(normalized, 0.5));

  return color;
}

/**
 * Evaluate clipping plane
 * Returns 1.0 if point should be clipped, 0.0 otherwise
 */
float evalClipPlane(vec3 pos) {
  if (clipPlaneEnabled < 0.5) {
    return 0.0;
  }

  float dist = dot(pos, clipPlaneNormal) - clipPlaneDistance;
  return dist > 0.0 ? 1.0 : 0.0;
}

void main() {
  // Calculate ray direction from camera to fragment (in object space)
  vec3 rayOrigin = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vec3 rayTarget = vPosition;
  vec3 rayDir = normalize(rayTarget - rayOrigin);

  // Find ray-box intersection
  vec2 tNearFar = rayBoxIntersection(rayOrigin, rayDir);
  float tNear = max(tNearFar.x, 0.0);
  float tFar = tNearFar.y;

  // Discard if ray misses box or if far < near
  if (tFar < tNear || tFar < 0.0) {
    discard;
  }

  // Calculate step size based on desired number of samples
  float rayLength = tFar - tNear;
  float stepSize = rayLength / numSamples;

  // Initialize accumulation variables
  vec4 accumulatedColor = vec4(0.0);
  float accumulatedAlpha = 0.0;

  // Raymarching loop
  for (float t = tNear; t < tFar; t += stepSize) {
    // Calculate current position along ray
    vec3 samplePos = rayOrigin + rayDir * t;

    // Check clipping plane
    if (evalClipPlane(samplePos) > 0.5) {
      continue;
    }

    // Convert from object space [-0.5, 0.5] to texture space [0, 1]
    vec3 texCoord = samplePos + 0.5;

    // Sample volume texture
    float intensity = texture(volumeTexture, texCoord).r;

    // Apply colormap
    vec4 sampleColor = applyColormap(intensity);

    // Alpha correction for step size
    float correctedAlpha = 1.0 - pow(1.0 - sampleColor.a, alphaCorrection);
    sampleColor.a = correctedAlpha;

    // Front-to-back compositing
    float alpha = sampleColor.a * (1.0 - accumulatedAlpha);
    accumulatedColor.rgb += sampleColor.rgb * alpha;
    accumulatedAlpha += alpha;

    // Early ray termination
    if (accumulatedAlpha >= earlyTerminationThreshold) {
      break;
    }
  }

  // Set final color
  accumulatedColor.a = accumulatedAlpha;
  gl_FragColor = accumulatedColor;

  // Discard fully transparent fragments
  if (accumulatedColor.a < 0.001) {
    discard;
  }
}
`
