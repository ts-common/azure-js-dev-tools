import { getChildFilePaths, readFileContents } from "./fileSystem2";
import { getDefaultLogger, Logger } from "./logger";
import { getName } from "./path";

export interface CheckForOnlyCallsOptions {
  /**
   * The paths to start looking for source files in.
   */
  startPaths?: string | string[];
  /**
   * The Logger to use. If no Logger is specified, then a default Logger will be used instead.
   */
  logger?: Logger;
}

/**
 * Check the source files found under the provided startPaths for only() function calls. Returns the
 * number of source files found that reference the only() function.
 * @param startPaths The paths to start looking for source files in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The number of source files found that contain only() function calls.
 */
export function checkForOnlyCalls(options?: CheckForOnlyCallsOptions): number {
  options = options || {};
  const startPathArray: string[] = !options.startPaths ? [process.cwd()] : typeof options.startPaths === "string" ? [options.startPaths] : options.startPaths;
  const logger: Logger = options.logger || getDefaultLogger();

  let exitCode = 0;

  for (const startPath of startPathArray) {
    logger.logInfo(`Looking for *.only(...) function calls in files starting at "${startPath}"...`);
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
        if (sourceFileContents.indexOf(".only(") !== -1) {
          logger.logError(`  Found *.only(...) call in "${sourceFilePath}".`);
          ++exitCode;
        }
      }
    }
  }

  if (exitCode === 0) {
    logger.logInfo(`Found 0 source files that contain *.only(...) calls.`);
  } else {
    logger.logError(`Found ${exitCode} source file${exitCode === 1 ? "" : "s"} that contain${exitCode === 1 ? "s" : ""} *.only(...) calls.`);
  }

  process.exitCode = exitCode;

  return exitCode;
}