import * as yargs from "yargs";
import { Logger, getAzureDevOpsLogger, getConsoleLogger, checkPackageJsonVersion } from "../lib";

const logger: Logger = yargs.argv["azure-devops"] ? getAzureDevOpsLogger() : getConsoleLogger();
process.exitCode = checkPackageJsonVersion(__dirname, logger);