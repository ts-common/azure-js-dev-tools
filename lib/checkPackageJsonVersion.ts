import { findPackageJsonFileSync, isPackageJsonPublished, PackageJson, readPackageJsonFileSync } from "./packageJson";

function checkPackageJsonVersion(startPath: string): boolean {
  let result = false;
  console.log(`Looking for package.json file starting at "${startPath}"...`);
  const packageJsonFilePath: string | undefined = findPackageJsonFileSync(startPath);
  if (!packageJsonFilePath) {
    throw new Error(`Could not find a package.json file at "${startPath}" or in any of its parent folders.`);
  } else {
    console.log(`Found a package.json file at "${packageJsonFilePath}".`);
    const packageJson: PackageJson = readPackageJsonFileSync(packageJsonFilePath);
    if (isPackageJsonPublished(packageJson)) {
      throw new Error(`A package with the name "${packageJson.name}" and the version "${packageJson.version}" already exists in NPM.`);
    } else {
      console.log(`No package exists yet with the name "${packageJson.name}" and the version "${packageJson.version}".`);
      result = true;
    }
  }
  return result;
}

checkPackageJsonVersion(__dirname);