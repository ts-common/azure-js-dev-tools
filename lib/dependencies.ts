import { any, contains } from "./arrays";
import { StringMap } from "./common";
import { getChildDirectoriesSync, isDirectorySync, isFileSync } from "./filesystem";
import { getConsoleLogger, Logger } from "./logger";
import { npmInstall, npmView, NPMViewResult } from "./npm";
import { findPackageJsonFileSync, PackageJson, PackageLockJson, readPackageJsonFileSync, readPackageLockJsonFileSync, removePackageLockJsonDependencies, writePackageJsonFileSync, writePackageLockJsonFileSync } from "./packageJson";
import { getParentFolderPath, joinPath, normalize } from "./path";
import yargs = require("yargs");

export type DepedencyType = "local" | "latest";

export interface ClonedPackage {
  folderPath: string;
  updated?: boolean;
}

/**
 * The optional arguments that can be provided to changeClonedDependenciesTo().
 */
export interface ChangeClonedDependenciesToOptions {
  /**
   * The logger that will be used while changing cloned dependency versions. If not defined, this
   * will default to the console logger.
   */
  logger?: Logger;

  /**
   * Whether or not changing a cloned dependency will recursively change the cloned dependency's
   * dependencies as well. If not defined, this will default to true.
   */
  recursive?: boolean;

  /**
   * Whether or not the function will set process.exitCode in addition to returning the exit code.
   * If not defined, this will default to true.
   */
  setProcessExitCode?: boolean;
}

/**
 * Update the provided dependencies using the provided dependencyType then return the dependencies
 * that were changed.
 */
function updateDependencies(packageJsonFilePath: string, dependencies: StringMap<string> | undefined, dependencyType: DepedencyType, clonedPackages: StringMap<ClonedPackage | undefined>, logger: Logger): string[] {
  const changed: string[] = [];

  if (dependencies) {
    for (const dependencyName of Object.keys(dependencies)) {
      const dependencyVersion: string = dependencies[dependencyName];
      const dependencyTargetVersion: string | undefined = getDependencyTargetVersion(packageJsonFilePath, dependencyName, dependencyType, clonedPackages, logger);
      if (dependencyTargetVersion && dependencyVersion !== dependencyTargetVersion) {
        logger.logInfo(`    Changing "${dependencyName}" from "${dependencyVersion}" to "${dependencyTargetVersion}".`);
        dependencies[dependencyName] = dependencyTargetVersion;
        changed.push(dependencyName);
      }
    }
  }

  return changed;
}

/**
 * Find the path to the folder that contains a package.json file with the provided package name.
 */
export function findPackage(packageName: string, startPath: string, clonedPackages?: StringMap<ClonedPackage | undefined>, logger?: Logger): ClonedPackage | undefined {
  let result: ClonedPackage | undefined;
  if (clonedPackages && packageName in clonedPackages) {
    result = clonedPackages[packageName];
  } else {
    const normalizedStartPath: string = normalize(startPath);

    const visitedFolders: string[] = [];
    const foldersToVisit: string[] = [];

    const addFolderToVisit = (folderPath: string) => {
      if (!contains(visitedFolders, folderPath) && !contains(foldersToVisit, folderPath)) {
        foldersToVisit.push(folderPath);
      }
    };
    const log = (text: string) => logger && logger.logInfo(text);

    if (isFileSync(normalizedStartPath)) {
      foldersToVisit.push(getParentFolderPath(normalizedStartPath));
    } else if (isDirectorySync(normalizedStartPath)) {
      foldersToVisit.push(normalizedStartPath);
    }

    while (foldersToVisit.length > 0) {
      const folderPath: string = foldersToVisit.shift()!;
      visitedFolders.push(folderPath);

      const packageJsonFilePath: string = joinPath(folderPath, "package.json");
      log(`Looking for package "${packageName}" at "${packageJsonFilePath}"...`);
      if (isFileSync(packageJsonFilePath)) {
        log(`"${packageJsonFilePath}" file exists. Comparing package names...`);
        const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
        if (packageJson.name) {
          if (packageJson.name === packageName) {
            result = { folderPath };
            break;
          }
        }
      }

      if (!result) {
        const parentFolderPath: string = getParentFolderPath(folderPath);
        if (parentFolderPath) {
          addFolderToVisit(parentFolderPath);
          getChildDirectoriesSync(parentFolderPath)
            .map((childFolderName: string) => joinPath(parentFolderPath, childFolderName))
            .forEach(addFolderToVisit);
        }
      }
    }

    if (clonedPackages) {
      clonedPackages[packageName] = result;
    }
  }

  return result;
}

function getDependencyTargetVersion(packageJsonFilePath: string, dependencyName: string, dependencyType: DepedencyType, clonedPackages: StringMap<ClonedPackage | undefined>, logger: Logger): string | undefined {
  let result: string | undefined;
  const clonedPackage: ClonedPackage | undefined = findPackage(dependencyName, packageJsonFilePath, clonedPackages);
  if (clonedPackage) {
    logger.logInfo(`  Found dependency "${dependencyName}" at "${clonedPackage.folderPath}".`);
    if (dependencyType === "local") {
      result = `file:${clonedPackage.folderPath}`;
    } else if (dependencyType === "latest") {
      const dependencyViewResult: NPMViewResult = npmView({ packageName: dependencyName });
      const distTags: StringMap<string> | undefined = dependencyViewResult["dist-tags"];
      result = distTags && distTags["latest"];
      if (result) {
        result = "^" + result;
      }
    }
  }
  return result;
}

/**
 * Change all of the cloned dependencies in the package found at the provided package path to the
 * provided dependency type.
 */
export function changeClonedDependenciesTo(packagePath: string, dependencyType: DepedencyType, options?: ChangeClonedDependenciesToOptions): number {
  options = options || {};
  const logger: Logger = options.logger || getConsoleLogger();

  const recursiveArgument = yargs.argv["recursive"];
  const recursive: boolean = options.recursive || (recursiveArgument !== "false" && recursiveArgument !== false);

  let exitCode = 0;

  const clonedPackages: StringMap<ClonedPackage | undefined> = {};
  const packageFolderPathsToVisit: string[] = [];
  const packageFolderPathsVisited: string[] = [];

  logger.logInfo(`Looking for package.json file at or above "${packagePath}"...`);
  const packageJsonFilePath: string | undefined = findPackageJsonFileSync(packagePath);
  if (!packageJsonFilePath) {
    logger.logError(`Could not find a package.json at or above the provided package path (${packagePath}).`);
    exitCode = 1;
  } else {
    logger.logInfo(`Found package.json file at "${packageJsonFilePath}".`);
    const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
    const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
    const packageName: string = packageJson.name!;
    packageFolderPathsToVisit.push(packageFolderPath);
    clonedPackages[packageName] = { folderPath: packageFolderPath };
  }

  while (packageFolderPathsToVisit.length > 0 && exitCode === 0) {
    const packageFolderPath: string = packageFolderPathsToVisit.shift()!;
    packageFolderPathsVisited.push(packageFolderPath);

    logger.logInfo(`Updating package folder "${packageFolderPath}"...`);

    const packageJsonFilePath: string = joinPath(packageFolderPath, "package.json");
    const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
    const packageName: string = packageJson.name!;
    const clonedPackage: ClonedPackage = clonedPackages[packageName]!;
    clonedPackage.updated = true;

    const dependenciesChanged: string[] = updateDependencies(packageJsonFilePath, packageJson.dependencies, dependencyType, clonedPackages, logger);
    const devDependenciesChanged: string[] = updateDependencies(packageJsonFilePath, packageJson.devDependencies, dependencyType, clonedPackages, logger);
    if (!any(dependenciesChanged) && !any(devDependenciesChanged)) {
      logger.logInfo(`  No changes made.`);
    } else {
      if (recursive) {
        for (const changedDependencyName of dependenciesChanged.concat(devDependenciesChanged)) {
          const clonedDependency: ClonedPackage = clonedPackages[changedDependencyName]!;
          const clonedDependencyFolderPath: string = clonedDependency.folderPath;
          if (!clonedDependency.updated && !contains(packageFolderPathsVisited, clonedDependencyFolderPath) && !contains(packageFolderPathsToVisit, clonedDependencyFolderPath)) {
            packageFolderPathsToVisit.push(clonedDependencyFolderPath);
          }
        }
      }

      writePackageJsonFileSync(packageJson, packageJsonFilePath);

      const packageLockJsonFilePath: string = joinPath(packageFolderPath, "package-lock.json");
      if (isFileSync(packageLockJsonFilePath)) {
        const packageLockJson: PackageLockJson = readPackageLockJsonFileSync(packageLockJsonFilePath);
        removePackageLockJsonDependencies(packageLockJson, ...dependenciesChanged, ...devDependenciesChanged);
        writePackageLockJsonFileSync(packageLockJson, packageLockJsonFilePath);
      }

      exitCode = npmInstall({
        executionFolderPath: packageFolderPath,
        log: logger.logInfo
      }).exitCode;
    }
  }

  if (!options || options.setProcessExitCode == undefined || options.setProcessExitCode) {
    process.exitCode = exitCode;
  }

  return exitCode;
}