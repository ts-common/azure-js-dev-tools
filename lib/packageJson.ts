import * as fs from "fs";
import { Version } from "./version";

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
  dependencies?: { [dependencyName: string]: string };
  devDependencies?: { [dependencyName: string]: string };
  scripts?: { [scriptName: string]: string };
}