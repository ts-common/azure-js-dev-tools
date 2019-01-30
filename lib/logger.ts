import { getBooleanArgument } from "./commandLine";

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

  /**
   * Log the provided text as a warning.
   * @param text The text to log.
   */
  logWarning(text: string): void;

  /**
   * Log the provided text as a section header.
   * @param text The text to log.
   */
  logSection(text: string): void;

  /**
   * Log the provided text as a verbose log.
   * @param text The text to log.
   */
  logVerbose(text: string): void;
}

/**
 * Get a logger that will log to each of the provided loggers when it is logged to.
 * @param loggers The loggers to log to.
 */
export function getCompositeLogger(...loggers: Logger[]): Logger {
  return {
    logInfo: (text: string) => loggers.forEach((logger: Logger) => logger.logInfo(text)),
    logError: (text: string) => loggers.forEach((logger: Logger) => logger.logError(text)),
    logWarning: (text: string) => loggers.forEach((logger: Logger) => logger.logWarning(text)),
    logSection: (text: string) => loggers.forEach((logger: Logger) => logger.logSection(text)),
    logVerbose: (text: string) => loggers.forEach((logger: Logger) => logger.logVerbose(text))
  };
}

/**
 * The options that can be provided when creating a Logger.
 */
export interface LoggerOptions {
  /**
   * Log the provided text as informational.
   * @param text The text to log.
   */
  logInfo?: boolean | ((text: string) => void);

  /**
   * Log the provided text as an error.
   * @param text The text to log.
   */
  logError?: boolean | ((text: string) => void);

  /**
   * Log the provided text as a warning.
   * @param text The text to log.
   */
  logWarning?: boolean | ((text: string) => void);

  /**
   * Log the provided text as a section header.
   * @param text The text to log.
   */
  logSection?: boolean | ((text: string) => void);

  /**
   * Log the provided text as a verbose log.
   * @param text The text to log.
   */
  logVerbose?: boolean | ((text: string) => void);
}

function getLogFunction(optionsFunction: undefined | boolean | ((text: string) => void), normalFunction: (text: string) => void, undefinedUsesNormalFunction = true): (text: string) => void {
  let result: (text: string) => void = () => { };
  if (optionsFunction !== false) {
    if (typeof optionsFunction === "function") {
      result = optionsFunction;
    } else if (optionsFunction !== undefined || undefinedUsesNormalFunction) {
      result = normalFunction;
    }
  }
  return result;
}

/**
 * Wrap the provided Logger with the provided options.
 * @param toWrap The Logger to wrap.
 * @param options The options that should be applied to the wrapped Logger.
 * @returns The newly created Logger that wraps the provided Logger using the provided options.
 */
export function wrapLogger(toWrap: Logger, options: LoggerOptions): Logger {
  options = options || {};
  return {
    logInfo: getLogFunction(options.logInfo, toWrap.logInfo),
    logError: getLogFunction(options.logError, toWrap.logError),
    logWarning: getLogFunction(options.logWarning, toWrap.logWarning),
    logSection: getLogFunction(options.logSection, toWrap.logSection),
    logVerbose: getLogFunction(options.logVerbose, toWrap.logVerbose, false)
  };
}

/**
 * Get a Logger that will send its logs to the console.
 */
export function getConsoleLogger(options?: LoggerOptions): Logger {
  options = options || {};
  return wrapLogger(
    {
      logInfo: (text: string) => console.log(text),
      logError: (text: string) => console.error(text),
      logWarning: (text: string) => console.log(text),
      logSection: (text: string) => console.log(text),
      logVerbose: (text: string) => console.log(text)
    },
    options);
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
  /**
   * The warning logs that have been written to this Logger.
   */
  warningLogs: string[];
  /**
   * The section header logs that have been written to this Logger.
   */
  sectionLogs: string[];
  /**
   * The verbose logs that have been written to this Logger.
   */
  verboseLogs: string[];
}

/**
 * The options that can be provided when creating an InMemoryLogger.
 */
export interface InMemoryLoggerOptions {
  /**
   * Log the provided text as informational.
   */
  logInfo?: boolean;

  /**
   * Log the provided text as an error.
   */
  logError?: boolean;

  /**
   * Log the provided text as a warning.
   */
  logWarning?: boolean;

  /**
   * Log the provided text as a section header.
   */
  logSection?: boolean;

  /**
   * Log the provided text as a verbose log.
   */
  logVerbose?: boolean;
}

/**
 * Get a Logger that will store its logs in memory.
 */
export function getInMemoryLogger(options?: InMemoryLoggerOptions): InMemoryLogger {
  options = options || {};
  const allLogs: string[] = [];
  const infoLogs: string[] = [];
  const errorLogs: string[] = [];
  const warningLogs: string[] = [];
  const sectionLogs: string[] = [];
  const verboseLogs: string[] = [];
  return {
    allLogs,
    infoLogs,
    errorLogs,
    warningLogs,
    sectionLogs,
    verboseLogs,
    logInfo: getLogFunction(options.logInfo, (text: string) => {
      allLogs.push(text);
      infoLogs.push(text);
    }),
    logError: getLogFunction(options.logError, (text: string) => {
      allLogs.push(text);
      errorLogs.push(text);
    }),
    logWarning: getLogFunction(options.logWarning, (text: string) => {
      allLogs.push(text);
      warningLogs.push(text);
    }),
    logSection: getLogFunction(options.logSection, (text: string) => {
      allLogs.push(text);
      sectionLogs.push(text);
    }),
    logVerbose: getLogFunction(options.logVerbose, (text: string) => {
      allLogs.push(text);
      verboseLogs.push(text);
    }, false)
  };
}

export interface AzureDevOpsLoggerOptions extends LoggerOptions {
  toWrap?: Logger;
}

/**
 * Get a Logger that will output prefixes for certain types of logs in the Azure DevOps environment.
 */
export function getAzureDevOpsLogger(options?: AzureDevOpsLoggerOptions): Logger {
  options = options || {};
  const innerLogger: Logger = options.toWrap || getConsoleLogger({
    ...options,
    logError: ("logError" in options ? options.logError : (text: string) => console.log(text)),
  });
  return wrapLogger(innerLogger, {
    logError: (text: string) => innerLogger.logError(`##[error]${text}`),
    logInfo: true,
    logSection: (text: string) => innerLogger.logSection(`##[section]${text}`),
    logWarning: (text: string) => innerLogger.logWarning(`##[warning]${text}`),
    logVerbose: true
  });
}

/**
 * Get the default Logger based on the command line arguments.
 * @returns The default Logger based on the command line arguments.
 */
export function getDefaultLogger(options?: LoggerOptions): Logger {
  options = options || {};
  if (options.logVerbose == undefined) {
    options.logVerbose = getBooleanArgument("verbose");
  }
  return getBooleanArgument("azure-devops") ? getAzureDevOpsLogger(options) : getConsoleLogger(options);
}
