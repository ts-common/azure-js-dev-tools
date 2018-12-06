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

function findAllSubprojects(repositoryRoot: string): PackageFolder[] {
  const result: PackageFolder[] = [];
  const childDirectories: string[] = getChildDirectoriesSync(repositoryRoot);
  for (const dir of childDirectories) {
    if (dir.includes("node_modules")) {
      continue;
    }

    if (fssync.existsSync(getPackageJsonFilePath(dir))) {
      const isLernaPackage = fssync.existsSync(path.resolve(dir, "lerna.json"));
      const packageFolder: PackageFolder = {
        folderPath: dir,
        isLernaPackage: isLernaPackage
      };
      result.push(packageFolder);
    }
  }

  return result;
}

export const packageFolders: PackageFolder[] = findAllSubprojects(repositoryRoot);
