import * as os from "os";
import { RunOptions, RunResult, runSync } from "./run";

export function runNPM(args: string | string[], options?: RunOptions): RunResult {
  const npmExecutable: string = (os.platform() === "win32" ? "npm.cmd" : "npm");
  return runSync(npmExecutable, args, options);
}

/**
 * Run "npm install" from the optional packageFolderPath, or if packageFolderPath isn't specified,
 * then run "npm install" from the current directory.
 */
function install(options?: RunOptions): RunResult {
  return runNPM("install", options);
}

export interface ViewResult extends RunResult {
  _id?: string;
  _rev?: string;
  name?: string;
  description?: string;
  "dist-tags"?: { [tag: string]: string };
  versions?: string[];
  maintainers?: string[];
  time?: { [version: string]: string };
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
  dependencies?: { [dependency: string]: string };
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

function view(options?: RunOptions): ViewResult {
  const commandResult: RunResult = runNPM(["view", "--json"], options);
  const npmViewResponse: any = JSON.parse(commandResult.stdout.trim());
  return {
    commandResult,
    ...npmViewResponse
  };
}

export class NPMScope {
  constructor(private defaultOptions: RunOptions) {
  }

  /**
   * Run the provided NPM command within the context of this NPMFolder's folder path.
   */
  public run(args: string | string[], options?: RunOptions): RunResult {
    return runNPM(args, {
      ...this.defaultOptions,
      ...options,
    });
  }

  public install(options?: RunOptions): RunResult {
    return install({
      ...this.defaultOptions,
      ...options,
    });
  }

  public view(options?: RunOptions): ViewResult {
    return view({
      ...this.defaultOptions,
      ...options,
    });
  }
}