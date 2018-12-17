import { checkPackageJsonVersion } from "../lib";

process.exitCode = checkPackageJsonVersion(__dirname);