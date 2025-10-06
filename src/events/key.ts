import { logger } from "../logger";
import type { KeyBinding } from "../types/events";

export type { KeyBinding };

export class KeyboardEventHandler {
  private bindings = new Map<string, KeyBinding>();
  private element: HTMLElement | Window;
  private abortController: AbortController;

  constructor(element: HTMLElement | Window = window) {
    this.element = element;
    this.abortController = new AbortController();
    this.attachListeners();
    logger.info({ component: "KeyboardEventHandler" }, "KeyboardEventHandler initialized");
  }

  private attachListeners() {
    this.element.addEventListener("keydown", this.handleKeyDown as EventListener, {
      signal: this.abortController.signal,
    });
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const bindingKey = this.createBindingKey(
      event.key,
      event.ctrlKey,
      event.shiftKey,
      event.altKey,
      event.metaKey
    );

    const binding = this.bindings.get(bindingKey);
    if (binding) {
      event.preventDefault();
      logger.debug(
        {
          component: "KeyboardEventHandler",
          key: event.key,
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey,
          description: binding.description,
        },
        "Key binding triggered"
      );
      binding.action();
    }
  };

  private createBindingKey(
    key: string,
    ctrl = false,
    shift = false,
    alt = false,
    meta = false
  ): string {
    const modifiers = [];
    if (ctrl) modifiers.push("ctrl");
    if (shift) modifiers.push("shift");
    if (alt) modifiers.push("alt");
    if (meta) modifiers.push("meta");

    return modifiers.length > 0
      ? `${modifiers.join("+")}+${key.toLowerCase()}`
      : key.toLowerCase();
  }

  bind(binding: KeyBinding) {
    const bindingKey = this.createBindingKey(
      binding.key,
      binding.ctrl,
      binding.shift,
      binding.alt,
      binding.meta
    );

    this.bindings.set(bindingKey, binding);
    logger.info(
      {
        component: "KeyboardEventHandler",
        bindingKey,
        description: binding.description,
      },
      "Key binding registered"
    );
  }

  unbind(key: string, ctrl = false, shift = false, alt = false, meta = false) {
    const bindingKey = this.createBindingKey(key, ctrl, shift, alt, meta);
    const removed = this.bindings.delete(bindingKey);
    if (removed) {
      logger.info({ component: "KeyboardEventHandler", bindingKey }, "Key binding removed");
    }
    return removed;
  }

  clearAll() {
    this.bindings.clear();
    logger.info({ component: "KeyboardEventHandler" }, "All key bindings cleared");
  }

  getBindings(): KeyBinding[] {
    return Array.from(this.bindings.values());
  }

  destroy() {
    this.abortController.abort();
    this.bindings.clear();
    logger.info({ component: "KeyboardEventHandler" }, "KeyboardEventHandler destroyed");
  }
}
