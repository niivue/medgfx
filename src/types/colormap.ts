/**
 * ColorMap type definition
 * Defines the structure for color lookup tables
 */
export type ColorMap = {
  R: number[]
  G: number[]
  B: number[]
  A: number[]
  I: number[]

  min?: number
  max?: number
  labels?: string[]
}

/**
 * LUT (Lookup Table) type
 * Processed color lookup table ready for WebGL use
 */
export type LUT = {
  lut: Uint8ClampedArray
  min?: number
  max?: number
  labels?: string[]
}
