/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Logger } from "@azure/logger-js";

import { AdditionalCheck } from "./checkEverything";
import { readFileContents } from "./fileSystem2";
import { getDefaultLogger } from "./logger";
import { isRooted, resolvePath } from "./path";

export interface CheckFileContainsOptions {
  /**
   * The Logger to use. If no Logger is specified, then a default Logger will be used instead.
   */
  logger?: Logger;
}

/**
 * Create an AdditionalCheck that verifies that the file at the provided path contains the provided
 * text.
 * @param filePath The path to the file to check.
 * @param textToFind The text to find in the file.
 */
export function checkFileContains(filePath: string, textToFind: string, options: CheckFileContainsOptions = {}): AdditionalCheck {
  return {
    name: `${filePath} contains "${textToFind}"`,
    check: () => checkFileContainsCheck(filePath, textToFind, options),
  };
}

/**
 * Check the source files found under the provided startPaths for only() function calls. Returns the
 * number of source files found that reference the only() function.
 * @param startPaths The paths to start looking for source files in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The number of source files found that contain only() function calls.
 */
export async function checkFileContainsCheck(filePath: string, textToFind: string, options: CheckFileContainsOptions = {}): Promise<number> {
  const rootedFilePath: string = isRooted(filePath) ? filePath : resolvePath(filePath);
  const logger: Logger = options.logger || getDefaultLogger();

  let exitCode = 0;

  const fileContents: string | undefined = await readFileContents(rootedFilePath);
  if (fileContents == undefined) {
    await logger.logError(`  The file ${filePath} should exist.`);
    exitCode = 1;
  } else if (!fileContents.includes(textToFind)) {
    await logger.logError(`  The file ${filePath} should contain "${textToFind}".`);
    exitCode = 1;
  } else {
    exitCode = 0;
  }

  process.exitCode = exitCode;

  return exitCode;
}
