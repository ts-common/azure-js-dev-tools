import * as fs from "fs";
import { joinPath, getParentFolderPath } from "./path";

/**
 * Get whether or not a file entry (file or folder) exists at the provided entryPath.
 * @param entryPath The path to the file entry to check.
 * @returns Whether or not a file entry (file or folder) exists at the provided entryPath.
 */
export function entryExistsSync(entryPath: string): boolean {
  return fs.existsSync(entryPath);
}

/**
 * Check whether or not a symbolic link exists at the provided path.
 * @param path The path to check.
 * @returns Whether or not a symbolic link exists at the provided path.
 */
export function symbolicLinkExistsSync(path: string): boolean {
  return entryExistsSync(path) && fs.lstatSync(path).isSymbolicLink();
}


/**
 * Check whether or not a file exists at the provided filePath.
 * @param filePath The path to check.
 * @returns Whether or not a file exists at the provided filePath.
 */
export function fileExistsSync(filePath: string): boolean {
  return entryExistsSync(filePath) && fs.lstatSync(filePath).isFile();
}

/**
 * Check whether or not a folder exists at the provided folderPath.
 * @param folderPath The path to check.
 * @returns Whether or not a folder exists at the provided folderPath.
 */
export function folderExistsSync(folderPath: string): boolean {
  return entryExistsSync(folderPath) && fs.lstatSync(folderPath).isDirectory();
}

/**
 * Create a folder at the provided folderPath. If the folder is successfully created, then true will
 * be returned. If the folder already exists, then false will be returned.
 * @param folderPath The path to create a folder at.
 */
export function createFolder(folderPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.mkdir(folderPath, (error: Error) => {
      if (!error) {
        resolve(true);
      } else if (error.message.indexOf("EEXIST: file already exists") !== -1) {
        resolve(false);
      } else {
        reject(error);
      }
    });
  });
}

function findEntryInPathSync(entryName: string, startFolderPath: string | undefined, condition: (entryPath: string) => boolean): string | undefined {
  let result: string | undefined;
  let folderPath: string = startFolderPath || process.cwd();
  while (folderPath) {
    const possibleResult: string = joinPath(folderPath, entryName);
    if (condition(possibleResult)) {
      result = possibleResult;
      break;
    } else {
      folderPath = getParentFolderPath(folderPath);
    }
  }
  return result;
}

/**
 * Find the closest file with the provided name by searching the immediate child folders of the
 * folder at the provided startFolderPath. If no file is found with the provided fileName, then the
 * search will move up to the parent folder of the startFolderPath. This will continue until either
 * the file is found, or the folder being searched does not have a parent folder (if it is a root
 * folder).
 * @param fileName The name of the file to look for.
 * @param startFolderPath The path to the folder where the search will begin.
 * @returns The path to the closest file with the provided fileName, or undefined if no file could
 * be found.
 */
export function findFileInPathSync(fileName: string, startFolderPath?: string): string | undefined {
  return findEntryInPathSync(fileName, startFolderPath, fileExistsSync);
}

/**
 * Find the closest folder with the provided name by searching the immediate child folders of the
 * folder at the provided startFolderPath. If no folder is found with the provided folderName, then
 * the search will move up to the parent folder of the startFolderPath. This will continue until
 * either the folder is found, or the folder being searched does not have a parent folder (it is a
 * root folder).
 * @param folderName The name of the folder to look for.
 * @param startFolderPath The path to the folder where the search will begin.
 * @returns The path to the closest folder with the provided folderName, or undefined if no folder
 * could be found.
 */
export function findFolderInPathSync(folderName: string, startFolderPath?: string): string | undefined {
  return findEntryInPathSync(folderName, startFolderPath, folderExistsSync);
}

/**
 * Optional parameters to the getChildFilePaths() function.
 */
export interface GetChildEntriesOptions {
  /**
   * Whether or not to search sub-folders of the provided folderPath.
   */
  recursive?: boolean;

  /**
   * A condition that a child entry path must pass before it will be added to the result.
   */
  condition?: (entryPath: string) => boolean;

  /**
   * A condition that a child file path must pass before it will be added to the result.
   */
  fileCondition?: (filePath: string) => boolean;

  /**
   * A condition that a child folder path must pass before it will be added to the result.
   */
  folderCondition?: (folderPath: string) => boolean;

  /**
   * The array where the matching child folder paths will be added.
   */
  result?: string[];
}

/**
 * Get the child entries of the folder at the provided folderPath. If the provided folder doesn't
 * exist, then undefined will be returned.
 * @param folderPath The path to the folder.
 * @returns The paths to the child entries of the folder at the provided folder path, or undefined
 * if the folder at the provided folder path doesn't exist.
 */
export function getChildEntryPaths(folderPath: string, options?: GetChildEntriesOptions): string[] | undefined {
  let result: string[] | undefined;
  if (folderExistsSync(folderPath)) {
    result = (options && options.result) || [];
    const entryNames: string[] = fs.readdirSync(folderPath);
    const condition = options && options.condition;
    const fileCondition = options && options.fileCondition;
    const folderCondition = options && options.folderCondition;
    for (const entryName of entryNames) {
      const entryPath: string = joinPath(folderPath, entryName);
      if ((!condition || condition(entryPath)) &&
        (!fileCondition || !fileExistsSync(entryPath) || fileCondition(entryPath)) &&
        (!folderCondition || !folderExistsSync(entryPath) || folderCondition(entryPath))) {
        result.push(entryPath);
      }

      if ((options && options.recursive) && folderExistsSync(entryPath) && (!folderCondition || folderCondition(entryPath))) {
        options.result = result;
        getChildEntryPaths(entryPath, options);
      }
    }
  }
  return result;
}

/**
 * Get the child folders of the folder at the provided folderPath. If the provided folder doesn't
 * exist, then undefined will be returned.
 * @param folderPath The path to the folder.
 * @returns The paths to the child folders of the folder at the provided folder path, or undefined
 * if the folder at the provided folder path doesn't exist.
 */
export function getChildFolderPaths(folderPath: string, options?: GetChildEntriesOptions): string[] | undefined {
  return getChildEntryPaths(folderPath, {
    ...options,
    condition: (entryPath: string) => {
      let result: boolean;
      try {
        result = folderExistsSync(entryPath) && (!options || !options.condition || options.condition(entryPath));
      } catch (error) {
        result = false;
      }
      return result;
    }
  });
}

/**
 * Get the child folders of the folder at the provided folderPath. If the provided folder doesn't
 * exist, then undefined will be returned.
 * @param folderPath The path to the folder.
 * @returns The paths to the child folders of the folder at the provided folder path, or undefined
 * if the folder at the provided folder path doesn't exist.
 */
export function getChildFilePaths(folderPath: string, options?: GetChildEntriesOptions): string[] | undefined {
  return getChildEntryPaths(folderPath, {
    ...options,
    condition: (entryPath: string) => fileExistsSync(entryPath) && (!options || !options.condition || options.condition(entryPath))
  });
}

/**
 * Read the contents of the provided file.
 * @param filePath The path to the file to read.
 */
export function readFileContents(filePath: string): string | undefined {
  return fs.readFileSync(filePath, { encoding: "utf8" });
}

/**
 * Write the provided contents to the file at the provided filePath.
 * @param filePath The path to the file to write.
 * @param contents The contents to write to the file.
 */
export function writeFileContents(filePath: string, contents: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, contents, (error: NodeJS.ErrnoException) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function deleteEntry(path: string): void {
  if (folderExistsSync(path)) {
    deleteFolder(path);
  } else {
    deleteFile(path);
  }
}

/**
 * Delete the file at the provided file path.
 * @param {string} filePath The path to the file to delete.
 */
export function deleteFile(filePath: string): void {
  fs.unlinkSync(filePath);
}

/**
 * Delete each of the provided file paths.
 * @param filePaths The file paths that should be deleted.
 */
export function deleteFiles(...filePaths: string[]): void {
  if (filePaths && filePaths.length > 0) {
    for (const filePath of filePaths) {
      deleteFile(filePath);
    }
  }
}

/**
 * Delete the folder at the provided folder path.
 * @param {string} folderPath The path to the folder to delete.
 */
export function deleteFolder(folderPath: string): void {
  const childEntryPaths: string[] | undefined = getChildEntryPaths(folderPath);
  if (childEntryPaths) {
    let attempt = 1;
    const maxAttempts = 3;
    let success: boolean | undefined;
    while (attempt <= maxAttempts && success === undefined) {
      try {
        childEntryPaths.forEach(deleteEntry);
        fs.rmdirSync(folderPath);
        success = true;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
      }
      ++attempt;
    }
  }
}
