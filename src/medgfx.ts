import { logger, getLogLevel, setLogLevel } from "./logger";
import { EventManager } from "./events/event-manager";
import type { MedGFXProps } from "./types/medgfx";

// Re-export ColorTables and singleton for convenience
export { ColorTables, colortables } from "./colortables";
export type { ColorMap, LUT } from "./types/colormap";

// Main MedGFX class
export class MedGFX {
  // canvas element
  private _canvas: HTMLCanvasElement | null = null;
  // webgl2 context
  private _gl: WebGL2RenderingContext | null = null;
  // event manager
  private _eventManager: EventManager;

  constructor(props: MedGFXProps = {}) {
    if (props.logLevel) {
      this.logLevel = props.logLevel;
    }
    this._eventManager = new EventManager();
  }

  init = () => {
    logger.info({ component: "MedGFX" }, "MedGFX initialized");
  };

  // get and set "gl" as the canvas webgl2 context
  get gl(): WebGL2RenderingContext | null {
    return this._gl;
  }

  set gl(context: WebGL2RenderingContext | null) {
    this._gl = context;
    if (context) {
      logger.info({ component: "MedGFX" }, "WebGL2 context set");
    } else {
      logger.info({ component: "MedGFX" }, "WebGL2 context cleared");
    }
  }

  // get and set canvas element
  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  set canvas(element: HTMLCanvasElement | null) {
    this._canvas = element;
    if (element) {
      logger.info({ component: "MedGFX" }, "Canvas element set");
      // Initialize pointer events on the canvas
      this._eventManager.initPointerEvents(element);
      // Initialize keyboard events on window
      this._eventManager.initKeyboardEvents(window);
    } else {
      logger.info({ component: "MedGFX" }, "Canvas element cleared");
    }
  }

  // get event manager
  get events(): EventManager {
    return this._eventManager;
  }

  // get and set log level for the entire library
  get logLevel(): string {
    return getLogLevel();
  }

  set logLevel(level: string) {
    setLogLevel(level);
    logger.info({ component: "MedGFX", level }, "Log level changed");
  }

  destroy() {
    this._eventManager.destroy();
    this._canvas = null;
    this._gl = null;
    logger.info({ component: "MedGFX" }, "MedGFX destroyed");
  }
}
