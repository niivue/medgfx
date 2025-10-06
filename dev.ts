import { MedGFX } from "./src/medgfx";

// Setup log streaming UI
const logContainer = document.getElementById("log-container");
let logCount = 0;
const MAX_LOGS = 500;

interface LogDetail {
  level: number;
  time: number;
  msg: string;
  component?: string;
  [key: string]: unknown;
}

const levelNames: Record<number, string> = {
  10: "debug",
  20: "info",
  30: "warn",
  40: "error",
  50: "error",
  60: "error",
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { hour12: false, fractional: 3 } as any);
}

window.addEventListener("medgfx-log", ((event: CustomEvent<LogDetail>) => {
  const log = event.detail;
  const levelName = levelNames[log.level] || "info";

  const entry = document.createElement("div");
  entry.className = `log-entry ${levelName}`;

  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.textContent = formatTime(log.time);

  const component = log.component ? `[${log.component}] ` : "";
  const message = document.createTextNode(`${component}${log.msg}`);

  entry.appendChild(timestamp);
  entry.appendChild(message);

  logContainer?.appendChild(entry);
  logCount++;

  // Limit log entries
  if (logCount > MAX_LOGS && logContainer?.firstChild) {
    logContainer.removeChild(logContainer.firstChild);
    logCount--;
  }

  // Auto-scroll to bottom
  if (logContainer) {
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}) as EventListener);

// Initialize MedGFX
const canvas = document.getElementById("medgfx-canvas") as HTMLCanvasElement;
const medgfx = new MedGFX({ logLevel: 'debug' });

medgfx.init();

// Set canvas to enable event handlers
medgfx.canvas = canvas;

// Get WebGL 2.0 context
const gl = canvas.getContext("webgl2");
if (!gl) {
  console.error("WebGL 2.0 not supported");
} else {
  medgfx.gl = gl;
  console.log("WebGL 2.0 context acquired");
  // Clear to black
  gl.clearColor(0.0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
