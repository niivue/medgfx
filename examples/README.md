# Volume Rendering Examples

This directory contains examples demonstrating the Three.js-based volume renderer in medgfx.

## Examples

### `volume-rendering-simple.ts`

A minimal TypeScript example showing basic volume rendering setup with:
- Synthetic sphere volume data
- Colormap application using medgfx colortables
- Intensity windowing
- Basic camera controls

**Run with:**
```bash
bun run dev
# Then open the dev server and import this example
```

### `volume-rendering.html`

A complete interactive demo with UI controls for:
- Adjusting sample count (ray quality)
- Alpha correction (opacity tuning)
- Intensity windowing (min/max)
- Clipping planes
- Volume data regeneration

**Run with:**
```bash
# Build the project first
bun run build

# Then serve the examples folder
# (use any static server, e.g., python -m http.server)
```

## Features Demonstrated

### GPU Raycasting
The volume renderer uses GPU raycasting through 3D textures, similar to NiiVue's approach:
- Front-to-back compositing
- Early ray termination
- Opacity accumulation

### Colormap Support
Full integration with medgfx's ColorTables system:
```typescript
import { colortables } from 'medgfx/colortables'

const lut = colortables.colormap('hot')
volumeRenderer.setColormap(lut)
```

Available colormaps include: grayscale, hot, cool, viridis, and many more.

### Intensity Windowing
DICOM-style intensity windowing for adjusting visible value ranges:
```typescript
volumeRenderer.setIntensityWindow({
  min: 100,
  max: 500,
  slope: 1.0,    // DICOM scl_slope
  intercept: 0.0 // DICOM scl_inter
})
```

### Clipping Planes
Interactive clipping for exploring internal structures:
```typescript
volumeRenderer.setClipPlane({
  normal: new THREE.Vector3(0, 0, 1),
  distance: 0.5,
  enabled: true
})
```

### Quality Control
Adjustable rendering quality vs performance:
```typescript
// Higher samples = better quality, slower
volumeRenderer.setSamples(512)

// Alpha correction affects opacity accumulation
volumeRenderer.setAlphaCorrection(1.5)
```

## Integration with Three.js

The VolumeRenderer returns a standard Three.js `Mesh` that integrates seamlessly:

```typescript
const volumeRenderer = new VolumeRenderer({
  width: 128,
  height: 128,
  depth: 128,
  data: myVolumeData
})

const mesh = volumeRenderer.getMesh()
scene.add(mesh)

// Standard Three.js operations work
mesh.position.set(1, 0, 0)
mesh.rotation.y = Math.PI / 4
```

## Comparison with NiiVue

This implementation provides visual equivalence to NiiVue's volume rendering while leveraging Three.js:

| Feature | NiiVue | medgfx + Three.js |
|---------|--------|-------------------|
| GPU Raycasting | ✓ Custom WebGL | ✓ THREE.ShaderMaterial |
| 3D Textures | ✓ Manual | ✓ THREE.Data3DTexture |
| Opacity Accumulation | ✓ | ✓ |
| Early Ray Termination | ✓ | ✓ |
| Colormaps | ✓ | ✓ |
| Clipping Planes | ✓ | ✓ |
| Intensity Windowing | ✓ | ✓ |
| Scene Graph | Custom | ✓ Three.js (easier!) |
| Camera Controls | Custom | ✓ OrbitControls (free!) |
| Mesh Rendering | Custom shaders | ✓ Built-in materials |

**Key Advantage:** Three.js handles scene management, cameras, controls, and other rendering infrastructure, letting you focus on medical imaging features.

## Loading Real Medical Data

To load actual medical imaging data (NIFTI, DICOM, etc.), you'll need a parser:

```typescript
// Example with hypothetical NIFTI loader
import { NiftiReader } from 'nifti-reader-js'

const nifti = NiftiReader.readHeader(niftiData)
const imageData = NiftiReader.readImage(niftiData)

const volumeRenderer = new VolumeRenderer({
  width: nifti.dims[1],
  height: nifti.dims[2],
  depth: nifti.dims[3],
  data: new Uint8Array(imageData),
  dataType: 'uint8' // or 'uint16', 'float32'
})
```

## Performance Tips

1. **Adjust sample count** based on volume size and hardware
2. **Enable early ray termination** (enabled by default)
3. **Use appropriate data types** (Uint8 for most cases, Float32 for precise medical data)
4. **Consider downsampling** large volumes for preview/navigation

## Next Steps

- Integrate with medical image file loaders (NIFTI, DICOM)
- Add gradient-based lighting (MatCap, Fresnel)
- Support multiple volume overlays
- Implement GPU-based segmentation (GrowCut)
