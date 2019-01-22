import * as path from "path";

/**
 * Join the provided path segments using a forward slash (/) as a path separator.
 * @param pathSegments The path segments to resolve.
 * @returns The resolved path.
 */
export function joinPath(...pathSegments: string[]): string {
  return normalize(path.posix.join(...pathSegments));
}

/**
 * Resolve the provided path segments using a forward slash (/) as a path separator.
 * @param pathSegments The path segments to resolve.
 * @returns The resolved path.
 */
export function resolvePath(...pathSegments: string[]): string {
  return normalize(path.posix.resolve(...pathSegments));
}

/**
 * Replace all of the backslashes (\) with forward slashes (/).
 * @param pathString The path to normalize.
 * @returns The normalized path.
 */
export function normalize(pathString: string): string {
  return pathString && pathString.replace(/\\/g, "/");
}

/**
 * Get the root path of the provided path string. If the provided path string is relative (not
 * rooted), then undefined will be returned.
 * @param pathString The path to get the root of.
 */
export function getRootPath(pathString: string): string | undefined {
  let result: string | undefined;
  if (pathString) {
    result = path.parse(pathString).root || undefined;
  }
  return result;
}

/**
 * Check whether or not the provided pathString is rooted (absolute).
 * @param pathString The path to check.
 * @returns Whether or not the provided pathString is rooted (absolute).
 */
export function isRooted(pathString: string): boolean {
  return !!getRootPath(pathString);
}

/**
 * Get the name/last segment of the provided path string.
 * @param pathString The path to get the name/last segment of.
 * @returns The name/last segment of the provided path string.
 */
export function getName(pathString: string): string {
  return path.basename(pathString);
}

/**
 * Get the path to the parent folder of the provided path string.
 * @param pathString The path to the get the parent folder path of.
 * @returns The path to the parent folder of the provided path string.
 */
export function getParentFolderPath(pathString: string): string {
  return path.dirname(pathString);
}
