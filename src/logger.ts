import pino from "pino";

// Browser transport for pino that sends logs to the UI
const browserWrite = (logObj: object) => {
  const event = new CustomEvent("medgfx-log", { detail: logObj });
  window.dispatchEvent(event);
};

// Single logger instance for the entire library
export const logger = pino({
  browser: {
    asObject: true,
    write: browserWrite,
  },
  level: "debug",
});

// Get current log level
export const getLogLevel = (): string => {
  return logger.level;
};

// Set log level for the entire library
export const setLogLevel = (level: pino.LevelWithSilentOrString): void => {
  logger.level = level;
};
