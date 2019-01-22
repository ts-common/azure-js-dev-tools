import { getChildFilePaths, readFileContents } from "./fileSystem2";
import { getDefaultLogger, Logger } from "./logger";
import { getName } from "./path";
import { padLeft } from "./common";

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
}

export interface SkipLine {
  lineNumber: number;
  text: string;
}

/**
 * Check the source files found under the provided startPaths for only() function calls. Returns the
 * number of source files found that reference the only() function.
 * @param startPaths The paths to start looking for source files in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The number of source files found that contain only() function calls.
 */
export function checkForSkipCalls(options?: CheckForSkipCallsOptions): number {
  options = options || {};
  const startPathArray: string[] = !options.startPaths ? [process.cwd()] : typeof options.startPaths === "string" ? [options.startPaths] : options.startPaths;
  const logger: Logger = options.logger || getDefaultLogger();

  let filesWithSkipCalls = 0;
  let exitCode = 0;

  const logSkip = options.skipIsWarning ? logger.logWarning : logger.logError;

  for (const startPath of startPathArray) {
    logger.logSection(`Looking for *.skip(...) function calls in files starting at "${startPath}"...`);
    const sourceFilePaths: string[] | undefined = getChildFilePaths(startPath, {
      recursive: true,
      folderCondition: (folderPath: string) => getName(folderPath) !== "node_modules",
      fileCondition: (filePath: string) => filePath.endsWith(".ts") || filePath.endsWith(".js")
    });

    if (!sourceFilePaths) {
      logger.logError(`  No source files (*.ts, *.js) found.`);
    } else {
      for (const sourceFilePath of sourceFilePaths) {
        const sourceFileContents: string = readFileContents(sourceFilePath)!;
        const sourceFileLines: string[] = sourceFileContents.split(/\r?\n/);
        const skipLines: SkipLine[] = [];
        for (let i = 0; i < sourceFileLines.length; ++i) {
          const sourceFileLine: string = sourceFileLines[i];
          if (sourceFileLine.indexOf(".skip(") !== -1) {
            skipLines.push({ lineNumber: i, text: sourceFileLine });
          }
        }
        if (skipLines.length > 0) {
          logSkip(`  Found ${skipLines.length} *.skip(...) call${skipLines.length === 1 ? "" : "s"} in "${sourceFilePath}".`);
          ++filesWithSkipCalls;
          if (!options.skipIsWarning) {
            exitCode += skipLines.length;
          }
          let numberWidth = 1;
          for (const skipLine of skipLines) {
            numberWidth = Math.max(numberWidth, skipLine.lineNumber.toString().length);
          }
          for (const skipLine of skipLines) {
            logSkip(`    Line ${padLeft(skipLine.lineNumber, numberWidth)}. ${skipLine.text}`);
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
