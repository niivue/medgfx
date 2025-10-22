import { MedGFX } from "./src/medgfx";

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
