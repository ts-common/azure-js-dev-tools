import { checkForOnlyCalls, CheckForOnlyCallsOptions } from "./checkForOnlyCalls";
import { checkPackageJsonVersion, CheckPackageJsonVersionOptions } from "./checkPackageJsonVersion";
import { getDefaultLogger, Logger } from "./logger";

export interface CheckEverythingOptions {
  /**
   * The Logger to use for each of the repository checks. If no Logger is specified, then a default
   * Logger will be used.
   */
  logger?: Logger;
  /**
   * The options to provide to the package.json version check.
   */
  checkPackageJsonVersionOptions?: CheckPackageJsonVersionOptions;
  /**
   * The options to provide to the only() in test source files check.
   */
  checkForOnlyCallsOptions?: CheckForOnlyCallsOptions;
}

/**
 * Run all of the repository checks.
 * @returns The number of repository checks that failed.
 */
export function checkEverything(checkEverythingOptions?: CheckEverythingOptions): number {
  const options: CheckEverythingOptions = checkEverythingOptions || {};
  const logger: Logger = options.logger || getDefaultLogger();

  let exitCode = 0;

  const runCheck = (checkName: string, check: () => number) => {
    logger.logSection(`Starting check "${checkName}"...`);
    if (check() !== 0) {
      ++exitCode;
    }
    logger.logInfo("Done.");
  };

  runCheck("Package.json Version", () => checkPackageJsonVersion(options.checkPackageJsonVersionOptions));
  runCheck("No only() calls", () => checkForOnlyCalls(options.checkForOnlyCallsOptions));

  if (exitCode === 0) {
    logger.logInfo(`${exitCode} checks failed.`);
  } else {
    logger.logError(`${exitCode} checks failed.`);
  }

  process.exitCode = exitCode;

  return exitCode;
}