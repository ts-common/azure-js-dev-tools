/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Logger } from "@azure/logger-js";

import { contains, where } from "./arrays";
import { getLines, padLeft } from "./common";
import { getChildFilePaths, readFileContents } from "./fileSystem2";
import { getDefaultLogger } from "./logger";
import { getName, pathRelativeTo, pathWithoutFileExtension } from "./path";
import { AdditionalCheck } from "./checkEverything";

export interface CheckForSkipCallsOptions {
  /**
   * A *.skip(...) call by default is an error. Setting this to true will make it a warning.
   */
  skipIsWarning?: boolean;
  /**
   * The paths to start looking for source files in.
   */
  startPaths?: string | string[];
  /**
   * The Logger to use. If no Logger is specified, then a default Logger will be used instead.
   */
  logger?: Logger;
  /**
   * The files and line numbers where skip calls are allowed. The keys of the object should be the
   * path to the file relative to the start path and without the file extension.
   */
  allowedSkips?: { [fileRelativePathWithoutFileExtension: string]: number[] | "all" };
  /**
   * Whether or not allowed skips will be reported. Defaults to false.
   */
  reportAllowedSkips?: boolean;
}

export interface SkipLine {
  lineNumber: number;
  text: string;
  allowed: boolean;
}

export function checkForSkipCalls(options: CheckForSkipCallsOptions = {}): AdditionalCheck {
  return {
    name: "No skip() calls",
    check: () => checkForSkipCallsCheck(options),
  };
}

/**
 * Check the source files found under the provided startPaths for only() function calls. Returns the
 * number of source files found that reference the only() function.
 * @param startPaths The paths to start looking for source files in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The number of source files found that contain only() function calls.
 */
export async function checkForSkipCallsCheck(options: CheckForSkipCallsOptions = {}): Promise<number> {
  const startPathArray: string[] = !options.startPaths ? [process.cwd()] : typeof options.startPaths === "string" ? [options.startPaths] : options.startPaths;
  const logger: Logger = options.logger || getDefaultLogger();

  let filesWithSkipCalls = 0;
  let exitCode = 0;

  const logSkip = options.skipIsWarning ? logger.logWarning : logger.logError;

  for (const startPath of startPathArray) {
    logger.logSection(`Looking for *.skip(...) function calls in files starting at "${startPath}"...`);
    const sourceFilePaths: string[] | undefined = await getChildFilePaths(startPath, {
      recursive: true,
      folderCondition: (folderPath: string) => getName(folderPath) !== "node_modules",
      fileCondition: (filePath: string) => filePath.endsWith(".ts") || filePath.endsWith(".js")
    });

    if (!sourceFilePaths) {
      logger.logError(`  No source files (*.ts, *.js) found.`);
    } else {
      for (const sourceFilePath of sourceFilePaths) {
        const relativeSourceFilePath: string = pathWithoutFileExtension(pathRelativeTo(sourceFilePath, startPath));
        const allowedSkipLines: number[] | "all" = options.allowedSkips && options.allowedSkips[relativeSourceFilePath] || [];
        const sourceFileContents: string = (await readFileContents(sourceFilePath))!;
        const sourceFileLines: string[] = getLines(sourceFileContents);
        const skipLines: SkipLine[] = [];
        for (let i = 0; i < sourceFileLines.length; ++i) {
          const sourceFileLine: string = sourceFileLines[i];
          if (sourceFileLine.indexOf(".skip(") !== -1) {
            skipLines.push({
              lineNumber: i,
              text: sourceFileLine,
              allowed: allowedSkipLines === "all" || contains(allowedSkipLines, i)
            });
          }
        }
        if (skipLines.length > 0) {
          const reportAllowedSkips: boolean = options.reportAllowedSkips || false;
          const skipsToReport: SkipLine[] = where(skipLines, (skipLine: SkipLine) => reportAllowedSkips || !skipLine.allowed);
          if (skipsToReport.length > 0) {
            logSkip(`  Found ${skipLines.length} *.skip(...) call${skipLines.length === 1 ? "" : "s"} in "${sourceFilePath}".`);
            ++filesWithSkipCalls;
            let numberWidth = 1;
            for (const skipLine of skipLines) {
              numberWidth = Math.max(numberWidth, skipLine.lineNumber.toString().length);
            }
            for (const skipLine of skipLines) {
              const allowed: boolean = skipLine.allowed;
              if (!allowed || reportAllowedSkips) {
                logSkip(`    Line ${padLeft(skipLine.lineNumber, numberWidth)}. ${skipLine.text}${allowed ? " (ALLOWED)" : ""}`);
                if (!allowed && !options.skipIsWarning) {
                  ++exitCode;
                }
              }
            }
          }
        }
      }
    }
  }

  if (filesWithSkipCalls === 0) {
    logger.logInfo(`Found 0 source files that contain *.skip(...) calls.`);
  } else {
    logSkip(`Found ${filesWithSkipCalls} source file${filesWithSkipCalls === 1 ? "" : "s"} that contain${filesWithSkipCalls === 1 ? "s" : ""} *.skip(...) calls.`);
  }

  process.exitCode = exitCode;

  return exitCode;
}
