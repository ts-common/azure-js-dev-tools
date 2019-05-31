/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Logger } from "@azure/logger-js";

import { checkForOnlyCalls, CheckForOnlyCallsOptions } from "./checkForOnlyCalls";
import { checkForSkipCalls, CheckForSkipCallsOptions } from "./checkForSkipCalls";
import { checkPackageJsonVersion, CheckPackageJsonVersionOptions } from "./checkPackageJsonVersion";
import { getDefaultLogger } from "./logger";
import { CheckForUnstagedChangesOptions, checkForUnstagedChanges } from "./checkForUnstagedChanges";

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
  check: () => number | Promise<number>;
}

export interface CheckEverythingOptions {
  /**
   * The Logger to use for each of the repository checks. If no Logger is specified, then a default
   * Logger will be used.
   */
  logger?: Logger;
  /**
   * The options to provide to the package.json version check, or false to disable the check.
   */
  checkPackageJsonVersionOptions?: CheckPackageJsonVersionOptions | false;
  /**
   * The options to provide to the check for only() calls check, or false to disable the check.
   */
  checkForOnlyCallsOptions?: CheckForOnlyCallsOptions | false;
  /**
   * The options to provide to the check for skip() calls check, or false to disable the check.
   */
  checkForSkipCallsOptions?: CheckForSkipCallsOptions | false;
  /**
   * The options to provide to the check for unstaged changes check, or false to disable the check.
   */
  checkForUnstagedChangesOptions?: CheckForUnstagedChangesOptions | false;
  /**
   * Additional checks that can be run as a part of check everything.
   */
  additionalChecks?: AdditionalCheck | AdditionalCheck[];
}

/**
 * Run all of the repository checks.
 * @returns The number of repository checks that failed.
 */
export async function checkEverything(options: CheckEverythingOptions = {}): Promise<number> {
  const logger: Logger = options.logger || getDefaultLogger();

  let exitCode = 0;

  const runCheck = async (checkName: string, check: () => number | Promise<number>) => {
    logger.logSection(`Checking ${checkName}...`);
    if (0 !== await Promise.resolve(check())) {
      ++exitCode;
    }
  };

  const checks: AdditionalCheck[] = [];
  if (options.checkPackageJsonVersionOptions !== false) {
    checks.push(checkPackageJsonVersion(options.checkPackageJsonVersionOptions));
  }
  if (options.checkForOnlyCallsOptions !== false) {
    checks.push(checkForOnlyCalls(options.checkForOnlyCallsOptions));
  }
  if (options.checkForSkipCallsOptions !== false) {
    checks.push(checkForSkipCalls(options.checkForSkipCallsOptions));
  }
  if (options.checkForUnstagedChangesOptions !== false) {
    checks.push(checkForUnstagedChanges(options.checkForUnstagedChangesOptions));
  }
  if (options.additionalChecks) {
    if (Array.isArray(options.additionalChecks)) {
      checks.push(...options.additionalChecks);
    } else {
      checks.push(options.additionalChecks);
    }
  }

  for (const check of checks) {
    if (check) {
      await runCheck(check.name, check.check);
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
