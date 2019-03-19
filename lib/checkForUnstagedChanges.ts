/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Logger } from "@azure/logger-js";
import { AdditionalCheck } from "./checkEverything";
import { gitStatus, GitStatusResult } from "./git";
import { getDefaultLogger } from "./logger";

export interface CheckForUnstagedChangesOptions {
  /**
   * Whether or not this check is enabled. Since this is part of the checkEverything check, people
   * who use the checkEverything check need a way to turn this check off.
   */
  enable?: boolean;
  /**
   * The Logger to use. If no Logger is specified, then a default Logger will be used instead.
   */
  logger?: Logger;
}

export function checkForUnstagedChanges(options: CheckForUnstagedChangesOptions = {}): AdditionalCheck {
  return {
    name: "No unstaged changes",
    check: () => checkForUnstagedChangesCheck(options),
  };
}

/**
 * Check the source files found under the provided startPaths for only() function calls. Returns the
 * number of source files found that reference the only() function.
 * @param startPaths The paths to start looking for source files in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The number of source files found that contain only() function calls.
 */
export async function checkForUnstagedChangesCheck(options: CheckForUnstagedChangesOptions = {}): Promise<number> {
  const logger: Logger = options.logger || getDefaultLogger();

  let exitCode = 0;
  if (options.enable === false) {
    await logger.logWarning("Check is disabled. Allowing unstaged changes if they exist.");
  } else {
    await logger.logSection("Looking for unstaged changes...");
    const gitStatusResult: GitStatusResult = await gitStatus();
    const notStagedDeletedFileCount: number = gitStatusResult.notStagedDeletedFiles.length;
    const notStagedModifiedFileCount: number = gitStatusResult.notStagedModifiedFiles.length;
    const untrackedFileCount: number = gitStatusResult.untrackedFiles.length;
    exitCode = notStagedDeletedFileCount + notStagedModifiedFileCount + untrackedFileCount;
    if (exitCode === 0) {
      await logger.logInfo("  No unstaged changes found.");
    } else {
      if (notStagedDeletedFileCount !== 0) {
        await logger.logInfo(`  Found ${notStagedDeletedFileCount} not staged deleted file${notStagedDeletedFileCount === 1 ? "" : "s"}:`);
        for (const notStagedDeletedFilePath of gitStatusResult.notStagedDeletedFiles) {
          await logger.logInfo(`    ${notStagedDeletedFilePath}`);
        }
      }
      if (notStagedModifiedFileCount !== 0) {
        await logger.logInfo(`  Found ${notStagedModifiedFileCount} not staged modified file${notStagedModifiedFileCount === 1 ? "" : "s"}:`);
        for (const notStagedModifiedFilePath of gitStatusResult.notStagedModifiedFiles) {
          await logger.logInfo(`    ${notStagedModifiedFilePath}`);
        }
      }
      if (untrackedFileCount !== 0) {
        await logger.logInfo(`  Found ${untrackedFileCount} untracked file${untrackedFileCount === 1 ? "" : "s"}:`);
        for (const untrackedFilePath of gitStatusResult.untrackedFiles) {
          await logger.logInfo(`    ${untrackedFilePath}`);
        }
      }
    }
  }

  process.exitCode = exitCode;

  return exitCode;
}
