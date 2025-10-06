import { logger } from "../logger";
import { PointerEventHandler, type PointerEventCallback } from "./pointer";
import { KeyboardEventHandler, type KeyBinding } from "./key";

export class EventManager {
  private pointerHandler: PointerEventHandler | null = null;
  private keyboardHandler: KeyboardEventHandler | null = null;

  constructor() {
    logger.info({ component: "EventManager" }, "EventManager created");
  }

  initPointerEvents(element: HTMLElement) {
    if (this.pointerHandler) {
      logger.warn({ component: "EventManager" }, "Pointer events already initialized");
      return;
    }

    this.pointerHandler = new PointerEventHandler(element);
    logger.info({ component: "EventManager" }, "Pointer events initialized");
  }

  initKeyboardEvents(element?: HTMLElement | Window) {
    if (this.keyboardHandler) {
      logger.warn({ component: "EventManager" }, "Keyboard events already initialized");
      return;
    }

    this.keyboardHandler = new KeyboardEventHandler(element);
    logger.info({ component: "EventManager" }, "Keyboard events initialized");
  }

  onPointerChange(callback: PointerEventCallback) {
    if (!this.pointerHandler) {
      logger.error({ component: "EventManager" }, "Pointer handler not initialized");
      throw new Error("Pointer handler not initialized. Call initPointerEvents first.");
    }
    this.pointerHandler.onPointerChange(callback);
  }

  bindKey(binding: KeyBinding) {
    if (!this.keyboardHandler) {
      logger.error({ component: "EventManager" }, "Keyboard handler not initialized");
      throw new Error("Keyboard handler not initialized. Call initKeyboardEvents first.");
    }
    this.keyboardHandler.bind(binding);
  }

  unbindKey(key: string, ctrl = false, shift = false, alt = false, meta = false) {
    if (!this.keyboardHandler) {
      logger.error({ component: "EventManager" }, "Keyboard handler not initialized");
      return false;
    }
    return this.keyboardHandler.unbind(key, ctrl, shift, alt, meta);
  }

  clearAllKeyBindings() {
    if (!this.keyboardHandler) {
      logger.error({ component: "EventManager" }, "Keyboard handler not initialized");
      return;
    }
    this.keyboardHandler.clearAll();
  }

  getKeyBindings() {
    if (!this.keyboardHandler) {
      logger.error({ component: "EventManager" }, "Keyboard handler not initialized");
      return [];
    }
    return this.keyboardHandler.getBindings();
  }

  destroy() {
    if (this.pointerHandler) {
      this.pointerHandler.destroy();
      this.pointerHandler = null;
    }

    if (this.keyboardHandler) {
      this.keyboardHandler.destroy();
      this.keyboardHandler = null;
    }

    logger.info({ component: "EventManager" }, "EventManager destroyed");
  }
}
