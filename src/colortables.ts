import * as cmaps from './cmaps'
import { logger } from './logger'
import type { ColorMap, LUT } from './types/colormap'

/**
 * ColorTables class for managing color lookup tables (LUTs)
 * Handles colormap conversion, label LUTs, and drawing LUTs for medical imaging
 */
export class ColorTables {
  gamma = 1.0
  version = 0.1
  cluts: Record<string, ColorMap> = {}

  /**
   * Sets cluts to alphabetically sorted cmaps
   */
  constructor() {
    const cmapKeys = Object.keys(cmaps) as Array<keyof typeof cmaps>

    const cmapsSorted = cmapKeys
      .filter((k) => !k.startsWith('$')) // ignore drawing maps
      .sort(new Intl.Collator('en').compare) // case insensitive, e.g. "roi_i256" > "actc"

    for (const key of cmapsSorted) {
      this.cluts[key] = cmaps[key]
    }
  }

  addColormap(key: string, cmap: ColorMap): void {
    this.cluts[key] = cmap
  }

  colormaps(): Array<keyof typeof this.cluts> {
    return Object.keys(this.cluts) as Array<keyof typeof this.cluts>
  }

  // for backward compatibility: prior to v0.34 "colormaps" used to be "colorMaps"
  colorMaps(): Array<keyof typeof this.cluts> {
    return this.colormaps()
  }

  // returns key name if it exists, otherwise returns default "gray"
  colormapFromKey(name: string): ColorMap {
    let cmap = this.cluts[name]
    if (cmap !== undefined) {
      return cmap
    }

    cmap = this.cluts[name.toLowerCase()]
    if (cmap !== undefined) {
      return cmap
    }

    if (name.length > 0) {
      logger.warn(`No color map named ${name}`)
    }
    return {
      min: 0,
      max: 0,
      R: [0, 255],
      G: [0, 255],
      B: [0, 255],
      A: [0, 255],
      I: [0, 255]
    }
  }

  // not included in public docs
  colormap(key = '', isInvert = false): Uint8ClampedArray {
    const cmap = this.colormapFromKey(key)
    return this.makeLut(cmap.R, cmap.G, cmap.B, cmap.A, cmap.I, isInvert)
  }

  makeLabelLut(cm: ColorMap, alphaFill = 255): LUT {
    if (cm.R === undefined || cm.G === undefined || cm.B === undefined) {
      throw new Error(`Invalid colormap table: ${cm}`)
    }
    const nLabels = cm.R.length

    // if indices are not provided, indices default to 0..(nLabels-1)
    const idxs = cm.I ?? [...Array(nLabels).keys()]

    if (nLabels !== cm.G.length || nLabels !== cm.B.length || nLabels !== idxs.length) {
      throw new Error(
        `colormap does not make sense: ${cm} Rs ${cm.R.length} Gs ${cm.G.length} Bs ${cm.B.length} Is ${idxs.length}`
      )
    }

    let As = new Uint8ClampedArray(nLabels).fill(alphaFill)
    As[0] = 0
    if (cm.A !== undefined) {
      As = Uint8ClampedArray.from(cm.A)
    }

    const mnIdx = Math.min(...idxs)
    const mxIdx = Math.max(...idxs)

    // n.b. number of input labels can be sparse: I:[0,3,4] output is dense [0,1,2,3,4]
    const nLabelsDense = mxIdx - mnIdx + 1
    const lut = new Uint8ClampedArray(nLabelsDense * 4).fill(0)
    for (let i = 0; i < nLabels; i++) {
      const idx = idxs[i]
      if (idx === undefined) continue
      let k = (idx - mnIdx) * 4
      lut[k++] = cm.R[i] ?? 0 // Red
      lut[k++] = cm.G[i] ?? 0 // Green
      lut[k++] = cm.B[i] ?? 0 // Blue
      lut[k++] = As[i] ?? 0 // Alpha
    }

    const cmap: LUT = {
      lut,
      min: mnIdx,
      max: mxIdx
    }
    // labels are optional
    if (cm.labels) {
      const nL = cm.labels.length
      if (nL === nLabelsDense) {
        cmap.labels = cm.labels
      } else if (nL === nLabels) {
        cmap.labels = Array(nLabelsDense).fill('?')
        for (let i = 0; i < nLabels; i++) {
          const idx = idxs[i]
          const label = cm.labels[i]
          if (idx !== undefined && label !== undefined) {
            cmap.labels[idx] = label
          }
        }
      }
    }
    return cmap
  }

  async makeLabelLutFromUrl(name: string): Promise<LUT> {
    const response = await fetch(name)
    const cm = await response.json()
    return this.makeLabelLut(cm)
  }

  // not included in public docs
  // The drawing colormap is a variant of the label colormap with precisely 256 colors
  makeDrawLut(name: string | ColorMap): LUT {
    let cmap: ColorMap = typeof name === 'object' ? name : cmaps[name as keyof typeof cmaps]

    if (cmap === undefined) {
      logger.warn(`colormap undefined ${name}`)
      cmap = this.colormapFromKey('')
    }

    const cm = this.makeLabelLut(cmap, 255)

    if (cm.labels === undefined) {
      cm.labels = []
    }
    if (cm.labels.length < 256) {
      const j = cm.labels.length
      for (let i = j; i < 256; i++) {
        // make all unused slots opaque red
        cm.labels.push(i.toString())
      }
    }

    const lut = new Uint8ClampedArray(256 * 4)
    let k = 0
    for (let i = 0; i < 256; i++) {
      lut[k++] = 255 // Red
      lut[k++] = 0 // Green
      lut[k++] = 0 // Blue
      lut[k++] = 255 // Alpha
    }
    lut[3] = 0 // make first alpha transparent: not part of drawing

    // drawings can have no more than 256 colors
    const explicitLUTbytes = Math.min(cm.lut.length, 256 * 4)
    if (explicitLUTbytes > 0) {
      for (let i = 0; i < explicitLUTbytes; i++) {
        const val = cm.lut[i]
        if (val !== undefined) {
          lut[i] = val
        }
      }
    }

    return {
      lut,
      labels: cm.labels
    }
  }

  // not included in public docs
  makeLut(
    Rsi: number[],
    Gsi: number[],
    Bsi: number[],
    Asi: number[],
    Isi: number[],
    isInvert: boolean
  ): Uint8ClampedArray {
    // create color lookup table provided arrays of reds, greens, blues, alphas and intensity indices
    // intensity indices should be in increasing order with the first value 0 and the last 255.
    // this.makeLut([0, 255], [0, 0], [0,0], [0,128],[0,255]); //red gradient
    const nIdx = Rsi.length
    const Rs = [...Rsi]
    const Gs = [...Gsi]
    const Bs = [...Bsi]
    if (!Isi) {
      Isi = new Array(nIdx)
      for (let i = 0; i < nIdx; i++) {
        Isi[i] = (i / (nIdx - 1)) * 255
      }
    }
    if (!Asi) {
      Asi = new Array(nIdx).fill(64)
      Asi[0] = 0
    }
    let As = Uint8ClampedArray.from(Asi)
    let Is = Uint8ClampedArray.from(Isi)
    if (isInvert) {
      for (let i = 0; i < nIdx; i++) {
        Rs[i] = Rsi[nIdx - 1 - i] ?? 0
        Gs[i] = Gsi[nIdx - 1 - i] ?? 0
        Bs[i] = Bsi[nIdx - 1 - i] ?? 0
        const asiVal = Asi[nIdx - 1 - i]
        const isiVal = Isi[nIdx - 1 - i]
        As[i] = asiVal !== undefined ? 255 - asiVal : 0
        Is[i] = isiVal !== undefined ? 255 - isiVal : 0
      }
    }
    const lut = new Uint8ClampedArray(256 * 4)
    if (typeof Is === 'undefined') {
      Is = new Uint8ClampedArray(nIdx).fill(0)
      for (let i = 0; i < nIdx; i++) {
        Is[i] = Math.round((i * 255.0) / (nIdx - 1))
      }
    }
    if (typeof As === 'undefined') {
      As = new Uint8ClampedArray(nIdx).fill(64)
      As[0] = 0
    }
    for (let i = 0; i < nIdx - 1; i++) {
      const idxLo = Is[i]
      let idxHi = Is[i + 1]
      if (idxLo === undefined || idxHi === undefined) continue

      if (i === 0 && idxLo !== 0) {
        logger.warn(`colormap issue: indices expected to start with 0 not ${idxLo}`)
      }
      if (i === Is.length - 2 && idxHi !== 255) {
        logger.warn(`padding colormap: indices expected end with 255 not ${idxHi}`)
        idxHi = 255
      }
      const idxRng = idxHi - idxLo
      let k = idxLo * 4
      for (let j = idxLo; j <= idxHi; j++) {
        const f = (j - idxLo) / idxRng
        const r0 = Rs[i] ?? 0
        const r1 = Rs[i + 1] ?? 0
        const g0 = Gs[i] ?? 0
        const g1 = Gs[i + 1] ?? 0
        const b0 = Bs[i] ?? 0
        const b1 = Bs[i + 1] ?? 0
        const a0 = As[i] ?? 0
        const a1 = As[i + 1] ?? 0
        lut[k++] = r0 + f * (r1 - r0) // Red
        lut[k++] = g0 + f * (g1 - g0) // Green
        lut[k++] = b0 + f * (b1 - b0) // Blue
        lut[k++] = a0 + f * (a1 - a0) // Alpha
      }
    }
    if (this.gamma === 1.0) {
      return lut
    }
    for (let i = 0; i < 255 * 4; i++) {
      if (i % 4 === 3) {
        continue
      } // gamma changes RGB, not Alpha
      const val = lut[i]
      if (val !== undefined) {
        lut[i] = Math.pow(val / 255, 1 / this.gamma) * 255
      }
    }
    return lut
  }
}

export const colortables = new ColorTables()
