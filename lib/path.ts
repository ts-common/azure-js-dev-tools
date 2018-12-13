import * as path from "path";

/**
 * Resolve the provided path segments using a forward slash (/) as a path separator.
 * @param pathSegments The path segments to resolve.
 * @returns The resolved path.
 */
export function resolvePath(...pathSegments: string[]): string {
  return path.posix.resolve(...pathSegments);
}
