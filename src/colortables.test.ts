import { describe, test, expect } from 'bun:test'
import { ColorTables } from './colortables'
import type { ColorMap } from './types/colormap'

describe('ColorTables', () => {
  describe('constructor', () => {
    test('initializes with alphabetically sorted colormaps', () => {
      const ct = new ColorTables()
      const maps = ct.colormaps()

      expect(maps.length).toBeGreaterThan(0)
      expect(maps).toContain('gray')
      expect(maps).toContain('viridis')

      // Should not include drawing maps (starting with $)
      expect(maps.every((m) => !m.startsWith('$'))).toBe(true)

      // Should be sorted
      const sorted = [...maps].sort(new Intl.Collator('en').compare)
      expect(maps).toEqual(sorted)
    })
  })

  describe('addColormap', () => {
    test('adds custom colormap', () => {
      const ct = new ColorTables()
      const custom: ColorMap = {
        R: [0, 255],
        G: [0, 128],
        B: [0, 64],
        A: [0, 255],
        I: [0, 255]
      }

      ct.addColormap('custom', custom)
      expect(ct.colormapFromKey('custom')).toEqual(custom)
    })
  })

  describe('colormaps / colorMaps', () => {
    test('returns array of colormap keys', () => {
      const ct = new ColorTables()
      const maps1 = ct.colormaps()
      const maps2 = ct.colorMaps()

      expect(maps1).toEqual(maps2)
      expect(Array.isArray(maps1)).toBe(true)
    })
  })

  describe('colormapFromKey', () => {
    test('returns colormap by exact key', () => {
      const ct = new ColorTables()
      const gray = ct.colormapFromKey('gray')

      expect(gray).toBeDefined()
      expect(gray.R).toBeDefined()
      expect(gray.G).toBeDefined()
      expect(gray.B).toBeDefined()
    })

    test('returns colormap case-insensitively', () => {
      const ct = new ColorTables()
      const gray1 = ct.colormapFromKey('gray')
      const gray2 = ct.colormapFromKey('GRAY')
      const gray3 = ct.colormapFromKey('Gray')

      expect(gray1).toEqual(gray2)
      expect(gray1).toEqual(gray3)
    })

    test('returns default gray colormap for unknown key', () => {
      const ct = new ColorTables()
      const unknown = ct.colormapFromKey('nonexistent')

      expect(unknown).toBeDefined()
      expect(unknown.R).toEqual([0, 255])
      expect(unknown.G).toEqual([0, 255])
      expect(unknown.B).toEqual([0, 255])
    })

    test('returns default for empty string without warning', () => {
      const ct = new ColorTables()
      const empty = ct.colormapFromKey('')

      expect(empty).toBeDefined()
      expect(empty.R).toEqual([0, 255])
    })
  })

  describe('colormap', () => {
    test('creates LUT from colormap key', () => {
      const ct = new ColorTables()
      const lut = ct.colormap('gray')

      expect(lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.length).toBe(256 * 4) // RGBA for 256 values
    })

    test('creates inverted LUT when isInvert is true', () => {
      const ct = new ColorTables()
      const normal = ct.colormap('gray', false)
      const inverted = ct.colormap('gray', true)

      expect(normal).toBeInstanceOf(Uint8ClampedArray)
      expect(inverted).toBeInstanceOf(Uint8ClampedArray)
      expect(normal).not.toEqual(inverted)
    })

    test('handles default colormap', () => {
      const ct = new ColorTables()
      const lut = ct.colormap()

      expect(lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.length).toBe(256 * 4)
    })
  })

  describe('makeLabelLut', () => {
    test('creates label LUT from colormap', () => {
      const cm: ColorMap = {
        R: [255, 0, 0],
        G: [0, 255, 0],
        B: [0, 0, 255],
        A: [255, 255, 255],
        I: [0, 1, 2]
      }

      const ct = new ColorTables()
      const lut = ct.makeLabelLut(cm)

      expect(lut.lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.min).toBe(0)
      expect(lut.max).toBe(2)
      expect(lut.lut.length).toBe(3 * 4) // 3 labels * RGBA
    })

    test('handles sparse indices', () => {
      const cm: ColorMap = {
        R: [255, 0, 0],
        G: [0, 255, 0],
        B: [0, 0, 255],
        A: [255, 255, 255],
        I: [0, 3, 4] // sparse indices
      }

      const ct = new ColorTables()
      const lut = ct.makeLabelLut(cm)

      expect(lut.min).toBe(0)
      expect(lut.max).toBe(4)
      expect(lut.lut.length).toBe(5 * 4) // dense [0,1,2,3,4]
    })

    test('fills default alpha values', () => {
      const cm: ColorMap = {
        R: [255, 0],
        G: [0, 255],
        B: [0, 0],
        A: [0, 255], // explicit alpha values
        I: [0, 1]
      }

      const ct = new ColorTables()
      const lut = ct.makeLabelLut(cm, 128)

      // First alpha should be 0 (transparent background)
      expect(lut.lut[3]).toBe(0)
    })

    test('handles missing indices (defaults to sequential)', () => {
      const cm: ColorMap = {
        R: [255, 0, 0],
        G: [0, 255, 0],
        B: [0, 0, 255],
        A: [255, 255, 255],
        I: [0, 1, 2]
      }

      const ct = new ColorTables()
      const lut = ct.makeLabelLut(cm)

      expect(lut.lut.length).toBe(3 * 4)
    })

    test('handles labels', () => {
      const cm: ColorMap = {
        R: [255, 0],
        G: [0, 255],
        B: [0, 0],
        A: [255, 255],
        I: [0, 1],
        labels: ['Background', 'Foreground']
      }

      const ct = new ColorTables()
      const lut = ct.makeLabelLut(cm)

      expect(lut.labels).toEqual(['Background', 'Foreground'])
    })

    test('throws error for invalid colormap (missing R)', () => {
      const cm: Partial<ColorMap> = {
        G: [0, 255],
        B: [0, 0]
      }

      const ct = new ColorTables()
      expect(() => ct.makeLabelLut(cm as ColorMap)).toThrow('Invalid colormap table')
    })

    test('throws error for mismatched array lengths', () => {
      const cm: ColorMap = {
        R: [255, 0],
        G: [0, 255, 128], // wrong length
        B: [0, 0],
        A: [255, 255],
        I: [0, 1]
      }

      const ct = new ColorTables()
      expect(() => ct.makeLabelLut(cm)).toThrow('colormap does not make sense')
    })
  })

  describe('makeDrawLut', () => {
    test('creates 256-color drawing LUT', () => {
      const ct = new ColorTables()
      const lut = ct.makeDrawLut('gray')

      expect(lut.lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.lut.length).toBe(256 * 4)
      expect(lut.labels?.length).toBe(256)
    })

    test('first alpha is transparent', () => {
      const ct = new ColorTables()
      const lut = ct.makeDrawLut('gray')

      expect(lut.lut[3]).toBe(0) // first alpha channel
    })

    test('accepts ColorMap object', () => {
      const cm: ColorMap = {
        R: [255, 0],
        G: [0, 255],
        B: [0, 0],
        A: [255, 255],
        I: [0, 1]
      }

      const ct = new ColorTables()
      const lut = ct.makeDrawLut(cm)

      expect(lut.lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.lut.length).toBe(256 * 4)
    })

    test('fills remaining slots with numeric labels', () => {
      const cm: ColorMap = {
        R: [255, 0],
        G: [0, 255],
        B: [0, 0],
        A: [255, 255],
        I: [0, 1],
        labels: ['Label0', 'Label1']
      }

      const ct = new ColorTables()
      const lut = ct.makeDrawLut(cm)

      expect(lut.labels?.[0]).toBe('Label0')
      expect(lut.labels?.[1]).toBe('Label1')
      expect(lut.labels?.[2]).toBe('2')
      expect(lut.labels?.[255]).toBe('255')
    })
  })

  describe('makeLut', () => {
    test('creates gradient LUT', () => {
      const ct = new ColorTables()
      const lut = ct.makeLut([0, 255], [0, 0], [0, 0], [0, 128], [0, 255], false)

      expect(lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.length).toBe(256 * 4)

      // Check first pixel (should be black, transparent)
      expect(lut[0]).toBe(0) // R
      expect(lut[1]).toBe(0) // G
      expect(lut[2]).toBe(0) // B
      expect(lut[3]).toBe(0) // A

      // Check last pixel (should be red, semi-transparent)
      expect(lut[255 * 4]).toBe(255) // R
      expect(lut[255 * 4 + 1]).toBe(0) // G
      expect(lut[255 * 4 + 2]).toBe(0) // B
      expect(lut[255 * 4 + 3]).toBe(128) // A
    })

    test('inverts LUT when isInvert is true', () => {
      const ct = new ColorTables()
      const normal = ct.makeLut([0, 255], [0, 128], [0, 64], [0, 255], [0, 255], false)
      const inverted = ct.makeLut([0, 255], [0, 128], [0, 64], [0, 255], [0, 255], true)

      // First pixel of normal should be different from first pixel of inverted
      expect(normal.slice(0, 4)).not.toEqual(inverted.slice(0, 4))

      // Last pixel of normal should match first pixel of inverted (approximately)
      expect(inverted[0]).toBe(255) // inverted R
      expect(inverted[1]).toBe(128) // inverted G
    })

    test('applies gamma correction when gamma != 1.0', () => {
      const ct = new ColorTables()
      ct.gamma = 2.0

      const lut = ct.makeLut([0, 255], [0, 255], [0, 255], [0, 255], [0, 255], false)

      // With gamma > 1, values are raised to 1/gamma power, making mid-values brighter
      const midR = lut[128 * 4]
      expect(midR).toBeGreaterThan(128)

      // Reset gamma
      ct.gamma = 1.0
    })

    test('handles missing intensity indices', () => {
      const ct = new ColorTables()
      const lut = ct.makeLut([0, 255], [0, 128], [0, 64], [0, 255], [], false)

      expect(lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.length).toBe(256 * 4)
    })

    test('handles missing alpha values', () => {
      const ct = new ColorTables()
      const lut = ct.makeLut([0, 255], [0, 128], [0, 64], [], [0, 255], false)

      expect(lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut.length).toBe(256 * 4)
      expect(lut[3]).toBe(0) // first alpha should be 0
    })

    test('creates multi-stop gradients', () => {
      const ct = new ColorTables()
      const lut = ct.makeLut(
        [0, 255, 0], // R: black -> red -> black
        [0, 0, 0], // G: stay black
        [0, 0, 0], // B: stay black
        [0, 128, 255], // A: transparent -> semi -> opaque
        [0, 128, 255], // I: three stops
        false
      )

      expect(lut).toBeInstanceOf(Uint8ClampedArray)
      expect(lut[0]).toBe(0) // first R
      expect(lut[128 * 4]).toBe(255) // middle R (peak)
      expect(lut[255 * 4]).toBe(0) // last R (back to black)
    })
  })
})
