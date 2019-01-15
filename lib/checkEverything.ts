import { checkForOnlyCalls, CheckForOnlyCallsOptions } from "./checkForOnlyCalls";
import { checkForSkipCalls, CheckForSkipCallsOptions } from "./checkForSkipCalls";
import { checkPackageJsonVersion, CheckPackageJsonVersionOptions } from "./checkPackageJsonVersion";
import { getDefaultLogger, Logger } from "./logger";

/**
 * An additional check that can be run.
 */
export interface AdditionalCheck {
  /**
   * The name of the additional check.
   */
  name: string;
  /**
   * The implementation of the additional check.
   */
  check: () => number;
}

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
   * The options to provide to the check for only() calls check.
   */
  checkForOnlyCallsOptions?: CheckForOnlyCallsOptions;
  /**
   * The options to provide to the check for skip() calls check.
   */
  checkForSkipCallsOptions?: CheckForSkipCallsOptions;
  /**
   * Additional checks that can be run as a part of check everything.
   */
  additionalChecks?: AdditionalCheck | AdditionalCheck[];
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
  runCheck("No skip() calls", () => checkForSkipCalls(options.checkForSkipCallsOptions));
  if (options.additionalChecks) {
    const additionalChecks: AdditionalCheck[] = Array.isArray(options.additionalChecks) ? options.additionalChecks : [options.additionalChecks];
    for (const additionalCheck of additionalChecks) {
      runCheck(additionalCheck.name, additionalCheck.check);
    }
  }

  if (exitCode === 0) {
    logger.logInfo(`${exitCode} checks failed.`);
  } else {
    logger.logError(`${exitCode} checks failed.`);
  }

  process.exitCode = exitCode;

  return exitCode;
}