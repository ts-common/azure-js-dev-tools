import path from "path";
import { PackageFolder, getPackageJsonFilePath, getThisRepositoryFolderPath } from "./dependencies";
import { getChildDirectories, pathExists } from "../common";

const repositoryRoot: string = getThisRepositoryFolderPath();

async function findAllSubprojects(repositoryRoot: string): Promise<PackageFolder[]> {
  const result: PackageFolder[] = [];
  const childDirectories: string[] = await getChildDirectories(repositoryRoot);
  for (const dir of childDirectories) {
    if (dir.includes("node_modules")) {
      continue;
    }

    if (await pathExists(getPackageJsonFilePath(dir))) {
      const isLernaPackage = await pathExists(path.resolve(dir, "lerna.json"));
      const packageFolder: PackageFolder = {
        folderPath: dir,
        isLernaPackage: isLernaPackage
      };
      result.push(packageFolder);
    }
  }

  return result;
}

export const packageFolders: PackageFolder[] = [
  {
    folderPath: repositoryRoot
  }
];