/**
 * VolumeRenderer unit tests
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { VolumeRenderer } from './volume-renderer'
import * as THREE from 'three'
import '@happy-dom/global-registrator'

// Setup WebGL context mock for testing
beforeAll(() => {
  // @ts-expect-error - Mock WebGL2 support
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === 'webgl2' || contextType === 'webgl') {
      return {} as WebGL2RenderingContext
    }
    return null
  }
})

describe('VolumeRenderer', () => {
  test('should create renderer with default options', () => {
    const width = 64
    const height = 64
    const depth = 64
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    expect(renderer).toBeDefined()
    expect(renderer.getMesh()).toBeInstanceOf(THREE.Mesh)
    expect(renderer.getMaterial()).toBeInstanceOf(THREE.ShaderMaterial)

    renderer.dispose()
  })

  test('should create renderer with custom options', () => {
    const width = 32
    const height = 64
    const depth = 128
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data,
      samplesPerVoxel: 2.0,
      alphaCorrection: 0.5,
      earlyRayTermination: true,
      terminationThreshold: 0.9
    })

    expect(renderer).toBeDefined()

    const material = renderer.getMaterial()
    expect(material.uniforms.alphaCorrection.value).toBe(0.5)
    expect(material.uniforms.earlyTerminationThreshold.value).toBe(0.9)

    renderer.dispose()
  })

  test('should handle different data types', () => {
    const width = 16
    const height = 16
    const depth = 16

    // Test Uint8Array
    const data8 = new Uint8Array(width * height * depth)
    const renderer8 = new VolumeRenderer({
      width,
      height,
      depth,
      data: data8,
      dataType: 'uint8'
    })
    expect(renderer8).toBeDefined()
    renderer8.dispose()

    // Test Uint16Array
    const data16 = new Uint16Array(width * height * depth)
    const renderer16 = new VolumeRenderer({
      width,
      height,
      depth,
      data: data16,
      dataType: 'uint16'
    })
    expect(renderer16).toBeDefined()
    renderer16.dispose()

    // Test Float32Array
    const dataFloat = new Float32Array(width * height * depth)
    const rendererFloat = new VolumeRenderer({
      width,
      height,
      depth,
      data: dataFloat,
      dataType: 'float32'
    })
    expect(rendererFloat).toBeDefined()
    rendererFloat.dispose()
  })

  test('should scale mesh based on volume aspect ratio', () => {
    const data = new Uint8Array(32 * 64 * 128)

    const renderer = new VolumeRenderer({
      width: 32,
      height: 64,
      depth: 128,
      data
    })

    const mesh = renderer.getMesh()
    const scale = mesh.scale

    // Largest dimension (depth=128) should be 1.0
    expect(scale.x).toBe(32 / 128) // 0.25
    expect(scale.y).toBe(64 / 128) // 0.5
    expect(scale.z).toBe(128 / 128) // 1.0

    renderer.dispose()
  })

  test('should update colormap', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    // Create custom LUT (256 * 4 = 1024)
    const lut = new Uint8ClampedArray(1024)
    for (let i = 0; i < 256; i++) {
      lut[i * 4] = 255 - i // R
      lut[i * 4 + 1] = 0 // G
      lut[i * 4 + 2] = 0 // B
      lut[i * 4 + 3] = 255 // A
    }

    renderer.setColormap(lut)

    const material = renderer.getMaterial()
    expect(material.uniforms.cmapTexture.value).toBeDefined()

    renderer.dispose()
  })

  test('should set intensity window', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    renderer.setIntensityWindow({
      min: 100,
      max: 500,
      slope: 1.5,
      intercept: 0.5
    })

    const material = renderer.getMaterial()
    expect(material.uniforms.intensityMin.value).toBe(100)
    expect(material.uniforms.intensityMax.value).toBe(500)
    expect(material.uniforms.scaleSlope.value).toBe(1.5)
    expect(material.uniforms.scaleIntercept.value).toBe(0.5)

    renderer.dispose()
  })

  test('should set clipping plane', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    const normal = new THREE.Vector3(1, 0, 0)
    renderer.setClipPlane({
      normal,
      distance: 0.5,
      enabled: true
    })

    const material = renderer.getMaterial()
    expect(material.uniforms.clipPlaneNormal.value.x).toBe(1)
    expect(material.uniforms.clipPlaneNormal.value.y).toBe(0)
    expect(material.uniforms.clipPlaneNormal.value.z).toBe(0)
    expect(material.uniforms.clipPlaneDistance.value).toBe(0.5)
    expect(material.uniforms.clipPlaneEnabled.value).toBe(1.0)

    renderer.dispose()
  })

  test('should update sample count', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    renderer.setSamples(512)

    const material = renderer.getMaterial()
    expect(material.uniforms.numSamples.value).toBe(512)

    renderer.dispose()
  })

  test('should update alpha correction', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    renderer.setAlphaCorrection(0.8)

    const material = renderer.getMaterial()
    expect(material.uniforms.alphaCorrection.value).toBe(0.8)

    renderer.dispose()
  })

  test('should update volume data', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    // Update with new data and dimensions
    const newData = new Uint8Array(32 * 32 * 32)
    renderer.updateVolumeData(newData, 32, 32, 32)

    const mesh = renderer.getMesh()
    expect(mesh.scale.x).toBe(1.0)
    expect(mesh.scale.y).toBe(1.0)
    expect(mesh.scale.z).toBe(1.0)

    renderer.dispose()
  })

  test('should properly dispose resources', () => {
    const width = 16
    const height = 16
    const depth = 16
    const data = new Uint8Array(width * height * depth)

    const renderer = new VolumeRenderer({
      width,
      height,
      depth,
      data
    })

    const mesh = renderer.getMesh()
    const material = renderer.getMaterial()

    // Should not throw
    expect(() => renderer.dispose()).not.toThrow()

    // Geometry and material should be disposed (no direct way to test, but shouldn't error)
    expect(mesh.geometry).toBeDefined()
    expect(material).toBeDefined()
  })
})
