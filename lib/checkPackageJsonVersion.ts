import { findPackageJsonFileSync, isPackageJsonPublished, PackageJson, readPackageJsonFileSync } from "./packageJson";

function checkPackageJsonVersion(startPath: string): number {
  let exitCode: number;
  console.log(`Looking for package.json file starting at "${startPath}"...`);
  const packageJsonFilePath: string | undefined = findPackageJsonFileSync(startPath);
  if (!packageJsonFilePath) {
    console.error(`Could not find a package.json file at "${startPath}" or in any of its parent folders.`);
    exitCode = 1;
  } else {
    console.log(`Found a package.json file at "${packageJsonFilePath}".`);
    const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
    if (isPackageJsonPublished(packageJson)) {
      console.error(`A package with the name "${packageJson.name}" and the version "${packageJson.version}" already exists in NPM.`);
      exitCode = 2;
    } else {
      console.log(`No package exists yet with the name "${packageJson.name}" and the version "${packageJson.version}".`);
      exitCode = 0;
    }
  }
  return exitCode;
}

process.exit(checkPackageJsonVersion(__dirname));