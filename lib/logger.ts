/**
 * An interface for an object that writes logs.
 */
export interface Logger {
  /**
   * Log the provided text as informational.
   * @param text The text to log.
   */
  logInfo(text: string): void;

  /**
   * Log the provided text as an error.
   * @param text The text to log.
   */
  logError(text: string): void;
}

/**
 * An interface for wrapping an existing Logger.
 */
export interface WrappedLoggerOptions {
  /**
   * Log the provided text as informational.
   * @param text The text to log.
   */
  logInfo?(text: string): void;

  /**
   * Log the provided text as an error.
   * @param text The text to log.
   */
  logError?(text: string): void;
}

/**
 * Wrap the provided Logger with the provided options.
 * @param toWrap The Logger to wrap.
 * @param options The options that should be applied to the wrapped Logger.
 * @returns The newly created Logger that wraps the provided Logger using the provided options.
 */
export function wrapLogger(toWrap: Logger, options: WrappedLoggerOptions): Logger {
  return {
    logInfo: (options && options.logInfo) || toWrap.logInfo,
    logError: (options && options.logError) || toWrap.logError
  };
}

/**
 * Get a Logger that will send its logs to the console.
 */
export function getConsoleLogger(): Logger {
  return {
    logInfo: (text: string) => console.log(text),
    logError: (text: string) => console.error(text)
  };
}

/**
 * A Logger that will store its logs in memory.
 */
export interface InMemoryLogger extends Logger {
  /**
   * All of the logs that have been written to this Logger.
   */
  allLogs: string[];
  /**
   * The informational logs that have been written to this Logger.
   */
  infoLogs: string[];
  /**
   * The error logs that have been written to this Logger.
   */
  errorLogs: string[];
}

/**
 * Get a Logger that will store its logs in memory.
 */
export function getInMemoryLogger(): InMemoryLogger {
  const allLogs: string[] = [];
  const infoLogs: string[] = [];
  const errorLogs: string[] = [];
  return {
    allLogs,
    infoLogs,
    errorLogs,
    logInfo: (text: string) => {
      allLogs.push(text);
      infoLogs.push(text);
    },
    logError: (text: string) => {
      allLogs.push(text);
      errorLogs.push(text);
    }
  };
}