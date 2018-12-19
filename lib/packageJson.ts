import * as fs from "fs";
import { contains } from "./arrays";
import { StringMap } from "./common";
import { npmView } from "./npm";
import { getName, getParentFolderPath, joinPath } from "./path";
import { Version } from "./version";

/**
 * Read and parse the PackageJson object found at the provided file path.
 * @param packageJsonFilePath The path to the file that will be parsed as a PackageJson object.
 * @returns The parsed PackageJson object.
 */
export function readPackageLockJsonFileSync(packageJsonFilePath: string): PackageLockJson {
  return JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
}

/**
 * Save to the provided PackageJson object to the file at the provided file path.
 * @param packageLockJson The PackageLockJson object to save.
 * @param packageJsonFilePath The path to the file where the PackageLockJson object will be saved to.
 */
export function writePackageLockJsonFileSync(packageLockJson: PackageLockJson, packageJsonFilePath: string): void {
  fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageLockJson, undefined, 2), { encoding: "utf8" });
}

/**
 * Find a package.json file at the provided path or in one of its ancestor folders.
 * @param pathString The path where the search for the package.json file will begin.
 * @returns The path to the found package.json file, or undefined if no file was found.
 */
export function findPackageJsonFileSync(pathString: string): string | undefined {
  let result: string | undefined;

  function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
  }

  while (pathString && !result) {
    if (getName(pathString) === "package.json" && fileExists(pathString)) {
      result = pathString;
    } else {
      const packageJsonFilePath: string = joinPath(pathString, "package.json");
      if (fileExists(packageJsonFilePath)) {
        result = packageJsonFilePath;
      } else {
        pathString = getParentFolderPath(pathString);
      }
    }
  }

  return result;
}

/**
 * Read and parse the PackageJson object found at the provided file path.
 * @param packageJsonFilePath The path to the file that will be parsed as a PackageJson object.
 * @returns The parsed PackageJson object.
 */
export function readPackageJsonFileSync(packageJsonFilePath: string): PackageJson {
  return JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
}

/**
 * Save to the provided PackageJson object to the file at the provided file path.
 * @param packageJson The PackageJson object to save.
 * @param packageJsonFilePath The path to the file where the PackageJson object will be saved to.
 */
export function writePackageJsonFileSync(packageJson: PackageJson, packageJsonFilePath: string): void {
  fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2), { encoding: "utf8" });
}

/**
 * If a version is specified in the provided PackageJson object, then increment the version's minor
 * number.
 * @param packageJson The PackageJson object to update.
 * @returns Whether or not the version number was successfully updated.
 */
export function incrementPackageJsonMinorVersion(packageJson: PackageJson): boolean {
  let result = false;
  if (packageJson.version) {
    const version = new Version(packageJson.version);
    version.bumpMinor();
    packageJson.version = version.toString();
    result = true;
  }
  return result;
}

/**
 * Get whether or not the provided packageJson has been published to NPM.
 * @param packageJson The packageJson to check.
 * @returns Whether or not the provided packageJson has been published to NPM.
 */
export function isPackageJsonPublished(packageJson: PackageJson): boolean {
  let result = false;

  const packageName: string | undefined = packageJson.name;
  const packageVersion: string | undefined = packageJson.version;
  if (packageName && packageVersion) {
    const publishedVersions: string[] | undefined = npmView({ packageName }).versions;
    result = contains(publishedVersions, packageVersion);
  }

  return result;
}

/**
 * An individual depdendency reference within a PackageLockJson object.
 */
export interface PackageLockDependency {
  version: string;
  resolved: string;
  integrity: string;
  dev?: boolean;
  requires?: StringMap<string>;
}

/**
 * An interface describing the properties in a package-lock.json file object.
 */
export interface PackageLockJson {
  name: string;
  version: string;
  lockfileVersion: number;
  requires: boolean;
  dependencies: StringMap<PackageLockDependency>;
}

export function removePackageLockJsonDependencies(packageLockJson: PackageLockJson, ...dependenciesToRemove: string[]): void {
  if (packageLockJson && dependenciesToRemove && dependenciesToRemove.length > 0) {
    for (const dependencyToRemove of dependenciesToRemove) {
      delete packageLockJson.dependencies[dependencyToRemove];
    }
  }
}

/**
 * An interface describing the properties in a package.json file object.
 */
export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  license?: string;
  author?: {
    name?: string;
    email?: string;
  };
  dependencies?: StringMap<string>;
  devDependencies?: StringMap<string>;
  scripts?: StringMap<string>;
}