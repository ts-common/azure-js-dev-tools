import * as os from "os";
import { RunOptions, RunResult, runSync } from "./run";
import { StringMap } from "./common";

/**
 * Run a NPM command.
 * @param args The arguments to the NPM command.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npm(args: string | string[], options?: RunOptions): RunResult {
  const npmExecutable: string = (os.platform() === "win32" ? "npm.cmd" : "npm");
  return runSync(npmExecutable, args, options);
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
 * Run "npm install" from the optional packageFolderPath, or if packageFolderPath isn't specified,
 * then run "npm install" from the current directory.
 * @param options The optional arguments that can be added to the NPM command.
 * @returns The result of running the NPM command.
 */
export function npmInstall(options?: RunOptions): RunResult {
  return npm("install", options);
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
  public install(options?: RunOptions): RunResult {
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