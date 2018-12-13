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
 * Check whether or not the provided pathString is rooted (absolute).
 * @param pathString The path to check.
 * @returns Whether or not the provided pathString is rooted (absolute).
 */
export function isRooted(pathString: string): boolean {
  return path.win32.isAbsolute(pathString) || path.posix.isAbsolute(pathString);
}