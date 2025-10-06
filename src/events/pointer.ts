import { logger } from "../logger";
import type { PointerState, PointerEventCallback } from "../types/events";

export type { PointerState, PointerEventCallback };

export class PointerEventHandler {
  private activePointers = new Map<number, PointerState>();
  private element: HTMLElement;
  private onPointerChangeCallback?: PointerEventCallback;
  private abortController: AbortController;

  constructor(element: HTMLElement) {
    this.element = element;
    this.abortController = new AbortController();
    this.attachListeners();
    logger.info({ component: "PointerEventHandler" }, "PointerEventHandler initialized");
  }

  private attachListeners() {
    const options = { signal: this.abortController.signal };

    this.element.addEventListener("pointerdown", this.handlePointerDown, options);
    this.element.addEventListener("pointermove", this.handlePointerMove, options);
    this.element.addEventListener("pointerup", this.handlePointerUp, options);
    this.element.addEventListener("pointercancel", this.handlePointerCancel, options);
    this.element.addEventListener("pointerleave", this.handlePointerLeave, options);
    this.element.addEventListener("contextmenu", this.handleContextMenu, options);
  }

  private handleContextMenu = (event: Event) => {
    event.preventDefault();
  };

  private handlePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    this.updatePointerState(event);
    logger.debug(
      {
        component: "PointerEventHandler",
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        x: event.clientX,
        y: event.clientY,
      },
      "Pointer down"
    );
    this.notifyChange();
  };

  private handlePointerMove = (event: PointerEvent) => {
    event.preventDefault();
    const wasDown = this.activePointers.has(event.pointerId) && event.buttons > 0;
    this.updatePointerState(event);

    if (wasDown) {
      this.handlePointerDrag(event);
    } else {
      logger.debug(
        {
          component: "PointerEventHandler",
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          x: event.clientX,
          y: event.clientY,
        },
        "Pointer move"
      );
    }
    this.notifyChange();
  };

  private handlePointerDrag = (event: PointerEvent) => {
    logger.debug(
      {
        component: "PointerEventHandler",
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        x: event.clientX,
        y: event.clientY,
      },
      "Pointer drag"
    );
  };

  private handlePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    this.activePointers.delete(event.pointerId);
    logger.debug(
      {
        component: "PointerEventHandler",
        pointerId: event.pointerId,
        pointerType: event.pointerType,
      },
      "Pointer up"
    );
    this.notifyChange();
  };

  private handlePointerCancel = (event: PointerEvent) => {
    event.preventDefault();
    this.activePointers.delete(event.pointerId);
    logger.debug({ component: "PointerEventHandler", pointerId: event.pointerId }, "Pointer cancelled");
    this.notifyChange();
  };

  private handlePointerLeave = (event: PointerEvent) => {
    event.preventDefault();
    this.activePointers.delete(event.pointerId);
    logger.debug({ component: "PointerEventHandler", pointerId: event.pointerId }, "Pointer left");
    this.notifyChange();
  };

  private updatePointerState(event: PointerEvent) {
    const rect = this.element.getBoundingClientRect();
    const state: PointerState = {
      pointerId: event.pointerId,
      pointerType: event.pointerType as "mouse" | "pen" | "touch",
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      isPrimary: event.isPrimary,
      buttons: event.buttons,
    };
    this.activePointers.set(event.pointerId, state);
  }

  private notifyChange() {
    if (this.onPointerChangeCallback) {
      this.onPointerChangeCallback(new Map(this.activePointers));
    }
  }

  onPointerChange(callback: PointerEventCallback) {
    this.onPointerChangeCallback = callback;
  }

  getActivePointers(): Map<number, PointerState> {
    return new Map(this.activePointers);
  }

  destroy() {
    this.abortController.abort();
    this.activePointers.clear();
    logger.info({ component: "PointerEventHandler" }, "PointerEventHandler destroyed");
  }
}
