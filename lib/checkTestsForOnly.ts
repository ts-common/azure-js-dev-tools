import * as yargs from "yargs";
import { getAzureDevOpsLogger } from "./azureDevOps";
import { getChildFilePaths, readFileContents } from "./fileSystem2";
import { getConsoleLogger, Logger } from "./logger";

/**
 * Check the package.json file found at the provided startPath (or in one of the parent folders) to
 * see if the version number has already been published. If the version number has been published,
 * then a non-zero error code will be returned.
 * @param startPath The path to start looking for the package.json file in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The exit code for this function. Zero will be returned if the package version doesn't
 * exist in NPM.
 */
export function checkTestsForOnly(startPaths: string | string[], logger?: Logger): number {
  const startPathArray: string[] = typeof startPaths === "string" ? [startPaths] : startPaths;
  logger = logger || (yargs.argv["azure-devops"] ? getAzureDevOpsLogger() : getConsoleLogger());

  let exitCode = 0;

  for (const startPath of startPathArray) {
    logger.logInfo(`Looking for *.only(...) function calls in files starting at "${startPath}"...`);
    const sourceFilePaths: string[] | undefined = getChildFilePaths(startPath, {
      recursive: true,
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