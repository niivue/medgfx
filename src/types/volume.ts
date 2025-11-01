/**
 * Volume rendering type definitions
 */

import type * as THREE from 'three'

/**
 * Options for creating a VolumeRenderer
 */
export interface VolumeRendererOptions {
  /** Width of the volume in voxels */
  width: number
  /** Height of the volume in voxels */
  height: number
  /** Depth of the volume in voxels */
  depth: number
  /** Volume data as typed array */
  data: Uint8Array | Uint16Array | Float32Array
  /** Data type hint (default: 'uint8') */
  dataType?: 'uint8' | 'uint16' | 'float32'
  /** Number of ray samples per voxel unit (default: 1.0) */
  samplesPerVoxel?: number
  /** Alpha correction factor (default: 1.0) */
  alphaCorrection?: number
  /** Enable early ray termination (default: true) */
  earlyRayTermination?: boolean
  /** Opacity threshold for early termination (default: 0.95) */
  terminationThreshold?: number
}

/**
 * Clipping plane configuration
 */
export interface ClipPlane {
  /** Plane normal vector */
  normal: THREE.Vector3
  /** Distance from origin */
  distance: number
  /** Enable this clipping plane */
  enabled: boolean
}

/**
 * Volume intensity windowing (DICOM-style)
 */
export interface IntensityWindow {
  /** Minimum intensity value (cal_min) */
  min: number
  /** Maximum intensity value (cal_max) */
  max: number
  /** Slope for linear transformation (scl_slope) */
  slope?: number
  /** Intercept for linear transformation (scl_inter) */
  intercept?: number
}

/**
 * Volume rendering uniforms
 * Compatible with Three.js ShaderMaterial uniforms
 */
export interface VolumeUniforms {
  /** 3D texture containing volume data */
  volumeTexture: { value: THREE.Data3DTexture | null }
  /** Colormap lookup texture */
  cmapTexture: { value: THREE.DataTexture | null }
  /** Number of raymarching samples */
  numSamples: { value: number }
  /** Alpha correction factor */
  alphaCorrection: { value: number }
  /** Intensity window min/max */
  intensityMin: { value: number }
  intensityMax: { value: number }
  /** DICOM scaling parameters */
  scaleSlope: { value: number }
  scaleIntercept: { value: number }
  /** Clipping plane */
  clipPlaneNormal: { value: THREE.Vector3 }
  clipPlaneDistance: { value: number }
  clipPlaneEnabled: { value: number }
  /** Early ray termination threshold */
  earlyTerminationThreshold: { value: number }
  /** Allow additional uniforms */
  [uniform: string]: THREE.IUniform<any>
}
