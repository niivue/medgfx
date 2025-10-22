import pino from "pino";

const DEFAULT_LOG_LEVEL = "debug";

// Single logger instance for the entire library
export const logger = pino({
  browser: {
    asObject: true,
  },
  level: DEFAULT_LOG_LEVEL,
});

// Get current log level
export const getLogLevel = (): string => {
  return logger.level;
};

// Set log level for the entire library
export const setLogLevel = (level: pino.LevelWithSilentOrString): void => {
  logger.level = level;
};
