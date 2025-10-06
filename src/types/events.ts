/**
 * Event system type definitions
 */

/**
 * Pointer state information
 */
export interface PointerState {
  pointerId: number
  pointerType: "mouse" | "pen" | "touch"
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
  isPrimary: boolean
  buttons: number
}

/**
 * Callback function for pointer events
 */
export type PointerEventCallback = (pointers: Map<number, PointerState>) => void

/**
 * Keyboard binding configuration
 */
export interface KeyBinding {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  description?: string
}
