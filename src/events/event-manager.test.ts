/// <reference lib="dom" />
import { test, expect, describe, beforeEach } from "bun:test";
import { EventManager } from "./event-manager";
import type { PointerState } from "./pointer";

describe("EventManager", () => {
  let manager: EventManager;
  let element: HTMLElement;

  beforeEach(() => {
    manager = new EventManager();
    element = document.createElement("div");
    document.body.appendChild(element);
  });

  test("should create event manager", () => {
    expect(manager).toBeDefined();
  });

  test("should initialize pointer events", () => {
    expect(() => manager.initPointerEvents(element)).not.toThrow();
  });

  test("should initialize keyboard events", () => {
    expect(() => manager.initKeyboardEvents(window)).not.toThrow();
  });

  test("should warn when initializing pointer events twice", () => {
    manager.initPointerEvents(element);
    // Should not throw, just warn
    expect(() => manager.initPointerEvents(element)).not.toThrow();
  });

  test("should warn when initializing keyboard events twice", () => {
    manager.initKeyboardEvents(window);
    // Should not throw, just warn
    expect(() => manager.initKeyboardEvents(window)).not.toThrow();
  });

  test("should throw when setting pointer callback before initialization", () => {
    expect(() => {
      manager.onPointerChange(() => {});
    }).toThrow("Pointer handler not initialized");
  });

  test("should throw when binding key before initialization", () => {
    expect(() => {
      manager.bindKey({
        key: "a",
        action: () => {},
      });
    }).toThrow("Keyboard handler not initialized");
  });

  test("should set pointer change callback after initialization", () => {
    manager.initPointerEvents(element);

    let callbackCalled = false;
    let receivedPointers: Map<number, PointerState> | null = null;

    manager.onPointerChange((pointers) => {
      callbackCalled = true;
      receivedPointers = pointers;
    });

    const event = new PointerEvent("pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(event);

    expect(callbackCalled).toBe(true);
    expect(receivedPointers).not.toBeNull();
    expect(receivedPointers!.size).toBe(1);
  });

  test("should bind keyboard key after initialization", () => {
    manager.initKeyboardEvents(window);

    let actionCalled = false;

    manager.bindKey({
      key: "a",
      action: () => {
        actionCalled = true;
      },
      description: "Test action",
    });

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should unbind keyboard key", () => {
    manager.initKeyboardEvents(window);

    let actionCalled = false;

    manager.bindKey({
      key: "b",
      ctrl: true,
      action: () => {
        actionCalled = true;
      },
    });

    const removed = manager.unbindKey("b", true);
    expect(removed).toBe(true);

    const event = new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(false);
  });

  test("should return false when unbinding non-existent key", () => {
    manager.initKeyboardEvents(window);

    const removed = manager.unbindKey("z");
    expect(removed).toBe(false);
  });

  test("should return false when unbinding without initialization", () => {
    const removed = manager.unbindKey("a");
    expect(removed).toBe(false);
  });

  test("should clear all key bindings", () => {
    manager.initKeyboardEvents(window);

    manager.bindKey({ key: "a", action: () => {} });
    manager.bindKey({ key: "b", action: () => {} });
    manager.bindKey({ key: "c", ctrl: true, action: () => {} });

    const bindings = manager.getKeyBindings();
    expect(bindings.length).toBe(3);

    manager.clearAllKeyBindings();

    const cleared = manager.getKeyBindings();
    expect(cleared.length).toBe(0);
  });

  test("should return empty array when getting bindings without initialization", () => {
    const bindings = manager.getKeyBindings();
    expect(bindings).toEqual([]);
  });

  test("should get key bindings after initialization", () => {
    manager.initKeyboardEvents(window);

    manager.bindKey({
      key: "a",
      action: () => {},
      description: "Action A",
    });

    manager.bindKey({
      key: "b",
      ctrl: true,
      action: () => {},
      description: "Action B",
    });

    const bindings = manager.getKeyBindings();
    expect(bindings.length).toBe(2);
    expect(bindings[0]?.key).toBe("a");
    expect(bindings[1]?.key).toBe("b");
    expect(bindings[1]?.ctrl).toBe(true);
  });

  test("should handle both pointer and keyboard events together", () => {
    manager.initPointerEvents(element);
    manager.initKeyboardEvents(window);

    let pointerCallbackCalled = false;
    let keyActionCalled = false;

    manager.onPointerChange(() => {
      pointerCallbackCalled = true;
    });

    manager.bindKey({
      key: "k",
      action: () => {
        keyActionCalled = true;
      },
    });

    const pointerEvent = new PointerEvent("pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 50,
      clientY: 50,
    });

    element.dispatchEvent(pointerEvent);
    expect(pointerCallbackCalled).toBe(true);

    const keyEvent = new KeyboardEvent("keydown", {
      key: "k",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(keyEvent);
    expect(keyActionCalled).toBe(true);
  });

  test("should clean up on destroy", () => {
    manager.initPointerEvents(element);
    manager.initKeyboardEvents(window);

    let pointerCallbackCalled = false;
    let keyActionCalled = false;

    manager.onPointerChange(() => {
      pointerCallbackCalled = true;
    });

    manager.bindKey({
      key: "d",
      action: () => {
        keyActionCalled = true;
      },
    });

    manager.destroy();

    // Events should not trigger after destroy
    const pointerEvent = new PointerEvent("pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 50,
      clientY: 50,
    });

    element.dispatchEvent(pointerEvent);
    expect(pointerCallbackCalled).toBe(false);

    const keyEvent = new KeyboardEvent("keydown", {
      key: "d",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(keyEvent);
    expect(keyActionCalled).toBe(false);

    // Should return empty bindings after destroy
    const bindings = manager.getKeyBindings();
    expect(bindings).toEqual([]);
  });

  test("should allow re-initialization after destroy", () => {
    manager.initPointerEvents(element);
    manager.destroy();

    // Should be able to initialize again
    expect(() => manager.initPointerEvents(element)).not.toThrow();

    let callbackCalled = false;
    manager.onPointerChange(() => {
      callbackCalled = true;
    });

    const event = new PointerEvent("pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });

    element.dispatchEvent(event);
    expect(callbackCalled).toBe(true);
  });
});
