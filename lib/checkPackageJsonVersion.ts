import * as yargs from "yargs";
import { getAzureDevOpsLogger } from "./azureDevOps";
import { getConsoleLogger, Logger } from "./logger";
import { findPackageJsonFileSync, isPackageJsonPublished, PackageJson, readPackageJsonFileSync } from "./packageJson";

/**
 * Check the package.json file found at the provided startPath (or in one of the parent folders) to
 * see if the version number has already been published. If the version number has been published,
 * then a non-zero error code will be returned.
 * @param startPath The path to start looking for the package.json file in.
 * @param logger The logger to use. If no logger is specified, then a console logger will be used.
 * @returns The exit code for this function. Zero will be returned if the package version doesn't
 * exist in NPM.
 */
export function checkPackageJsonVersion(startPath: string, logger?: Logger): number {
  logger = logger || (yargs.argv["azure-devops"] ? getAzureDevOpsLogger() : getConsoleLogger());

  let exitCode: number;
  logger.logInfo(`Looking for package.json file starting at "${startPath}"...`);
  const packageJsonFilePath: string | undefined = findPackageJsonFileSync(startPath);
  if (!packageJsonFilePath) {
    logger.logError(`Could not find a package.json file at "${startPath}" or in any of its parent folders.`);
    exitCode = 1;
  } else {
    logger.logInfo(`Found a package.json file at "${packageJsonFilePath}".`);
    const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
    if (isPackageJsonPublished(packageJson)) {
      logger.logError(`A package with the name "${packageJson.name}" and the version "${packageJson.version}" already exists in NPM.`);
      exitCode = 2;
    } else {
      logger.logInfo(`No package exists yet with the name "${packageJson.name}" and the version "${packageJson.version}".`);
      exitCode = 0;
    }
  }
  return exitCode;
}