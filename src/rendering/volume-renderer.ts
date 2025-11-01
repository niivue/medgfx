/**
 * VolumeRenderer - Three.js-based volume renderer
 * Implements GPU raycasting for medical imaging volumes
 * Compatible with NiiVue's rendering approach
 */

import * as THREE from 'three'
import { logger } from '../logger'
import { volumeRenderVertexShader } from '../shaders/volume-render.vert'
import { volumeRenderFragmentShader } from '../shaders/volume-render.frag'
import type {
  VolumeRendererOptions,
  VolumeUniforms,
  ClipPlane,
  IntensityWindow
} from '../types/volume'

/**
 * VolumeRenderer class
 * Manages Three.js mesh with custom volume rendering shaders
 */
export class VolumeRenderer {
  private mesh: THREE.Mesh
  private material: THREE.ShaderMaterial
  private uniforms: VolumeUniforms
  private volumeTexture: THREE.Data3DTexture | null = null
  private cmapTexture: THREE.DataTexture
  private dimensions: { width: number; height: number; depth: number }

  constructor(options: VolumeRendererOptions) {
    this.dimensions = {
      width: options.width,
      height: options.height,
      depth: options.depth
    }

    // Create 3D texture from volume data
    this.volumeTexture = this.createVolumeTexture(
      options.data,
      options.width,
      options.height,
      options.depth,
      options.dataType
    )

    // Create default grayscale colormap
    this.cmapTexture = this.createDefaultColormap()

    // Calculate number of samples based on volume size and quality
    const maxDim = Math.max(options.width, options.height, options.depth)
    const numSamples = maxDim * (options.samplesPerVoxel ?? 1.0)

    // Initialize uniforms
    this.uniforms = {
      volumeTexture: { value: this.volumeTexture },
      cmapTexture: { value: this.cmapTexture },
      numSamples: { value: numSamples },
      alphaCorrection: { value: options.alphaCorrection ?? 1.0 },
      intensityMin: { value: 0.0 },
      intensityMax: { value: 1.0 },
      scaleSlope: { value: 1.0 },
      scaleIntercept: { value: 0.0 },
      clipPlaneNormal: { value: new THREE.Vector3(0, 0, 1) },
      clipPlaneDistance: { value: 0.0 },
      clipPlaneEnabled: { value: 0.0 },
      earlyTerminationThreshold: { value: options.terminationThreshold ?? 0.95 }
    }

    // Create shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: volumeRenderVertexShader,
      fragmentShader: volumeRenderFragmentShader,
      transparent: true,
      side: THREE.BackSide, // Render back faces for raycasting
      depthWrite: false,
      depthTest: true
    })

    // Create box geometry centered at origin
    // Size will be scaled appropriately in world space
    const geometry = new THREE.BoxGeometry(1, 1, 1)

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material)

    // Scale mesh to match volume aspect ratio
    const scale = this.calculateScale()
    this.mesh.scale.set(scale.x, scale.y, scale.z)

    logger.info(
      {
        component: 'VolumeRenderer',
        dimensions: this.dimensions,
        numSamples,
        scale
      },
      'Volume renderer created'
    )
  }

  /**
   * Create Three.js Data3DTexture from volume data
   */
  private createVolumeTexture(
    data: Uint8Array | Uint16Array | Float32Array,
    width: number,
    height: number,
    depth: number,
    dataType: 'uint8' | 'uint16' | 'float32' = 'uint8'
  ): THREE.Data3DTexture {
    // Determine Three.js format and type based on input
    let format: THREE.PixelFormat = THREE.RedFormat
    let type: THREE.TextureDataType

    switch (dataType) {
      case 'uint8':
        type = THREE.UnsignedByteType
        break
      case 'uint16':
        type = THREE.UnsignedShortType
        break
      case 'float32':
        type = THREE.FloatType
        break
      default:
        type = THREE.UnsignedByteType
    }

    const texture = new THREE.Data3DTexture(data, width, height, depth)
    texture.format = format
    texture.type = type
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.wrapR = THREE.ClampToEdgeWrapping
    texture.unpackAlignment = 1
    texture.needsUpdate = true

    return texture
  }

  /**
   * Create default grayscale colormap (256 entries, RGBA)
   */
  private createDefaultColormap(): THREE.DataTexture {
    const size = 256
    const data = new Uint8Array(size * 4)

    for (let i = 0; i < size; i++) {
      const idx = i * 4
      data[idx] = i // R
      data[idx + 1] = i // G
      data[idx + 2] = i // B
      data[idx + 3] = i === 0 ? 0 : 255 // A (transparent at 0)
    }

    const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true

    return texture
  }

  /**
   * Calculate mesh scale to match volume aspect ratio
   */
  private calculateScale(): THREE.Vector3 {
    const { width, height, depth } = this.dimensions
    const maxDim = Math.max(width, height, depth)

    return new THREE.Vector3(width / maxDim, height / maxDim, depth / maxDim)
  }

  /**
   * Update colormap from LUT data
   * Compatible with medgfx ColorTables LUT format
   */
  setColormap(lut: Uint8ClampedArray): void {
    // LUT should be 256 * 4 (RGBA)
    if (lut.length !== 1024) {
      logger.warn(
        { component: 'VolumeRenderer', lutLength: lut.length },
        'Invalid LUT size, expected 1024 (256 * 4)'
      )
      return
    }

    // Update texture data
    const data = new Uint8Array(lut)
    this.cmapTexture.image.data = data
    this.cmapTexture.needsUpdate = true

    logger.info({ component: 'VolumeRenderer' }, 'Colormap updated')
  }

  /**
   * Set intensity windowing (DICOM-style)
   */
  setIntensityWindow(window: IntensityWindow): void {
    this.uniforms.intensityMin.value = window.min
    this.uniforms.intensityMax.value = window.max
    this.uniforms.scaleSlope.value = window.slope ?? 1.0
    this.uniforms.scaleIntercept.value = window.intercept ?? 0.0

    logger.info(
      {
        component: 'VolumeRenderer',
        window
      },
      'Intensity window updated'
    )
  }

  /**
   * Set clipping plane
   */
  setClipPlane(plane: ClipPlane): void {
    this.uniforms.clipPlaneNormal.value.copy(plane.normal)
    this.uniforms.clipPlaneDistance.value = plane.distance
    this.uniforms.clipPlaneEnabled.value = plane.enabled ? 1.0 : 0.0

    logger.info(
      {
        component: 'VolumeRenderer',
        plane
      },
      'Clipping plane updated'
    )
  }

  /**
   * Set number of raymarching samples
   */
  setSamples(numSamples: number): void {
    this.uniforms.numSamples.value = numSamples
    logger.info({ component: 'VolumeRenderer', numSamples }, 'Sample count updated')
  }

  /**
   * Set alpha correction factor
   */
  setAlphaCorrection(alpha: number): void {
    this.uniforms.alphaCorrection.value = alpha
    logger.info({ component: 'VolumeRenderer', alpha }, 'Alpha correction updated')
  }

  /**
   * Get the Three.js mesh for adding to scene
   */
  getMesh(): THREE.Mesh {
    return this.mesh
  }

  /**
   * Get the shader material (for advanced customization)
   */
  getMaterial(): THREE.ShaderMaterial {
    return this.material
  }

  /**
   * Update volume data
   */
  updateVolumeData(
    data: Uint8Array | Uint16Array | Float32Array,
    width?: number,
    height?: number,
    depth?: number
  ): void {
    const w = width ?? this.dimensions.width
    const h = height ?? this.dimensions.height
    const d = depth ?? this.dimensions.depth

    if (this.volumeTexture) {
      this.volumeTexture.dispose()
    }

    // Determine data type
    let dataType: 'uint8' | 'uint16' | 'float32' = 'uint8'
    if (data instanceof Uint16Array) {
      dataType = 'uint16'
    } else if (data instanceof Float32Array) {
      dataType = 'float32'
    }

    this.volumeTexture = this.createVolumeTexture(data, w, h, d, dataType)
    this.uniforms.volumeTexture.value = this.volumeTexture

    // Update dimensions
    this.dimensions = { width: w, height: h, depth: d }

    // Update scale
    const scale = this.calculateScale()
    this.mesh.scale.set(scale.x, scale.y, scale.z)

    logger.info(
      {
        component: 'VolumeRenderer',
        dimensions: this.dimensions
      },
      'Volume data updated'
    )
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()

    if (this.volumeTexture) {
      this.volumeTexture.dispose()
    }

    this.cmapTexture.dispose()

    logger.info({ component: 'VolumeRenderer' }, 'Volume renderer disposed')
  }
}
