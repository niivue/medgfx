/**
 * Text alignment options for labels
 */
export enum LabelTextAlignment {
  LEFT = 'left',
  RIGHT = 'right',
  CENTER = 'center'
}

/**
 * Line terminator styles for label lines
 */
export enum LabelLineTerminator {
  NONE = 'none',
  CIRCLE = 'circle',
  RING = 'ring'
}

/**
 * Anchor position flags for label positioning
 */
export enum LabelAnchorFlag {
  NONE = 0,
  LEFT = 1 << 0,
  CENTER = 1 << 1,
  RIGHT = 1 << 2,
  TOP = 1 << 3,
  MIDDLE = 1 << 4,
  BOTTOM = 1 << 5
}

/**
 * Predefined anchor points combining flags
 */
export enum LabelAnchorPoint {
  NONE = LabelAnchorFlag.NONE,
  TOPLEFT = LabelAnchorFlag.TOP | LabelAnchorFlag.LEFT,
  TOPCENTER = LabelAnchorFlag.TOP | LabelAnchorFlag.CENTER,
  TOPRIGHT = LabelAnchorFlag.TOP | LabelAnchorFlag.RIGHT,
  MIDDLELEFT = LabelAnchorFlag.MIDDLE | LabelAnchorFlag.LEFT,
  MIDDLECENTER = LabelAnchorFlag.MIDDLE | LabelAnchorFlag.CENTER,
  MIDDLERIGHT = LabelAnchorFlag.MIDDLE | LabelAnchorFlag.RIGHT,
  BOTTOMLEFT = LabelAnchorFlag.BOTTOM | LabelAnchorFlag.LEFT,
  BOTTOMCENTER = LabelAnchorFlag.BOTTOM | LabelAnchorFlag.CENTER,
  BOTTOMRIGHT = LabelAnchorFlag.BOTTOM | LabelAnchorFlag.RIGHT
}

/**
 * Style configuration for 3D labels
 */
export class Label3DStyle {
  textColor: number[]
  textScale: number
  textAlignment?: LabelTextAlignment
  lineWidth: number
  lineColor: number[]
  lineTerminator: LabelLineTerminator
  bulletScale?: number
  bulletColor?: number[]
  backgroundColor?: number[]

  /**
   * @param textColor - Color of text (RGBA array, 0.0-1.0)
   * @param textScale - Text size (0.0-1.0)
   * @param textAlignment - Text alignment
   * @param lineWidth - Line width
   * @param lineColor - Line color (RGB array, 0.0-1.0)
   * @param lineTerminator - Line terminator style
   * @param bulletScale - Bullet size relative to text
   * @param bulletColor - Bullet color (RGBA array, 0.0-1.0)
   * @param backgroundColor - Background color (RGBA array, 0.0-1.0)
   */
  constructor(
    textColor = [1.0, 1.0, 1.0, 1.0],
    textScale = 1.0,
    textAlignment = LabelTextAlignment.LEFT,
    lineWidth = 0.0,
    lineColor = [0.0, 0.0, 0.0],
    lineTerminator = LabelLineTerminator.NONE,
    bulletScale?: number,
    bulletColor?: number[],
    backgroundColor?: number[]
  ) {
    this.textColor = textColor
    this.textScale = textScale
    this.textAlignment = textAlignment
    this.lineWidth = lineWidth
    this.lineColor = lineColor
    this.lineTerminator = lineTerminator
    this.bulletScale = bulletScale
    this.bulletColor = bulletColor
    this.backgroundColor = backgroundColor
  }
}

/**
 * 3D label with text, styling, and optional connector lines
 */
export class Label3D {
  text: string
  style: Label3DStyle
  points?: number[] | number[][]
  anchor: LabelAnchorPoint
  onClick?: (label: Label3D, e?: MouseEvent) => void

  /**
   * @param text - The text of the label
   * @param style - The style of the label
   * @param points - Array of points for label connector lines
   * @param anchor - Anchor point for label positioning
   * @param onClick - Optional click handler
   */
  constructor(
    text: string,
    style: Label3DStyle,
    points?: number[] | number[][],
    anchor?: LabelAnchorPoint,
    onClick?: (label: Label3D, e?: MouseEvent) => void
  ) {
    this.text = text
    this.style = style
    this.points = points
    this.anchor = anchor || LabelAnchorPoint.NONE
    this.onClick = onClick
  }
}
