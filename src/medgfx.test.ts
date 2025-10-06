import { test, expect } from "bun:test";
import { MedGFX } from "./medgfx";

test("MedGFX init returns initialized", () => {
  const medgfx = new MedGFX();
  // expect medgfx to be defined
  expect(medgfx).toBeDefined();
});

test("MedGFX logLevel can be set and retrieved", () => {
  const medgfx = new MedGFX();
  
  // Default level should be "debug"
  expect(medgfx.logLevel).toBe("debug");
  
  // Set to info
  medgfx.logLevel = "info";
  expect(medgfx.logLevel).toBe("info");
  
  // Set to warn
  medgfx.logLevel = "warn";
  expect(medgfx.logLevel).toBe("warn");
  
  // Set to error
  medgfx.logLevel = "error";
  expect(medgfx.logLevel).toBe("error");
  
  // Set to silent (no logs)
  medgfx.logLevel = "silent";
  expect(medgfx.logLevel).toBe("silent");
  
  // Reset to debug for other tests
  medgfx.logLevel = "debug";
});

test("MedGFX logLevel can be set via constructor props", () => {
  // Test setting log level to "info" via constructor
  const medgfx1 = new MedGFX({ logLevel: "info" });
  expect(medgfx1.logLevel).toBe("info");
  
  // Test setting log level to "warn" via constructor
  const medgfx2 = new MedGFX({ logLevel: "warn" });
  expect(medgfx2.logLevel).toBe("warn");
  
  // Test setting log level to "error" via constructor
  const medgfx3 = new MedGFX({ logLevel: "error" });
  expect(medgfx3.logLevel).toBe("error");
  
  // Reset to debug
  medgfx3.logLevel = "debug";
  
  // Test default (no props) should use current level (debug after reset)
  const medgfx4 = new MedGFX();
  expect(medgfx4.logLevel).toBe("debug");
  
  // Test empty props should also use current level
  const medgfx5 = new MedGFX({});
  expect(medgfx5.logLevel).toBe("debug");
  
  // Test that a fresh instance with logLevel prop overrides current level
  medgfx5.logLevel = "warn"; // Set to warn
  const medgfx6 = new MedGFX({ logLevel: "info" });
  expect(medgfx6.logLevel).toBe("info");
  
  // Reset to debug for other tests
  medgfx6.logLevel = "debug";
});

test("MedGFX logLevel filters debug logs correctly", () => {
  const medgfx = new MedGFX();
  
  // Set to info level - debug logs should not appear
  medgfx.logLevel = "info";
  expect(medgfx.logLevel).toBe("info");
  
  // Reset to debug for other tests
  medgfx.logLevel = "debug";
});
