import * as os from "os";
import { StringMap } from "./common";
import { RunOptions, RunResult, runSync } from "./run";

/**
 * Get the executable that will be used to run NPM commands.
 * @param osPlatform The platform that this script is being run on.
 */
export function npmExecutable(osPlatform?: string): string {
  if (!osPlatform) {
    osPlatform = os.platform();
  }
  return osPlatform === "win32" ? "npm.cmd" : "npm";
}

/**
 * Run a NPM command.
 * @param args The arguments to the NPM command.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npm(args: string | string[], options?: RunOptions): RunResult {
  const npmCommand: string = npmExecutable();
  return runSync(npmCommand, args, options);
}

/**
 * Run a script specified in the package.json file.
 * @param args The arguments for the NPM run command.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npmRun(args: string | string[], options?: RunOptions): RunResult {
  if (typeof args === "string") {
    args = "run " + args;
  } else {
    args.unshift("run");
  }
  return npm(args, options);
}

/**
 * Run "npm pack" from the optional packageFolderPath.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npmPack(options?: RunOptions): RunResult {
  return npm("pack", options);
}

/**
 * Options that can be passed to "npm install" commands.
 */
export interface NPMInstallOptions extends RunOptions {
  /**
   * The source of the package to install. This can be an NPM package's name (with or without the
   * package version), a Git URL, a path to a tarball, or a path to a folder.
   */
  installSource?: string;
  /**
   * Whether or not to update the execution folder path's package.json file with this installation.
   * If this property is undefined, then the package.json won't be updated. If this property is
   * defined, then it's value will be appended to the `--save` command-line argument name. For
   * example, if you specified `save: "prod"`, then the command-line would add a `--save-prod`
   * argument.
   */
  save?: string;
}

/**
 * Run "npm install" from the optional packageFolderPath, or if packageFolderPath isn't specified,
 * then run "npm install" from the current directory.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npmInstall(options?: NPMInstallOptions): RunResult {
  options = options || {};
  let command = "install";
  if (options.installSource) {
    command += ` ${options.installSource}`;
  }
  if (options.save) {
    command += " --save";
    if (!options.save.startsWith("-")) {
      command += "-";
    }
    command += options.save;
  }
  return npm(command, options);
}

/**
 * The optional arguments that can be passed to npmView().
 */
export interface NPMViewOptions extends RunOptions {
  /**
   * The name of the package to get details for. If this is undefined or empty, the package in the
   * executionFolderPath will be used instead.
   */
  packageName?: string;
}

/**
 * The result of running a npm view command.
 */
export interface NPMViewResult extends RunResult {
  _id?: string;
  _rev?: string;
  name?: string;
  description?: string;
  "dist-tags"?: StringMap<string>;
  versions?: string[];
  maintainers?: string[];
  time?: StringMap<string>;
  homepage?: string;
  keywords?: string[];
  repository?: {
    type: string;
    url: string;
  };
  author?: string;
  bugs?: {
    url: string;
  };
  readmeFilename?: string;
  license?: string;
  _etag?: string;
  _lastModified?: string;
  version?: string;
  dependencies?: StringMap<string>;
  main?: string;
  types?: string;
  _npmVersion?: string;
  _nodeVersion?: string;
  _npmUser?: string;
  dist?: {
    integrity: string;
    shasum: string;
    tarball: string;
    fileCount: number;
    unpackedSize: number;
    "npm-signature": string;
  };
  _hasShrinkwrap?: boolean;
  error?: {
    code: string;
    summary: string;
    detail: string;
  };
}

/**
 * Run "npm view". If a packageName is provided in the options, then it will be used, otherwise the
 * package in the folder specified in the executionFolderPath will be used.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npmView(options?: NPMViewOptions): NPMViewResult {
  const args: string[] = ["view"];
  if (options && options.packageName) {
    args.push(options.packageName);
  }
  args.push("--json");
  const commandResult: RunResult = npm(args, options);
  const npmViewResponse: any = JSON.parse(commandResult.stdout.trim());
  return {
    commandResult,
    ...npmViewResponse
  };
}

/**
 * A scope object that specifies a set of default options that will be used with any NPM command run
 * by this scope.
 */
export class NPMScope {
  constructor(private defaultOptions: RunOptions) {
  }

  /**
   * Run a NPM command.
   * @param args The arguments to the NPM command.
   * @param options The optional arguments that can be added to the NPM command.
   * @returns The result of running the NPM command.
   */
  public npm(args: string | string[], options?: RunOptions): RunResult {
    return npm(args, {
      ...this.defaultOptions,
      ...options
    });
  }

  /**
   * Run a script specified in the package.json file.
   * @param args The arguments for the NPM run command.
   * @param options The optional arguments that can be added to the NPM command.
   * @returns The result of running the NPM command.
   */
  public run(args: string | string[], options?: RunOptions): RunResult {
    return npmRun(args, {
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Run "npm install" from the optional packageFolderPath, or if packageFolderPath isn't specified,
   * then run "npm install" from the current directory.
   * @param options The optional arguments that can be added to the NPM command.
   * @returns The result of running the NPM command.
   */
  public install(options?: NPMInstallOptions): RunResult {
    return npmInstall({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Run "npm view". If a packageName is provided in the options, then it will be used, otherwise the
   * package in the folder specified in the executionFolderPath will be used.
   * @param options The optional arguments that can be added to the NPM command.
   * @returns The result of running the NPM command.
   */
  public view(options?: NPMViewOptions): NPMViewResult {
    return npmView({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Run "npm pack" from the optional packageFolderPath.
   * @param options The optional arguments that can be added to the NPM command.
   * @returns The result of running the NPM command.
   */
  public pack(options?: RunOptions): RunResult {
    return npmPack({
      ...this.defaultOptions,
      ...options
    });
  }
}
