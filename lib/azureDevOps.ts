import { Logger, getConsoleLogger } from "./logger";

/**
 * A Logger that will output prefixes for certain types of logs in the Azure DevOps environment.
 */
export interface AzureDevOpsLogger extends Logger {
  /**
   * Log a message that indicates a new section has been entered.
   * @param text The text to log.
   */
  logSection(text: string): void;
}

/**
 * Get a Logger that will output prefixes for certain types of logs in the Azure DevOps environment.
 */
export function getAzureDevOpsLogger(toWrap?: Logger): AzureDevOpsLogger {
  const innerLogger: Logger = toWrap || getConsoleLogger();
  return {
    logInfo: innerLogger.logInfo,
    logError: (text: string) => innerLogger.logError(`##[error]${text}`),
    logSection: (text: string) => innerLogger.logInfo(`##[section]${text}`)
  };
}