/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import path from "path";
import { PackageFolder, getPackageJsonFilePath, getThisRepositoryFolderPath } from "./dependencies";
import * as fssync from "fs";
import { getChildDirectoriesSync } from "../filesystem";

const directoriesToIgnore = [ ".git", "bin", "node_modules", "obj", "tmp" ];

const repositoryRoot: string = getThisRepositoryFolderPath();
console.log(`Project path: ${repositoryRoot}`);

export function findAllSubprojects(rootDirectory: string): PackageFolder[] {
  function traverse(parentDir: string, result: PackageFolder[], isParentLernaPackage: boolean) {
    const packageFolderData = getPackageFolder(parentDir, isParentLernaPackage);
    if (packageFolderData) {
      result.push(packageFolderData.packageFolder);
    }

    const childDirectories: string[] = getChildDirectoriesSync(parentDir);
    for (const childDir of childDirectories) {
      if (directoriesToIgnore.includes(childDir)) {
        continue;
      }

      const isLernaPackage = isParentLernaPackage || (packageFolderData && packageFolderData.lernaRootPackage) || false;
      const childPath = path.resolve(parentDir, childDir);
      traverse(childPath, result, isLernaPackage);
    }
  }

  const result: PackageFolder[] = [];
  traverse(rootDirectory, result, false);
  return result;
}

function getPackageFolder(directory: string, isParentLernaPackage: boolean): { packageFolder: PackageFolder, lernaRootPackage: boolean } | undefined {
  if (!fssync.existsSync(getPackageJsonFilePath(directory))) {
    return undefined;
  }

  const lernaRootPackage = fssync.existsSync(path.resolve(directory, "lerna.json"));
  const packageFolder: PackageFolder = {
    folderPath: directory,
    isLernaPackage: isParentLernaPackage
  };

  return { packageFolder, lernaRootPackage };
}

export const packageFolders: PackageFolder[] = findAllSubprojects(repositoryRoot);
