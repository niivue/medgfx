# Volume Rendering with Three.js

This document explains the Three.js-based volume rendering implementation in medgfx, designed to provide visual equivalence to NiiVue while leveraging Three.js's ecosystem.

## Architecture

### Overview

The volume renderer uses GPU raycasting through 3D textures, implemented as a Three.js `ShaderMaterial`. This approach combines:

1. **Three.js scene management** - Handles cameras, lights, transforms
2. **Custom GLSL shaders** - Implements medical imaging raycasting
3. **medgfx colortables** - Integrates with existing colormap infrastructure

### Key Components

```
src/rendering/volume-renderer.ts   - Main VolumeRenderer class
src/shaders/volume-render.vert.ts  - Vertex shader (ray setup)
src/shaders/volume-render.frag.ts  - Fragment shader (raycasting)
src/types/volume.ts                - TypeScript type definitions
```

## Implementation Details

### 1. Raycasting Algorithm

The fragment shader implements GPU raycasting with these steps:

```glsl
1. Calculate ray direction from camera through fragment
2. Find ray-box intersection (entry/exit points)
3. March along ray, sampling 3D volume texture
4. Apply colormap lookup for each sample
5. Composite colors using front-to-back blending
6. Apply early ray termination when opacity threshold reached
```

**Key difference from NiiVue:** Instead of manual WebGL setup, we use Three.js's `ShaderMaterial` which automatically handles:
- Uniform updates
- Matrix calculations (modelMatrix, viewMatrix, projectionMatrix)
- Texture binding
- Render state management

### 2. Three.js Integration

```typescript
// VolumeRenderer creates a standard Three.js Mesh
const volumeRenderer = new VolumeRenderer(options)
const mesh = volumeRenderer.getMesh()

// Mesh works like any other Three.js object
scene.add(mesh)
mesh.position.set(1, 0, 0)
mesh.rotation.y = Math.PI / 4
```

The `BoxGeometry` with `BackSide` rendering provides the ray entry points:

```typescript
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.ShaderMaterial({
  side: THREE.BackSide,  // Critical for raycasting!
  transparent: true,
  depthWrite: false
})
```

### 3. 3D Texture Management

Three.js `Data3DTexture` replaces manual WebGL 3D texture setup:

```typescript
const texture = new THREE.Data3DTexture(data, width, height, depth)
texture.format = THREE.RedFormat
texture.type = THREE.UnsignedByteType  // or UnsignedShortType, FloatType
texture.minFilter = THREE.LinearFilter
texture.magFilter = THREE.LinearFilter
texture.wrapS = THREE.ClampToEdgeWrapping
texture.wrapT = THREE.ClampToEdgeWrapping
texture.wrapR = THREE.ClampToEdgeWrapping
```

**Benefits:**
- Automatic WebGL context handling
- Memory management (dispose tracking)
- Type safety with TypeScript
- Consistent API with other Three.js textures

### 4. Colormap Implementation

Uses medgfx's existing `ColorTables` to create 1D lookup textures:

```typescript
// ColorTables generates 256*4 RGBA array
const lut = colortables.colormap('hot')  // Uint8ClampedArray(1024)

// Convert to Three.js DataTexture
const cmapTexture = new THREE.DataTexture(
  lut,
  256,    // width
  1,      // height (1D stored as thin 2D)
  THREE.RGBAFormat,
  THREE.UnsignedByteType
)
```

Fragment shader lookup:

```glsl
// Normalize intensity to [0, 1]
float normalized = (intensity - intensityMin) / (intensityMax - intensityMin);

// Sample colormap texture
vec4 color = texture2D(cmapTexture, vec2(normalized, 0.5));
```

### 5. Opacity Accumulation

Front-to-back compositing with alpha correction:

```glsl
// Alpha correction compensates for step size
float correctedAlpha = 1.0 - pow(1.0 - sampleColor.a, alphaCorrection);

// Front-to-back blending
float alpha = correctedAlpha * (1.0 - accumulatedAlpha);
accumulatedColor.rgb += sampleColor.rgb * alpha;
accumulatedAlpha += alpha;

// Early termination
if (accumulatedAlpha >= earlyTerminationThreshold) {
  break;
}
```

**NiiVue Equivalence:** Uses identical alpha blending math to ensure visual consistency.

### 6. Clipping Planes

Implemented in fragment shader with per-fragment evaluation:

```glsl
float evalClipPlane(vec3 pos) {
  if (clipPlaneEnabled < 0.5) return 0.0;

  float dist = dot(pos, clipPlaneNormal) - clipPlaneDistance;
  return dist > 0.0 ? 1.0 : 0.0;
}

// In raymarching loop:
if (evalClipPlane(samplePos) > 0.5) {
  continue;  // Skip this sample
}
```

**Future Enhancement:** Three.js has built-in clipping planes, but custom implementation gives more control for medical imaging needs.

### 7. DICOM Intensity Windowing

Applies scale/intercept then window/level:

```glsl
// Apply DICOM scaling
float scaledIntensity = intensity * scaleSlope + scaleIntercept;

// Apply window/level to map to [0, 1]
float normalized = (scaledIntensity - intensityMin) / (intensityMax - intensityMin);
normalized = clamp(normalized, 0.0, 1.0);
```

**NiiVue Compatibility:** Matches NIFTI header `scl_slope`, `scl_inter`, `cal_min`, `cal_max` handling.

## API Reference

### VolumeRenderer Constructor

```typescript
new VolumeRenderer(options: VolumeRendererOptions)
```

**Options:**
- `width`, `height`, `depth` - Volume dimensions in voxels
- `data` - Uint8Array | Uint16Array | Float32Array
- `dataType?` - 'uint8' | 'uint16' | 'float32'
- `samplesPerVoxel?` - Ray samples per voxel unit (default: 1.0)
- `alphaCorrection?` - Opacity correction factor (default: 1.0)
- `earlyRayTermination?` - Enable optimization (default: true)
- `terminationThreshold?` - Opacity threshold (default: 0.95)

### Methods

```typescript
// Get Three.js mesh for scene
getMesh(): THREE.Mesh

// Get material for advanced customization
getMaterial(): THREE.ShaderMaterial

// Update colormap (256*4 RGBA array)
setColormap(lut: Uint8ClampedArray): void

// Set intensity window
setIntensityWindow(window: IntensityWindow): void

// Set clipping plane
setClipPlane(plane: ClipPlane): void

// Adjust quality
setSamples(numSamples: number): void
setAlphaCorrection(alpha: number): void

// Update volume data
updateVolumeData(
  data: Uint8Array | Uint16Array | Float32Array,
  width?: number,
  height?: number,
  depth?: number
): void

// Cleanup
dispose(): void
```

## Advantages Over Raw WebGL

### What Three.js Handles for You

1. **Scene Graph**
   - Automatic transform hierarchy
   - World/local space conversions
   - Frustum culling

2. **Camera Management**
   - Projection matrix updates
   - View matrix calculations
   - Built-in camera types (Perspective, Orthographic)

3. **Render State**
   - Shader program switching
   - Uniform uploads
   - Texture binding
   - Blend mode management

4. **Developer Experience**
   - TypeScript types for everything
   - Consistent API across features
   - Extensive documentation
   - Large community & examples

### What You Still Control

1. **Custom Shaders**
   - Full GLSL control for medical imaging algorithms
   - Direct access to uniforms
   - Custom vertex/fragment logic

2. **Rendering Pipeline**
   - When and how volumes are rendered
   - Multi-pass rendering via WebGLRenderTarget
   - Post-processing effects

3. **Data Management**
   - Volume data loading/parsing
   - Memory optimization
   - Texture streaming

## Performance Characteristics

### GPU Memory Usage

```
Volume: width × height × depth × bytesPerVoxel
Colormap: 256 × 4 bytes = 1 KB
Geometry: ~2 KB (box vertices + indices)

Example 512³ Uint16 volume: 512³ × 2 = 268 MB
```

### Render Performance

Factors affecting FPS:
1. **Number of samples** - Higher = better quality, slower
2. **Volume resolution** - Larger = more texture fetch latency
3. **Early ray termination** - Reduces samples in empty space
4. **Screen resolution** - More fragments = more raycasting

**Optimization tips:**
- Start with `samplesPerVoxel: 1.0`, increase as needed
- Enable early termination (on by default)
- Use Uint8 data when possible (half memory vs Uint16)
- Consider downsampling for navigation, full-res for final render

### Compared to NiiVue

- **Similar GPU cost** - Same raycasting algorithm
- **Slightly higher CPU overhead** - Three.js scene graph traversal
- **Better scaling** - Three.js optimizations for complex scenes

## Future Enhancements

### Planned Features

1. **Gradient-Based Lighting**
   - Sobel gradient computation
   - MatCap lighting
   - Fresnel/silhouette effects

2. **Multi-Volume Rendering**
   - Layer blending
   - Dual colormaps (positive/negative)
   - Registration/overlay support

3. **GPU Segmentation**
   - GrowCut algorithm
   - Drawing layer integration
   - Annotation rendering

4. **Advanced Rendering**
   - Maximum intensity projection (MIP)
   - Minimum intensity projection (MinIP)
   - Average intensity projection (AIP)
   - Isosurface extraction

### Research Directions

1. **WebGPU Migration**
   - Next-generation graphics API
   - Compute shaders for preprocessing
   - Better performance on modern hardware

2. **Tiled Rendering**
   - Stream large volumes from disk/network
   - Octree-based LOD
   - Out-of-core rendering

3. **AI Integration**
   - On-GPU model inference
   - Real-time segmentation
   - Denoising/super-resolution

## Comparison: NiiVue vs medgfx+Three.js

### Code Complexity

**NiiVue (raw WebGL):**
```typescript
// Manual WebGL setup
const program = gl.createProgram()
gl.attachShader(program, vertShader)
gl.attachShader(program, fragShader)
gl.linkProgram(program)

// Manual uniform locations
const uVolume = gl.getUniformLocation(program, 'volumeTexture')
gl.uniform1i(uVolume, 0)

// Manual matrix math
const mvpMatrix = multiplyMatrices(proj, view, model)
gl.uniformMatrix4fv(uMVP, false, mvpMatrix)
```

**medgfx+Three.js:**
```typescript
// Automatic setup via ShaderMaterial
const material = new THREE.ShaderMaterial({
  uniforms: {
    volumeTexture: { value: texture }
  },
  vertexShader,
  fragmentShader
})

// Automatic matrix handling
mesh.position.set(1, 0, 0)
// modelMatrix, viewMatrix, projectionMatrix auto-updated!
```

### Maintenance Burden

| Task | NiiVue | medgfx+Three.js |
|------|--------|-----------------|
| Add new uniform | Update shader + manual binding | Add to uniforms object |
| Handle resize | Manual viewport + projection update | Automatic via renderer |
| Add lighting | Full lighting code from scratch | Use Three.js built-ins |
| Object transforms | Manual matrix math | mesh.position/rotation/scale |
| Camera controls | Custom trackball implementation | Import OrbitControls |

### Learning Curve

- **NiiVue:** Requires deep WebGL knowledge
- **medgfx+Three.js:** Three.js familiarity + GLSL basics

## Conclusion

The Three.js-based volume renderer provides **visual equivalence to NiiVue** while offering:

✅ **Simpler codebase** - Less boilerplate, more features
✅ **Faster development** - Leverage Three.js ecosystem
✅ **Easier maintenance** - Well-documented, widely-used library
✅ **Better scalability** - Scene graph, controls, loaders included
✅ **No sacrifice in features** - Full control via custom shaders

The custom raycasting shader ensures medical imaging quality while Three.js handles everything else.
