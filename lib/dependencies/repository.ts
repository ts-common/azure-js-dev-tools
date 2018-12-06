/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import path from "path";
import { PackageFolder, getPackageJsonFilePath, getThisRepositoryFolderPath } from "./dependencies";
import * as fssync from "fs";
import { getChildDirectoriesSync } from "../filesystem";

const repositoryRoot: string = getThisRepositoryFolderPath();

export function findAllSubprojects(rootDirectory: string): PackageFolder[] {
  function traverse(parentDir: string, result: PackageFolder[], isParentLernaPackage: boolean) {
    const packageFolder = getPackageFolder(parentDir, isParentLernaPackage);
    if (packageFolder) {
      result.push(packageFolder);
    }

    const childDirectories: string[] = getChildDirectoriesSync(parentDir);
    for (const childDir of childDirectories) {
      if (childDir.includes("node_modules")) {
        continue;
      }

      const isLernaPackage = isParentLernaPackage || (packageFolder && packageFolder.isLernaPackage) || false;
      traverse(path.resolve(parentDir, childDir), result, isLernaPackage);
    }
  }


  const result: PackageFolder[] = [];
  traverse(rootDirectory, result, false);
  return result;
}

function getPackageFolder(directory: string, isParentLernaPackage: boolean): PackageFolder | undefined {
  if (!fssync.existsSync(getPackageJsonFilePath(directory))) {
    return undefined;
  }

  const isLernaPackage = fssync.existsSync(path.resolve(directory, "lerna.json"));
  const packageFolder: PackageFolder = {
    folderPath: directory,
    isLernaPackage: isParentLernaPackage || isLernaPackage
  };

  return packageFolder;
}

export const packageFolders: PackageFolder[] = findAllSubprojects(repositoryRoot);
