/// <reference lib="dom" />
import { test, expect, describe, beforeEach } from "bun:test";
import { PointerEventHandler, type PointerState } from "./pointer";

describe("PointerEventHandler", () => {
  let element: HTMLElement;
  let handler: PointerEventHandler;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    handler = new PointerEventHandler(element);
  });

  test("should initialize with no active pointers", () => {
    expect(handler.getActivePointers().size).toBe(0);
  });

  test("should track pointer down event", () => {
    const event = new PointerEvent("pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 200,
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
      isPrimary: true,
      buttons: 1,
    });

    element.dispatchEvent(event);

    const pointers = handler.getActivePointers();
    expect(pointers.size).toBe(1);
    expect(pointers.has(1)).toBe(true);

    const pointer = pointers.get(1)!;
    expect(pointer.pointerId).toBe(1);
    expect(pointer.pointerType).toBe("mouse");
    expect(pointer.pressure).toBe(0.5);
  });

  test("should track pointer move event", () => {
    let capturedPointers: Map<number, PointerState> | null = null;

    handler.onPointerChange((pointers) => {
      capturedPointers = pointers;
    });

    const moveEvent = new PointerEvent("pointermove", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 150,
      clientY: 250,
      pressure: 0.8,
      tiltX: 5,
      tiltY: 10,
      isPrimary: true,
      buttons: 0,
    });

    element.dispatchEvent(moveEvent);

    expect(capturedPointers).not.toBeNull();
    expect(capturedPointers!.size).toBe(1);
    expect(capturedPointers!.has(2)).toBe(true);

    const pointer = capturedPointers!.get(2)!;
    expect(pointer.pointerType).toBe("touch");
    expect(pointer.pressure).toBe(0.8);
  });

  test("should remove pointer on pointer up", () => {
    const downEvent = new PointerEvent("pointerdown", {
      pointerId: 3,
      pointerType: "pen",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(downEvent);
    expect(handler.getActivePointers().size).toBe(1);

    const upEvent = new PointerEvent("pointerup", {
      pointerId: 3,
      pointerType: "pen",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(upEvent);
    expect(handler.getActivePointers().size).toBe(0);
  });

  test("should handle multi-touch", () => {
    const touch1 = new PointerEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
      isPrimary: true,
    });

    const touch2 = new PointerEvent("pointerdown", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 200,
      isPrimary: false,
    });

    element.dispatchEvent(touch1);
    element.dispatchEvent(touch2);

    const pointers = handler.getActivePointers();
    expect(pointers.size).toBe(2);
    expect(pointers.has(1)).toBe(true);
    expect(pointers.has(2)).toBe(true);
  });

  test("should call onPointerChange callback", () => {
    let callbackCalled = false;
    let receivedPointers: Map<number, PointerState> | null = null;

    handler.onPointerChange((pointers) => {
      callbackCalled = true;
      receivedPointers = pointers;
    });

    const event = new PointerEvent("pointerdown", {
      pointerId: 5,
      pointerType: "mouse",
      clientX: 50,
      clientY: 50,
    });

    element.dispatchEvent(event);

    expect(callbackCalled).toBe(true);
    expect(receivedPointers).not.toBeNull();
    expect(receivedPointers!.size).toBe(1);
  });

  test("should remove pointer on pointer cancel", () => {
    const downEvent = new PointerEvent("pointerdown", {
      pointerId: 6,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(downEvent);
    expect(handler.getActivePointers().size).toBe(1);

    const cancelEvent = new PointerEvent("pointercancel", {
      pointerId: 6,
      pointerType: "touch",
    });

    element.dispatchEvent(cancelEvent);
    expect(handler.getActivePointers().size).toBe(0);
  });

  test("should remove pointer on pointer leave", () => {
    const downEvent = new PointerEvent("pointerdown", {
      pointerId: 7,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(downEvent);
    expect(handler.getActivePointers().size).toBe(1);

    const leaveEvent = new PointerEvent("pointerleave", {
      pointerId: 7,
      pointerType: "mouse",
    });

    element.dispatchEvent(leaveEvent);
    expect(handler.getActivePointers().size).toBe(0);
  });

  test("should prevent context menu", () => {
    let defaultPrevented = false;

    element.addEventListener("contextmenu", (e) => {
      defaultPrevented = e.defaultPrevented;
    });

    const contextMenuEvent = new Event("contextmenu", {
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(contextMenuEvent);
    expect(defaultPrevented).toBe(true);
  });

  test("should clean up on destroy", () => {
    const downEvent = new PointerEvent("pointerdown", {
      pointerId: 8,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(downEvent);
    expect(handler.getActivePointers().size).toBe(1);

    handler.destroy();

    expect(handler.getActivePointers().size).toBe(0);

    // Should not track new events after destroy
    const newEvent = new PointerEvent("pointerdown", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(newEvent);
    expect(handler.getActivePointers().size).toBe(0);
  });

  describe("pointer drag vs hover", () => {
    test("should treat move as hover when pointer was not down", () => {
      const moveEvent = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 100,
        clientY: 200,
      });

      element.dispatchEvent(moveEvent);

      const pointers = handler.getActivePointers();
      expect(pointers.size).toBe(1);
      expect(pointers.get(1)?.x).toBeDefined();
      expect(pointers.get(1)?.y).toBeDefined();
    });

    test("should treat move as drag when pointer was down", () => {
      const downEvent = new PointerEvent("pointerdown", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 100,
        clientY: 200,
      });

      const moveEvent = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 150,
        clientY: 250,
      });

      element.dispatchEvent(downEvent);
      const pointersAfterDown = handler.getActivePointers();
      expect(pointersAfterDown.size).toBe(1);

      element.dispatchEvent(moveEvent);
      const pointersAfterMove = handler.getActivePointers();
      expect(pointersAfterMove.size).toBe(1);
      expect(pointersAfterMove.get(1)?.x).toBeDefined();
      expect(pointersAfterMove.get(1)?.y).toBeDefined();
    });

    test("should transition from hover to drag to hover", () => {
      // Hover (move without down)
      const hoverEvent1 = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 50,
        clientY: 50,
      });
      element.dispatchEvent(hoverEvent1);
      expect(handler.getActivePointers().size).toBe(1);

      // Pointer down - starts drag capability
      const downEvent = new PointerEvent("pointerdown", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 100,
        clientY: 200,
      });
      element.dispatchEvent(downEvent);

      // Drag (move while down)
      const dragEvent = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 150,
        clientY: 250,
      });
      element.dispatchEvent(dragEvent);
      expect(handler.getActivePointers().get(1)?.x).toBeDefined();

      // Pointer up - ends drag
      const upEvent = new PointerEvent("pointerup", {
        pointerId: 1,
        pointerType: "mouse",
      });
      element.dispatchEvent(upEvent);
      expect(handler.getActivePointers().size).toBe(0);

      // Hover again (move without down)
      const hoverEvent2 = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 200,
        clientY: 300,
      });
      element.dispatchEvent(hoverEvent2);
      expect(handler.getActivePointers().size).toBe(1);
    });

    test("should handle multi-touch drag", () => {
      // First touch down
      const down1 = new PointerEvent("pointerdown", {
        pointerId: 1,
        pointerType: "touch",
        clientX: 100,
        clientY: 200,
        isPrimary: true,
      });
      element.dispatchEvent(down1);

      // Second touch down
      const down2 = new PointerEvent("pointerdown", {
        pointerId: 2,
        pointerType: "touch",
        clientX: 300,
        clientY: 400,
        isPrimary: false,
      });
      element.dispatchEvent(down2);

      expect(handler.getActivePointers().size).toBe(2);

      // Drag first touch
      const move1 = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "touch",
        clientX: 120,
        clientY: 220,
        isPrimary: true,
      });
      element.dispatchEvent(move1);

      // Drag second touch
      const move2 = new PointerEvent("pointermove", {
        pointerId: 2,
        pointerType: "touch",
        clientX: 320,
        clientY: 420,
        isPrimary: false,
      });
      element.dispatchEvent(move2);

      const pointers = handler.getActivePointers();
      expect(pointers.size).toBe(2);
      expect(pointers.get(1)?.x).toBeDefined();
      expect(pointers.get(2)?.x).toBeDefined();
    });

    test("should distinguish drag from hover for different pointers", () => {
      // First pointer hovers
      const hover1 = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 50,
        clientY: 50,
      });
      element.dispatchEvent(hover1);

      // Second pointer goes down
      const down2 = new PointerEvent("pointerdown", {
        pointerId: 2,
        pointerType: "touch",
        clientX: 100,
        clientY: 100,
      });
      element.dispatchEvent(down2);

      // Second pointer drags
      const drag2 = new PointerEvent("pointermove", {
        pointerId: 2,
        pointerType: "touch",
        clientX: 150,
        clientY: 150,
      });
      element.dispatchEvent(drag2);

      const pointers = handler.getActivePointers();
      expect(pointers.size).toBe(2);
      expect(pointers.has(1)).toBe(true);
      expect(pointers.has(2)).toBe(true);
    });
  });
});
