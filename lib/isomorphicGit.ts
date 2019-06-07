import * as isomorphicGit from "isomorphic-git";
import { Git } from "./git";
import { isRooted, joinPath, resolvePath } from "./path";

/**
 * A set of interfaces and types used by the IsomorphicGit class.
 */
export namespace IsomorphicGit {
  /**
   * The options that can be passed to an IsomorphicGit class or operation.
   */
  export interface Options {
    /**
     * The instance of isomorphic-git to use to run the Git command.
     */
    isomorphicGit?: typeof isomorphicGit;
    /**
     * The path to the git repository where the Git command will be run.
     */
    executionFolderPath?: string;
  }

  /**
   * Options that can be passed to `git clone`.
   */
  export interface CloneOptions extends Git.CloneOptions, Options {
  }

  /**
   * The options for determining how pushing the current branch will run.
   */
  export interface PushOptions extends Git.PushOptions, Options {
  }
}

/**
 * An implementation of the Git interface that uses the isomorphic-git package.
 */
export class IsomorphicGit implements Git {
  private readonly isomorphicGit: typeof isomorphicGit;
  private readonly executionFolderPath: string;

  /**
   * Create a new instance of IsomorphicGit.
   */
  constructor(options: IsomorphicGit.Options = {}) {
    if (!options.isomorphicGit) {
      options.isomorphicGit = isomorphicGit;
      options.isomorphicGit.plugins.set("fs", require("fs"));
    }
    this.isomorphicGit = options.isomorphicGit;

    if (!options.executionFolderPath) {
      this.executionFolderPath = process.cwd();
    } else {
      if (!isRooted(options.executionFolderPath)) {
        options.executionFolderPath = resolvePath(options.executionFolderPath);
      }
      this.executionFolderPath = options.executionFolderPath;
    }
  }

  private getExecutionFolderPath(options: IsomorphicGit.Options): string {
    return options.executionFolderPath || this.executionFolderPath;
  }

  public async currentCommitSha(options: IsomorphicGit.Options = {}): Promise<Git.CurrentCommitShaResult> {
    const runResult: isomorphicGit.CommitDescription[] = await this.isomorphicGit.log({
      dir: this.getExecutionFolderPath(options),
      depth: 1,
    });
    const result: Git.CurrentCommitShaResult = {
      currentCommitSha: runResult[0].oid,
    };
    return result;
  }

  public fetch(options: IsomorphicGit.Options = {}): Promise<unknown> {
    return this.isomorphicGit.fetch({
      dir: this.getExecutionFolderPath(options),
    });
  }

  public mergeOriginMaster(options: IsomorphicGit.Options = {}): Promise<unknown> {
    return this.isomorphicGit.merge({
      dir: this.getExecutionFolderPath(options),
      theirs: "remotes/origin/master",
    });
  }

  public clone(gitUri: string, options: IsomorphicGit.CloneOptions = {}): Promise<unknown> {
    let cloneFolderPath: string = this.getExecutionFolderPath(options);
    if (options.directory) {
      if (isRooted(options.directory)) {
        cloneFolderPath = options.directory;
      } else {
        cloneFolderPath = joinPath(cloneFolderPath, options.directory);
      }
    }
    return this.isomorphicGit.clone({
      dir: cloneFolderPath,
      url: gitUri,
      remote: options.origin,
      ref: options.branch,
      depth: options.depth,
    });
  }

  public checkout(refId: string, options: IsomorphicGit.Options = {}): Promise<unknown> {
    return this.isomorphicGit.checkout({
      dir: this.getExecutionFolderPath(options),
      ref: refId,
    });
  }

  public pull(options: IsomorphicGit.Options = {}): Promise<unknown> {
    return this.isomorphicGit.pull({
      dir: this.getExecutionFolderPath(options),
    });
  }

  public async push(options: IsomorphicGit.PushOptions = {}): Promise<unknown> {
    const branchName: string = options.branchName || await this.currentBranch();
    return this.isomorphicGit.push({
      dir: this.getExecutionFolderPath(options),
      ref: branchName,
      remoteRef: branchName,
    });
  }

  public add(_filePaths: string | string[]): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  public addAll(): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  public commit(_commitMessages: string | string[]): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  public deleteLocalBranch(_branchName: string): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  public createLocalBranch(_branchName: string): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  public deleteRemoteBranch(_branchName: string, _options: Git.DeleteRemoteBranchOptions = {}): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  public diff(_options: Git.DiffOptions = {}): Promise<Git.DiffResult> {
    throw new Error("Method not implemented.");
  }

  public localBranches(): Promise<Git.LocalBranchesResult> {
    throw new Error("Method not implemented.");
  }

  public currentBranch(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public remoteBranches(): Promise<Git.RemoteBranchesResult> {
    throw new Error("Method not implemented.");
  }

  public status(): Promise<Git.StatusResult> {
    throw new Error("Method not implemented.");
  }

  public getConfigurationValue(_configurationValueName: string): Promise<Git.GetConfigurationValueResult> {
    throw new Error("Method not implemented.");
  }

  public getRepositoryUrl(): Promise<string | undefined> {
    throw new Error("Method not implemented.");
  }

  public resetAll(): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
}
