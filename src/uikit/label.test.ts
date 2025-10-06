import { describe, test, expect } from 'bun:test'
import {
  LabelTextAlignment,
  LabelLineTerminator,
  LabelAnchorFlag,
  LabelAnchorPoint,
  Label3DStyle,
  Label3D
} from './label'

describe('LabelTextAlignment', () => {
  test('has correct values', () => {
    expect(LabelTextAlignment.LEFT).toBe(LabelTextAlignment.LEFT)
    expect(LabelTextAlignment.RIGHT).toBe(LabelTextAlignment.RIGHT)
    expect(LabelTextAlignment.CENTER).toBe(LabelTextAlignment.CENTER)
  })
})

describe('LabelLineTerminator', () => {
  test('has correct values', () => {
    expect(LabelLineTerminator.NONE).toBe(LabelLineTerminator.NONE)
    expect(LabelLineTerminator.CIRCLE).toBe(LabelLineTerminator.CIRCLE)
    expect(LabelLineTerminator.RING).toBe(LabelLineTerminator.RING)
  })
})

describe('LabelAnchorFlag', () => {
  test('has correct bitwise values', () => {
    expect(LabelAnchorFlag.NONE).toBe(0)
    expect(LabelAnchorFlag.LEFT).toBe(1)
    expect(LabelAnchorFlag.CENTER).toBe(2)
    expect(LabelAnchorFlag.RIGHT).toBe(4)
    expect(LabelAnchorFlag.TOP).toBe(8)
    expect(LabelAnchorFlag.MIDDLE).toBe(16)
    expect(LabelAnchorFlag.BOTTOM).toBe(32)
  })
})

describe('LabelAnchorPoint', () => {
  test('NONE has correct value', () => {
    expect(LabelAnchorPoint.NONE).toBe(0)
  })

  test('corner anchors combine flags correctly', () => {
    expect(LabelAnchorPoint.TOPLEFT).toBe(LabelAnchorFlag.TOP | LabelAnchorFlag.LEFT)
    expect(LabelAnchorPoint.TOPLEFT).toBe(9) // 8 | 1

    expect(LabelAnchorPoint.TOPRIGHT).toBe(LabelAnchorFlag.TOP | LabelAnchorFlag.RIGHT)
    expect(LabelAnchorPoint.TOPRIGHT).toBe(12) // 8 | 4

    expect(LabelAnchorPoint.BOTTOMLEFT).toBe(LabelAnchorFlag.BOTTOM | LabelAnchorFlag.LEFT)
    expect(LabelAnchorPoint.BOTTOMLEFT).toBe(33) // 32 | 1

    expect(LabelAnchorPoint.BOTTOMRIGHT).toBe(LabelAnchorFlag.BOTTOM | LabelAnchorFlag.RIGHT)
    expect(LabelAnchorPoint.BOTTOMRIGHT).toBe(36) // 32 | 4
  })

  test('center anchors combine flags correctly', () => {
    expect(LabelAnchorPoint.TOPCENTER).toBe(LabelAnchorFlag.TOP | LabelAnchorFlag.CENTER)
    expect(LabelAnchorPoint.TOPCENTER).toBe(10) // 8 | 2

    expect(LabelAnchorPoint.MIDDLECENTER).toBe(LabelAnchorFlag.MIDDLE | LabelAnchorFlag.CENTER)
    expect(LabelAnchorPoint.MIDDLECENTER).toBe(18) // 16 | 2

    expect(LabelAnchorPoint.BOTTOMCENTER).toBe(LabelAnchorFlag.BOTTOM | LabelAnchorFlag.CENTER)
    expect(LabelAnchorPoint.BOTTOMCENTER).toBe(34) // 32 | 2
  })

  test('middle side anchors combine flags correctly', () => {
    expect(LabelAnchorPoint.MIDDLELEFT).toBe(LabelAnchorFlag.MIDDLE | LabelAnchorFlag.LEFT)
    expect(LabelAnchorPoint.MIDDLELEFT).toBe(17) // 16 | 1

    expect(LabelAnchorPoint.MIDDLERIGHT).toBe(LabelAnchorFlag.MIDDLE | LabelAnchorFlag.RIGHT)
    expect(LabelAnchorPoint.MIDDLERIGHT).toBe(20) // 16 | 4
  })
})

describe('Label3DStyle', () => {
  test('creates with default values', () => {
    const style = new Label3DStyle()

    expect(style.textColor).toEqual([1.0, 1.0, 1.0, 1.0])
    expect(style.textScale).toBe(1.0)
    expect(style.textAlignment).toBe(LabelTextAlignment.LEFT)
    expect(style.lineWidth).toBe(0.0)
    expect(style.lineColor).toEqual([0.0, 0.0, 0.0])
    expect(style.lineTerminator).toBe(LabelLineTerminator.NONE)
    expect(style.bulletScale).toBeUndefined()
    expect(style.bulletColor).toBeUndefined()
    expect(style.backgroundColor).toBeUndefined()
  })

  test('creates with custom values', () => {
    const style = new Label3DStyle(
      [1.0, 0.0, 0.0, 1.0], // red text
      0.5, // half scale
      LabelTextAlignment.CENTER,
      2.0, // line width
      [0.0, 1.0, 0.0], // green line
      LabelLineTerminator.CIRCLE,
      1.5, // bullet scale
      [0.0, 0.0, 1.0, 1.0], // blue bullet
      [0.5, 0.5, 0.5, 0.8] // gray background
    )

    expect(style.textColor).toEqual([1.0, 0.0, 0.0, 1.0])
    expect(style.textScale).toBe(0.5)
    expect(style.textAlignment).toBe(LabelTextAlignment.CENTER)
    expect(style.lineWidth).toBe(2.0)
    expect(style.lineColor).toEqual([0.0, 1.0, 0.0])
    expect(style.lineTerminator).toBe(LabelLineTerminator.CIRCLE)
    expect(style.bulletScale).toBe(1.5)
    expect(style.bulletColor).toEqual([0.0, 0.0, 1.0, 1.0])
    expect(style.backgroundColor).toEqual([0.5, 0.5, 0.5, 0.8])
  })
})

describe('Label3D', () => {
  test('creates with minimal parameters', () => {
    const style = new Label3DStyle()
    const label = new Label3D('Test Label', style)

    expect(label.text).toBe('Test Label')
    expect(label.style).toBe(style)
    expect(label.points).toBeUndefined()
    expect(label.anchor).toBe(LabelAnchorPoint.NONE)
    expect(label.onClick).toBeUndefined()
  })

  test('creates with single point array', () => {
    const style = new Label3DStyle()
    const points = [1.0, 2.0, 3.0]
    const label = new Label3D('Test', style, points)

    expect(label.points).toEqual(points)
  })

  test('creates with multiple points array', () => {
    const style = new Label3DStyle()
    const points = [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
    const label = new Label3D('Test', style, points)

    expect(label.points).toEqual(points)
  })

  test('creates with anchor point', () => {
    const style = new Label3DStyle()
    const label = new Label3D('Test', style, undefined, LabelAnchorPoint.TOPCENTER)

    expect(label.anchor).toBe(LabelAnchorPoint.TOPCENTER)
  })

  test('creates with click handler', () => {
    const style = new Label3DStyle()
    const clickHandler = (label: Label3D, e?: MouseEvent) => {
      console.log('clicked', label.text)
    }
    const label = new Label3D('Test', style, undefined, undefined, clickHandler)

    expect(label.onClick).toBe(clickHandler)
  })

  test('creates with all parameters', () => {
    const style = new Label3DStyle([1.0, 0.0, 0.0, 1.0])
    const points = [[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]]
    const clickHandler = (label: Label3D) => {}

    const label = new Label3D(
      'Full Label',
      style,
      points,
      LabelAnchorPoint.BOTTOMRIGHT,
      clickHandler
    )

    expect(label.text).toBe('Full Label')
    expect(label.style).toBe(style)
    expect(label.points).toEqual(points)
    expect(label.anchor).toBe(LabelAnchorPoint.BOTTOMRIGHT)
    expect(label.onClick).toBe(clickHandler)
  })
})
