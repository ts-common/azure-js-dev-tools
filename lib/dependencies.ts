import { any, contains, first } from "./arrays";
import { getBooleanArgument } from "./commandLine";
import { StringMap } from "./common";
import { fileExists, folderExists, getChildFolderPaths, readFileContents, writeFileContents } from "./fileSystem2";
import { getDefaultLogger, Logger } from "./logger";
import { npmInstall, npmView, NPMViewResult } from "./npm";
import { findPackageJsonFileSync, PackageJson, PackageLockJson, readPackageJsonFileSync, readPackageLockJsonFileSync, removePackageLockJsonDependencies, writePackageJsonFileSync, writePackageLockJsonFileSync } from "./packageJson";
import { getParentFolderPath, joinPath, normalizePath } from "./path";

export type DepedencyType = "local" | "latest";

export interface PackageFolder {
  /**
   * The path to the package folder.
   */
  path: string;
  /**
   * Whether or not NPM install will be run when this PackageFolder changes its dependencies.
   * Undefined will be treated the same as true.
   */
  runNPMInstall?: boolean;
  /**
   * If the package is not found (such as when updating to the latest version of an unpublished
   * package), then set the target package version to this default version.
   */
  defaultVersion?: string;
  /**
   * A list of dependencies to not update, even if they are found locally.
   */
  dependenciesToIgnore?: string[];
}

export interface ClonedPackage extends PackageFolder {
  updated?: boolean;
  targetVersion?: string;
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
   * Whether or not packages will have "npm install" invoked, even if they don't have any dependency
   * changes. Any packages that are marked as "runNPMInstall: false" will still not have
   * "npm install" run.
   */
  forceInstall?: boolean;

  /**
   * Whether or not the function will set process.exitCode in addition to returning the exit code.
   * If not defined, this will default to true.
   */
  setProcessExitCode?: boolean;

  /**
   * The package folders that will be processed by changeClonedDependenciesTo().
   */
  packageFolders?: (string | PackageFolder)[];

  /**
   * An extra set of files that will have dependency references updated.
   */
  extraFilesToUpdate?: string[];
}

/**
 * Update the provided dependencies using the provided dependencyType then return the dependencies
 * that were changed.
 */
async function updateDependencies(clonedPackage: ClonedPackage, dependencies: StringMap<string> | undefined, dependencyType: DepedencyType, clonedPackages: StringMap<ClonedPackage | undefined>, logger: Logger): Promise<string[]> {
  const changed: string[] = [];

  if (dependencies) {
    for (const dependencyName of Object.keys(dependencies)) {
      if (contains(clonedPackage.dependenciesToIgnore, dependencyName)) {
        logger.logVerbose(`  Not updating ${dependencyName} because it has been marked as ignored.`);
      } else {
        logger.logVerbose(`  Attempting to update dependency version for ${dependencyName}...`);
        const dependencyVersion: string = dependencies[dependencyName];
        logger.logVerbose(`    Current dependency version: ${dependencyVersion}`);
        const dependencyTargetVersion: string | undefined = await getDependencyTargetVersion(clonedPackage, dependencyName, dependencyType, clonedPackages, logger);
        logger.logVerbose(`    Target dependency version: ${dependencyTargetVersion}`);
        if (!dependencyTargetVersion) {
          logger.logVerbose(`    No target dependency version found.`);
        } else if (dependencyVersion === dependencyTargetVersion) {
          logger.logVerbose(`    The target dependency version is already the current dependency version.`);
        } else {
          logger.logInfo(`  Changing "${dependencyName}" from "${dependencyVersion}" to "${dependencyTargetVersion}"...`);
          dependencies[dependencyName] = dependencyTargetVersion;
          changed.push(dependencyName);
        }
      }
    }
  }

  return changed;
}

/**
 * Find the path to the folder that contains a package.json file with the provided package name.
 */
export async function findPackage(packageName: string, startPath: string, clonedPackages?: StringMap<ClonedPackage | undefined>, logger?: Logger): Promise<ClonedPackage | undefined> {
  let result: ClonedPackage | undefined;
  if (clonedPackages && packageName in clonedPackages) {
    result = clonedPackages[packageName];
  } else {
    const normalizedStartPath: string = normalizePath(startPath);

    const visitedFolders: string[] = [];
    const foldersToVisit: string[] = [];

    const addFolderToVisit = (folderPath: string) => {
      if (!contains(visitedFolders, folderPath) && !contains(foldersToVisit, folderPath)) {
        foldersToVisit.push(folderPath);
      }
    };

    if (await fileExists(normalizedStartPath)) {
      foldersToVisit.push(getParentFolderPath(normalizedStartPath));
    } else if (await folderExists(normalizedStartPath)) {
      foldersToVisit.push(normalizedStartPath);
    }

    while (foldersToVisit.length > 0) {
      const folderPath: string = foldersToVisit.shift()!;
      visitedFolders.push(folderPath);

      const packageJsonFilePath: string = joinPath(folderPath, "package.json");
      logger && logger.logVerbose(`Looking for package "${packageName}" at "${packageJsonFilePath}"...`);
      if (await fileExists(packageJsonFilePath)) {
        logger && logger.logVerbose(`"${packageJsonFilePath}" file exists. Comparing package names...`);
        const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
        if (packageJson.name) {
          if (packageJson.name === packageName) {
            result = { path: folderPath };
            break;
          }
        }
      }

      if (!result) {
        const parentFolderPath: string = getParentFolderPath(folderPath);
        if (parentFolderPath) {
          addFolderToVisit(parentFolderPath);
          for (const childFolderPath of (await getChildFolderPaths(parentFolderPath))!) {
            addFolderToVisit(childFolderPath);
          }
        }
      }
    }

    if (clonedPackages) {
      clonedPackages[packageName] = result;
    }
  }

  return result;
}

async function getDependencyTargetVersion(clonedPackage: ClonedPackage, dependencyName: string, dependencyType: DepedencyType, clonedPackages: StringMap<ClonedPackage | undefined>, logger?: Logger): Promise<string | undefined> {
  let result: string | undefined;
  const dependencyClonedPackage: ClonedPackage | undefined = await findPackage(dependencyName, clonedPackage.path, clonedPackages, logger);
  if (!dependencyClonedPackage) {
    logger && logger.logVerbose(`    No cloned package found named ${dependencyName}.`);
  } else {
    if (!dependencyClonedPackage.targetVersion) {
      if (dependencyType === "local") {
        dependencyClonedPackage.targetVersion = `file:${dependencyClonedPackage.path}`;
      } else if (dependencyType === "latest") {
        const dependencyViewResult: NPMViewResult = await npmView({ packageName: dependencyName });
        const distTags: StringMap<string> | undefined = dependencyViewResult["dist-tags"];
        dependencyClonedPackage.targetVersion = distTags && distTags["latest"];
        if (dependencyClonedPackage.targetVersion) {
          dependencyClonedPackage.targetVersion = "^" + dependencyClonedPackage.targetVersion;
        } else {
          dependencyClonedPackage.targetVersion = dependencyClonedPackage.defaultVersion;
        }
      }
    }
    result = dependencyClonedPackage.targetVersion;
  }
  return result;
}

/**
 * Change all of the cloned dependencies in the package found at the provided package path to the
 * provided dependency type.
 */
export async function changeClonedDependenciesTo(packagePath: string, dependencyType: DepedencyType, options: ChangeClonedDependenciesToOptions = {}): Promise<number> {
  const logger: Logger = options.logger || getDefaultLogger();

  const recursive: boolean | undefined = getBooleanArgument("recursive", { defaultValue: true });
  const forceInstall: boolean | undefined = getBooleanArgument("force-install", { defaultValue: false });
  const includeAzureJsDevTools: boolean | undefined = getBooleanArgument("include-azure-js-dev-tools", { defaultValue: false });

  let exitCode: number | undefined = 0;

  const clonedPackages: StringMap<ClonedPackage | undefined> = {};
  const packageFolderPathsToVisit: string[] = [];
  const packageFolderPathsVisited: string[] = [];

  const packagePathsToAdd: string[] = [];
  if (!options.packageFolders) {
    packagePathsToAdd.push(packagePath);
  } else {
    const packageFolderPaths: string[] = options.packageFolders.map((packageFolder: string | PackageFolder) => typeof packageFolder === "string" ? packageFolder : packageFolder.path);
    packagePathsToAdd.push(...packageFolderPaths);
  }

  for (const packagePathToAdd of packagePathsToAdd) {
    // logger.logInfo(`Looking for package.json file at or above "${packagePathToAdd}"...`);
    const packageJsonFilePath: string | undefined = findPackageJsonFileSync(packagePathToAdd);
    if (!packageJsonFilePath) {
      logger.logError(`Could not find a package.json at or above the provided package path (${packagePathToAdd}).`);
      exitCode = 1;
      break;
    } else {
      // logger.logInfo(`Found package.json file at "${packageJsonFilePath}".`);
      const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
      const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
      const packageName: string = packageJson.name!;
      packageFolderPathsToVisit.push(packageFolderPath);

      const clonedPackage: ClonedPackage = {
        path: packageFolderPath
      };

      const packageFolder: string | PackageFolder | undefined = first(options.packageFolders, (packageFolder: string | PackageFolder) => (typeof packageFolder === "string" ? packageFolder : packageFolder.path) === packagePathToAdd);
      if (packageFolder && typeof packageFolder !== "string") {
        clonedPackage.defaultVersion = packageFolder.defaultVersion;
        clonedPackage.dependenciesToIgnore = packageFolder.dependenciesToIgnore;
        clonedPackage.runNPMInstall = packageFolder.runNPMInstall;
      }

      clonedPackages[packageName] = clonedPackage;
    }
  }

  const folderPathsToRunNPMInstallIn: string[] = [];

  while (packageFolderPathsToVisit.length > 0 && exitCode === 0) {
    const packageFolderPath: string = packageFolderPathsToVisit.shift()!;
    packageFolderPathsVisited.push(packageFolderPath);

    logger.logSection(`Updating package folder "${packageFolderPath}"...`);

    const packageJsonFilePath: string = joinPath(packageFolderPath, "package.json");
    const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
    const packageName: string = packageJson.name!;
    const clonedPackage: ClonedPackage | undefined = clonedPackages[packageName]!;
    clonedPackage.updated = true;

    if (!includeAzureJsDevTools) {
      if (!clonedPackage.dependenciesToIgnore) {
        clonedPackage.dependenciesToIgnore = [];
      }
      clonedPackage.dependenciesToIgnore.push("@ts-common/azure-js-dev-tools");
    }

    const dependenciesChanged: string[] = await updateDependencies(clonedPackage, packageJson.dependencies, dependencyType, clonedPackages, logger);
    const devDependenciesChanged: string[] = await updateDependencies(clonedPackage, packageJson.devDependencies, dependencyType, clonedPackages, logger);
    if (!any(dependenciesChanged) && !any(devDependenciesChanged)) {
      logger.logInfo(`  No changes made.`);
      if (clonedPackage.runNPMInstall !== false && forceInstall) {
        folderPathsToRunNPMInstallIn.push(packageFolderPath);
      }
    } else {
      writePackageJsonFileSync(packageJson, packageJsonFilePath);

      const packageLockJsonFilePath: string = joinPath(packageFolderPath, "package-lock.json");
      if (await fileExists(packageLockJsonFilePath)) {
        const packageLockJson: PackageLockJson = readPackageLockJsonFileSync(packageLockJsonFilePath);
        removePackageLockJsonDependencies(packageLockJson, ...dependenciesChanged, ...devDependenciesChanged);
        writePackageLockJsonFileSync(packageLockJson, packageLockJsonFilePath);
      }

      if (clonedPackage.runNPMInstall !== false) {
        folderPathsToRunNPMInstallIn.push(packageFolderPath);
      }
    }

    if (recursive) {
      const allDependencyNames: string[] = [];
      if (packageJson.dependencies) {
        allDependencyNames.push(...Object.keys(packageJson.dependencies));
      }
      if (packageJson.devDependencies) {
        allDependencyNames.push(...Object.keys(packageJson.devDependencies));
      }

      for (const dependencyName of allDependencyNames) {
        const clonedDependency: ClonedPackage | undefined = clonedPackages[dependencyName];
        if (clonedDependency) {
          const clonedDependencyFolderPath: string = clonedDependency.path;
          if (!clonedDependency.updated && !contains(packageFolderPathsVisited, clonedDependencyFolderPath) && !contains(packageFolderPathsToVisit, clonedDependencyFolderPath)) {
            packageFolderPathsToVisit.push(clonedDependencyFolderPath);
          }
        }
      }
    }
  }

  for (const folderPath of folderPathsToRunNPMInstallIn) {
    exitCode = (await npmInstall({
      executionFolderPath: folderPath,
      log: logger.logSection,
      showCommand: true
    })).exitCode;

    if (exitCode !== 0) {
      break;
    }
  }

  if (exitCode === 0 && options.extraFilesToUpdate) {
    for (const extraFileToUpdate of options.extraFilesToUpdate) {
      if (!await fileExists(extraFileToUpdate)) {
        logger.logError(`The extra file to update "${extraFileToUpdate}" doesn't exist.`);
        exitCode = 2;
        break;
      } else {
        logger.logSection(`Updating extra file "${extraFileToUpdate}"...`);
        const originalFileContents: string = (await readFileContents(extraFileToUpdate))!;
        let updatedFileContents: string = originalFileContents;

        for (const clonedPackageName of Object.keys(clonedPackages)) {
          const clonedPackage: ClonedPackage | undefined = clonedPackages[clonedPackageName];
          if (clonedPackage && clonedPackage.targetVersion) {
            const regularExpression = new RegExp(`\\.StringProperty\\("${clonedPackageName}", "(.*)"\\);`);
            const match: RegExpMatchArray | null = updatedFileContents.match(regularExpression);
            if (match && match[1] !== clonedPackage.targetVersion) {
              logger.logInfo(`  Changing "${clonedPackageName}" version from "${match[1]}" to "${clonedPackage.targetVersion}"...`);
              updatedFileContents = updatedFileContents.replace(regularExpression, `.StringProperty("${clonedPackageName}", "${clonedPackage.targetVersion}");`);
            }
          }
        }

        if (originalFileContents === updatedFileContents) {
          logger.logInfo(`  No changes made.`);
        } else {
          logger.logInfo(`  Writing changes back to file...`);
          await writeFileContents(extraFileToUpdate, updatedFileContents);
        }
      }
    }
  }

  if (exitCode == undefined) {
    exitCode = 1;
  }
  if (options.setProcessExitCode !== false) {
    process.exitCode = exitCode;
  }

  return exitCode;
}
