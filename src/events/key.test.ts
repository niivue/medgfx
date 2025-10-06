/// <reference lib="dom" />
import { test, expect, describe, beforeEach } from "bun:test";
import { KeyboardEventHandler, type KeyBinding } from "./key";

describe("KeyboardEventHandler", () => {
  let handler: KeyboardEventHandler;

  beforeEach(() => {
    handler = new KeyboardEventHandler(window);
  });

  test("should initialize with no bindings", () => {
    expect(handler.getBindings().length).toBe(0);
  });

  test("should bind a simple key", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "a",
      action: () => {
        actionCalled = true;
      },
      description: "Test action",
    };

    handler.bind(binding);

    expect(handler.getBindings().length).toBe(1);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should bind key with ctrl modifier", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "s",
      ctrl: true,
      action: () => {
        actionCalled = true;
      },
      description: "Save",
    };

    handler.bind(binding);

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should bind key with multiple modifiers", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "z",
      ctrl: true,
      shift: true,
      action: () => {
        actionCalled = true;
      },
      description: "Redo",
    };

    handler.bind(binding);

    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should not trigger action without correct modifiers", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "s",
      ctrl: true,
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);

    // Press 's' without ctrl
    const event = new KeyboardEvent("keydown", {
      key: "s",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(false);
  });

  test("should unbind a key binding", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "a",
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);
    expect(handler.getBindings().length).toBe(1);

    const removed = handler.unbind("a");
    expect(removed).toBe(true);
    expect(handler.getBindings().length).toBe(0);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(false);
  });

  test("should unbind key with modifiers", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "s",
      ctrl: true,
      shift: true,
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);
    expect(handler.getBindings().length).toBe(1);

    const removed = handler.unbind("s", true, true);
    expect(removed).toBe(true);
    expect(handler.getBindings().length).toBe(0);
  });

  test("should clear all bindings", () => {
    const binding1: KeyBinding = {
      key: "a",
      action: () => {},
    };

    const binding2: KeyBinding = {
      key: "b",
      ctrl: true,
      action: () => {},
    };

    handler.bind(binding1);
    handler.bind(binding2);

    expect(handler.getBindings().length).toBe(2);

    handler.clearAll();

    expect(handler.getBindings().length).toBe(0);
  });

  test("should handle case-insensitive keys", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "A",
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should support alt modifier", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "f",
      alt: true,
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);

    const event = new KeyboardEvent("keydown", {
      key: "f",
      altKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should support meta modifier", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "k",
      meta: true,
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(true);
  });

  test("should prevent default when binding is triggered", () => {
    const binding: KeyBinding = {
      key: "s",
      ctrl: true,
      action: () => {},
    };

    handler.bind(binding);

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  test("should clean up on destroy", () => {
    let actionCalled = false;

    const binding: KeyBinding = {
      key: "a",
      action: () => {
        actionCalled = true;
      },
    };

    handler.bind(binding);
    handler.destroy();

    expect(handler.getBindings().length).toBe(0);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(actionCalled).toBe(false);
  });

  test("should allow multiple different bindings", () => {
    let action1Called = false;
    let action2Called = false;

    const binding1: KeyBinding = {
      key: "a",
      action: () => {
        action1Called = true;
      },
    };

    const binding2: KeyBinding = {
      key: "b",
      ctrl: true,
      action: () => {
        action2Called = true;
      },
    };

    handler.bind(binding1);
    handler.bind(binding2);

    const event1 = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event1);
    expect(action1Called).toBe(true);
    expect(action2Called).toBe(false);

    const event2 = new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event2);
    expect(action2Called).toBe(true);
  });
});
