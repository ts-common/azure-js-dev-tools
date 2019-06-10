/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { where } from "./arrays";
import { getLines } from "./common";
import { joinPath } from "./path";
import { run, RunOptions, RunResult } from "./run";

/**
 * A set of interfaces and types that relate to the Git interface.
 */
export namespace Git {
  /**
   * Credentials that will authenticate the current application with a remote endpoint.
   */
  export interface Credentials {
    /**
     * The user to authenticate with the remote endpoint.
     */
    username: string;
    /**
     * The access token that will authenticate this user to the remote endpoint.
     */
    accessToken: string;
  }

  /**
   * The details of the person who authored the changes of the commit.
   */
  export interface Author {
    /**
     * The name of the commit author.
     */
    name?: string;
    /**
     * The e-mail address of the commit author.
     */
    email?: string;
  }

  /**
   * Options that can be passed to a Git implementation's constructor.
   */
  export interface ConstructorOptions {
    /**
     * The credentials that will be used to interact with remote endpoints.
     */
    credentials?: Credentials;
    /**
     * The details of the entity who may make commits.
     */
    author?: Author;
  }

  /**
   * The result of getting the current commit SHA.
   */
  export interface CurrentCommitShaResult {
    /**
     * The SHA of the current commit.
     */
    currentCommitSha?: string;
  }

  /**
   * Options that can be passed to `git clone`.
   */
  export interface CloneOptions {
    /**
     * Instead of using the remote name "origin" to keep track of the upstream repository, use this value.
     */
    origin?: string;
    /**
     * Instead of pointing the newly created HEAD to the branch pointed to by the cloned repository’s
     * HEAD, point to this value's branch instead. In a non-bare repository, this is the branch that
     * will be checked out. This value can also take tags and detaches the HEAD at that commit in the
     * resulting repository.
     */
    branch?: string;
    /**
     * Create a shallow clone with a history truncated to the specified number of commits. Implies
     * "single-branch"=true unless "no-single-branch"=true is given to fetch the histories near the
     * tips of all branches. If you want to clone submodules shallowly, also use
     * "shallow-submodules"=true.
     */
    depth?: number;
    /**
     * The name of a new directory to clone into. The "humanish" part of the source repository is used
     * if no directory is explicitly given (repo for /path/to/repo.git and foo for host.xz:foo/.git).
     * Cloning into an existing directory is only allowed if the directory is empty.
     */
    directory?: string;
  }

  /**
   * The options for determining how pushing the current branch will run.
   */
  export interface PushOptions {
    /**
     * The name of the branch to push.
     */
    branchName?: string;
    /**
     * The credentials that will be used to push the changes.
     */
    credentials?: Credentials;
  }

  /**
   * The options for determining how this command will run.
   */
  export interface DeleteRemoteBranchOptions {
    /**
     * The name of the tracked remote repository. Defaults to "origin".
     */
    remoteName?: string;
  }

  /**
   * Options that can be passed to `git diff`.
   */
  export interface DiffOptions {
    /**
     * The unique identifier for a commit to compare. If this is specified but commit2 is not
     * specified, then this commit will be compared against HEAD.
     */
    commit1?: string;
    /**
     * The unique identifier for a commit to compare. If this is specified but commit1 is not
     * specified, then this commit will be compared against HEAD.
     */
    commit2?: string;
    /**
     * Show only the names of changed files.
     */
    nameOnly?: boolean;
    /**
     * Whether or not to ignore whitespace changes in the diff, and if provided, to what extent should
     * whitespace changes be ignored.
     */
    ignoreSpace?: "at-eol" | "change" | "all";
    /**
     * Whether or not to show all changes that are staged.
     */
    staged?: boolean;
  }

  /**
   * The result of a "git diff" command.
   */
  export interface DiffResult {
    /**
     * The files that are reported as being changed by the diff command.
     */
    filesChanged: string[];
  }

  /**
   * The result of getting the local branches in the repository.
   */
  export interface LocalBranchesResult {
    /**
     * The local branches in the repository.
     */
    localBranches: string[];
    /**
     * The current branch that is checked out.
     */
    currentBranch: string;
  }

  /**
   * The return type of getting a remote repository's branches.
   */
  export interface RemoteBranchesResult {
    /**
     * The branches in remote repositories.
     */
    remoteBranches: GitRemoteBranch[];
  }

  /**
   * The result of getting the status of the current branch.
   */
  export interface StatusResult {
    /**
     * The current local branch.
     */
    localBranch?: string;
    /**
     * The remote tracking branch for the current local branch.
     */
    remoteBranch?: string;
    /**
     * Whether or not the current local branch has uncommitted changes.
     */
    hasUncommittedChanges: boolean;
    /**
     * Staged, not staged, and untracked files that have either been modified, added, or deleted.
     */
    modifiedFiles: string[];
    /**
     * Files that have been modified and staged.
     */
    stagedModifiedFiles: string[];
    /**
     * Files that have been deleted and staged.
     */
    stagedDeletedFiles: string[];
    /**
     * Files that have been modified but not staged yet.
     */
    notStagedModifiedFiles: string[];
    /**
     * Files that have been deleted but not staged yet.
     */
    notStagedDeletedFiles: string[];
    /**
     * Files that don't currently exist in the repository.
     */
    untrackedFiles: string[];
  }

  /**
   * The result of getting a git configuration value.
   */
  export interface GetConfigurationValueResult {
    /**
     * The requested configuration value or undefined if the value was not found.
     */
    configurationValue?: string;
  }

  /**
   * The options that can be passed to a `git commit` operation.
   */
  export interface CommitOptions {
    /**
     * The details of the person who authored the changes of the commit.
     */
    author?: Author;
  }
}

/**
 * An interface for interacting with Git repositories.
 */
export interface Git {
  /**
   * Get the SHA of the currently checked out commit.
   */
  currentCommitSha(): Promise<Git.CurrentCommitShaResult>;

  /**
   * Download objects and refs from another repository.
   */
  fetch(): Promise<unknown>;

  /**
   * Merge the registed origin remote repository's master branch into the current branch.
   */
  mergeOriginMaster(): Promise<unknown>;

  /**
   * Clone the repository with the provided URI.
   * @param gitUri The repository URI to clone.
   * @param options The options that can be passed to "git clone".
   */
  clone(gitUri: string, options?: Git.CloneOptions): Promise<unknown>;

  /**
   * Checkout the provided git reference (branch, tag, or commit ID) in the repository.
   * @param refId The git reference to checkout.
   */
  checkout(refId: string): Promise<unknown>;

  /**
   * Pull the latest changes for the current branch from the registered remote branch.
   */
  pull(): Promise<unknown>;

  /**
   * Push the current branch to the remote tracked repository.
   * @param options The options for determining how this command will run.
   */
  push(options?: Git.PushOptions): Promise<unknown>;

  /**
   * Add/stage the provided files.
   * @param filePaths The paths to the files to stage.
   */
  add(filePaths: string | string[]): Promise<unknown>;

  /**
   * Add/stage all of the current unstaged files.
   * @param options The options that determine how this command will run.
   */
  addAll(): Promise<unknown>;

  /**
   * Commit the currently staged/added changes to the current branch.
   * @param commitMessages The commit messages to apply to this commit.
   */
  commit(commitMessages: string | string[], options?: Git.CommitOptions): Promise<unknown>;

  /**
   * Delete a local branch.
   * @param branchName The name of the local branch to delete.
   */
  deleteLocalBranch(branchName: string): Promise<unknown>;

  /**
   * Create a new local branch with the provided name.
   * @param branchName The name of the new branch.
   */
  createLocalBranch(branchName: string): Promise<unknown>;

  /**
   * Remote the provided branch from the provided tracked remote repository.
   * @param branchName The name of the remote branch to delete.
   * @param remoteName The name of the tracked remote repository.
   * @param options The options for determining how this command will run.
   */
  deleteRemoteBranch(branchName: string, options?: Git.DeleteRemoteBranchOptions): Promise<unknown>;

  /**
   * Get the diff between two commits.
   * @options The options for determining how this command will run.
   */
  diff(options?: Git.DiffOptions): Promise<Git.DiffResult>;

  /**
   * Get the branches that are local to this repository.
   */
  localBranches(): Promise<Git.LocalBranchesResult>;

  /**
   * Get the branch that the repository is currently on.
   */
  currentBranch(): Promise<string>;

  /**
   * Get the remote branches that this repository clone is aware of.
   */
  remoteBranches(): Promise<Git.RemoteBranchesResult>;

  /**
   * Run "git status".
   */
  status(): Promise<Git.StatusResult>;

  /**
   * Get the configuration value for the provided configuration value name.
   * @param configurationValueName The name of the configuration value to get.
   */
  getConfigurationValue(configurationValueName: string): Promise<Git.GetConfigurationValueResult>;

  /**
   * Get the URL of the current repository.
   * @param options The options that can configure how the command will run.
   */
  getRepositoryUrl(): Promise<string | undefined>;

  /**
   * Unstage all staged files.
   * @param options The options that can configure how the command will run.
   */
  resetAll(): Promise<unknown>;

  /**
   * Get the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @returns The URL associated with the provided remote repository or undefined if the remote name
   * is not found.
   */
  getRemoteUrl(remoteName: string): Promise<string | undefined>;

  /**
   * Set the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @param remoteUrl The URL associated with the provided remote repository.
   */
  setRemoteUrl(remoteName: string, remoteUrl: string): Promise<unknown>;
}

/**
 * A set of interfaces and types that relate to the ExecutableGit class.
 */
export namespace ExecutableGit {
  /**
   * A set of optional properties that can be applied to an ExecutableGit operation.
   */
  export interface Options extends RunOptions {
    /**
     * The file path to the git executable to use to run commands. This can be either a rooted path
     * to the executable, or a relative path that will use the environment's PATH variable to
     * resolve the executable's location.
     */
    gitFilePath?: string;
  }

  /**
   * The result of running a git operation.
   */
  export interface Result extends RunResult {
    /**
     * The error that occurred while running the git operation.
     */
    error?: Error;
  }

  /**
   * The result of running `git rev-parse HEAD`.
   */
  export interface CurrentCommitShaResult extends Git.CurrentCommitShaResult, Result {
  }

  /**
   * Options that can be passed to `git fetch`.
   */
  export interface FetchOptions extends Options {
    /**
     * Before fetching, remove any remote-tracking references that no longer exist on the remote. Tags
     * are not subject to pruning if they are fetched only because of the default tag auto-following
     * or due to a --tags option. However, if tags are fetched due to an explicit refspec (either on
     * the command line or in the remote configuration, for example if the remote was cloned with the
     * --mirror option), then they are also subject to pruning. Supplying --prune-tags is a shorthand
     * for providing the tag refspec.
     */
    prune?: boolean;
  }

  /**
   * Options that can be passed to `git clone`.
   */
  export interface CloneOptions extends Git.CloneOptions, Options {
    /**
     * Operate quietly. Progress is not reported to the standard error stream.
     */
    quiet?: boolean;
    /**
     * Run verbosely. Does not affect the reporting of progress status to the standard error stream.
     */
    verbose?: boolean;
  }

  /**
   * The result of attempting to run `git checkout`.
   */
  export interface CheckoutResult extends Result {
    /**
     * Get the files that would've been overwritten if this checkout operation had taken place. This
     * property will only be populated in an error scenario.
     */
    filesThatWouldBeOverwritten?: string[];
  }

  /**
   * The options for determining how pushing the current branch will run.
   */
  export interface PushOptions extends Git.PushOptions, Options {
    /**
     * The upstream repository to push to if the current branch doesn't already have an upstream
     * branch.
     */
    setUpstream?: boolean | string;
  }

  /**
   * Options that modify how a "git commit" operation will run.
   */
  export interface CommitOptions extends Options {
    /**
     * Whether or not pre-commit checks will be run.
     */
    noVerify?: boolean;
  }

  /**
   * Options that can be passed to `git push <remote> :<branch-name>`.
   */
  export interface DeleteRemoteBranchOptions extends Git.DeleteRemoteBranchOptions, Options {
  }

  /**
   * Options that can be passed to `git diff`.
   */
  export interface DiffOptions extends Git.DiffOptions, Options {
  }

  /**
   * The result of a "git diff" command.
   */
  export interface DiffResult extends Git.DiffResult, Result {
  }

  /**
   * The result of getting the local branches in the repository.
   */
  export interface LocalBranchesResult extends Git.LocalBranchesResult, Result {
    /**
     * The current branch that is checked out.
     */
    currentBranch: string;
  }

  /**
   * The return type of getting a remote repository's branches.
   */
  export interface RemoteBranchesResult extends Git.RemoteBranchesResult, Result {
  }

  /**
   * The result of getting the status of the current branch.
   */
  export interface StatusResult extends Git.StatusResult, Result {
  }

  /**
   * The result of getting a git configuration value.
   */
  export interface GetConfigurationValueResult extends Git.GetConfigurationValueResult, Result {
  }

  /**
   * The options that can be passed to a `git commit` operation.
   */
  export interface CommitOptions extends Git.CommitOptions, Options {
  }
}

/**
 * An implementation of Git that uses a Git executable to run commands.
 */
export class ExecutableGit implements Git {
  /**
   * Create a new ExecutableGit object.
   * @param gitFilePath The file path to the git executable to use to run commands. This can be
   * either a rooted path to the executable, or a relative path that will use the environment's PATH
   * variable to resolve the executable's location.
   * @param options The optional arguments that will be applied to each operation.
   */
  constructor(private readonly options: ExecutableGit.Options = {}) {
    if (!options.gitFilePath) {
      options.gitFilePath = "git";
    }
  }

  /**
   * Create a new ExecutableGit object that combines this ExecutableGit's options with the provieded
   * options.
   * @param options The options to combine with this ExecutableGit's options.
   */
  public scope(options: ExecutableGit.Options): ExecutableGit {
    return new ExecutableGit({
      ...this.options,
      ...options,
    });
  }

  /**
   * Run an arbitrary Git command.
   * @param args The arguments to provide to the Git executable.
   */
  public run(args: string[], options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return run(options.gitFilePath || this.options.gitFilePath!, args, {
      ...this.options,
      ...options
    });
  }

  /**
   * Get the SHA of the currently checked out commit.
   */
  public async currentCommitSha(options: ExecutableGit.Options = {}): Promise<ExecutableGit.CurrentCommitShaResult> {
    const runResult: ExecutableGit.Result = await this.run(["rev-parse", "HEAD"], options);
    const result: ExecutableGit.CurrentCommitShaResult = {
      ...runResult,
      currentCommitSha: runResult.stdout,
    };
    return result;
  }

  /**
   * Download objects and refs from another repository.
   * @param options The options that can be passed to `git fetch`.
   */
  public fetch(options: ExecutableGit.FetchOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["fetch"];
    if (options.prune) {
      args.push("--prune");
    }
    return this.run(args, options);
  }

  /**
   * Merge the registed origin remote repository's master branch into the current branch.
   * @param options The options that can be passed to `git merge origin master`.
   */
  public mergeOriginMaster(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run(["merge", "origin", "master"], options);
  }

  /**
   * Clone the repository with the provided URI.
   * @param gitUri The repository URI to clone.
   * @param options The options that can be passed to "git clone".
   */
  public clone(gitUri: string, options: ExecutableGit.CloneOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = [`clone`];
    if (options.quiet) {
      args.push(`--quiet`);
    }
    if (options.verbose) {
      args.push(`--verbose`);
    }
    if (options.origin) {
      args.push(`--origin`, options.origin);
    }
    if (options.branch) {
      args.push(`--branch`, options.branch);
    }
    if (options.depth != undefined) {
      args.push(`--depth`, options.depth.toString());
    }
    args.push(gitUri);
    if (options.directory) {
      args.push(options.directory);
    }
    return this.run(args, options);
  }

  /**
   * Checkout the provided git reference (branch, tag, or commit ID) in the repository.
   * @param refId The git reference to checkout.
   */
  public async checkout(refId: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.CheckoutResult> {
    const runResult: ExecutableGit.Result = await this.run([`checkout`, refId], options);
    let filesThatWouldBeOverwritten: string[] | undefined;
    if (runResult.stderr) {
      const stderrLines: string[] = getLines(runResult.stderr);
      if (stderrLines[0].trim() === "error: The following untracked working tree files would be overwritten by checkout:") {
        filesThatWouldBeOverwritten = [];
        let lineIndex = 1;
        while (lineIndex < stderrLines.length) {
          const line: string = stderrLines[lineIndex];
          if (line.trim() === "Please move or remove them before you switch branches.") {
            break;
          } else {
            filesThatWouldBeOverwritten.push(joinPath(options.executionFolderPath || this.options.executionFolderPath || "", line.trim()));
            ++lineIndex;
          }
        }
      }
    }
    return {
      ...runResult,
      filesThatWouldBeOverwritten
    };
  }

  /**
   * Pull the latest changes for the current branch from the registered remote branch.
   */
  public pull(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run([`pull`], options);
  }

  /**
   * Push the current branch to the remote tracked repository.
   * @param options The options for determining how this command will run.
   */
  public async push(options: ExecutableGit.PushOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["push"];
    if (options.setUpstream) {
      const upstream: string = typeof options.setUpstream === "string" ? options.setUpstream : "origin";
      const branchName: string = options.branchName || await this.currentBranch(options);
      args.push(`--set-upstream`, upstream, branchName);
    }
    return await this.run(args, options);
  }

  /**
   * Add/stage the provided files.
   * @param filePaths The paths to the files to stage.
   * @param options The options for determining how this command will run.
   */
  public add(filePaths: string | string[], options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["add"];
    if (typeof filePaths === "string") {
      args.push(filePaths);
    } else {
      args.push(...filePaths);
    }
    return this.run(args, options);
  }

  /**
   * Add/stage all of the current unstaged files.
   * @param options The options that determine how this command will run.
   */
  public addAll(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.add("*", options);
  }

  /**
   * Commit the currently staged/added changes to the current branch.
   * @param commitMessages The commit messages to apply to this commit.
   * @param options The options that determine how this command will run.
   */
  public commit(commitMessages: string | string[], options: ExecutableGit.CommitOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["commit"];

    if (options.noVerify) {
      args.push("--no-verify");
    }

    if (typeof commitMessages === "string") {
      commitMessages = [commitMessages];
    }
    for (const commitMessage of commitMessages) {
      args.push("-m", commitMessage);
    }

    return this.run(args, options);
  }

  /**
   * Delete a local branch.
   * @param branchName The name of the local branch to delete.
   */
  public deleteLocalBranch(branchName: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run([`branch`, `-D`, branchName], options);
  }

  /**
   * Create a new local branch with the provided name.
   * @param branchName The name of the new branch.
   * @param options The options for determining how this command will run.
   */
  public createLocalBranch(branchName: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run([`checkout`, `-b`, branchName], options);
  }

  /**
   * Remote the provided branch from the provided tracked remote repository.
   * @param branchName The name of the remote branch to delete.
   * @param remoteName The name of the tracked remote repository.
   * @param options The options for determining how this command will run.
   */
  public deleteRemoteBranch(branchName: string, options: ExecutableGit.DeleteRemoteBranchOptions = {}): Promise<ExecutableGit.Result> {
    return this.run([`push`, options.remoteName || "origin", `:${branchName}`], options);
  }

  public async diff(options: ExecutableGit.DiffOptions = {}): Promise<ExecutableGit.DiffResult> {
    const args: string[] = ["diff"];

    if (options.commit1) {
      args.push(options.commit1);
    }

    if (options.commit2) {
      args.push(options.commit2);
    }

    if (options.staged) {
      args.push(`--staged`);
    }

    if (options.nameOnly) {
      args.push(`--name-only`);
    }

    if (options.ignoreSpace === "all") {
      args.push(`--ignore-all-space`);
    } else if (options.ignoreSpace) {
      args.push(`--ignore-space-${options.ignoreSpace}`);
    }

    const commandResult: ExecutableGit.Result = await this.run(args, options);

    let filesChanged: string[];
    const repositoryFolderPath: string | undefined = options.executionFolderPath || this.options.executionFolderPath || process.cwd();
    const stdoutLines: string[] = getLines(commandResult.stdout);
    if (options.nameOnly) {
      filesChanged = [];
      for (const fileChanged of getLines(commandResult.stdout)) {
        if (fileChanged) {
          filesChanged.push(joinPath(repositoryFolderPath, fileChanged));
        }
      }
    } else {
      filesChanged = getFilesChangedFromFullDiff(stdoutLines, repositoryFolderPath);
    }
    return {
      ...commandResult,
      filesChanged
    };
  }

  /**
   * Get the branches that are local to this repository.
   */
  public async localBranches(options: ExecutableGit.Options = {}): Promise<ExecutableGit.LocalBranchesResult> {
    const commandResult: ExecutableGit.Result = await this.run(["branch"], options);
    let currentBranch = "";
    const localBranches: string[] = [];
    for (let branch of getLines(commandResult.stdout)) {
      if (branch) {
        branch = branch.trim();
        if (branch) {
          if (branch.startsWith("*")) {
            branch = branch.substring(1).trimLeft();
            const detachedHeadMatch: RegExpMatchArray | null = branch.match(branchDetachedHeadRegExp);
            if (detachedHeadMatch) {
              branch = detachedHeadMatch[1];
            }
            currentBranch = branch;
          }
          localBranches.push(branch);
        }
      }
    }
    return {
      ...commandResult,
      localBranches,
      currentBranch,
    };
  }

  /**
   * Get the branch that the repository is currently on.
   * @param options The options to run this command with.
   */
  public async currentBranch(options: ExecutableGit.Options = {}): Promise<string> {
    return (await this.localBranches(options)).currentBranch;
  }

  /**
   * Get the remote branches that this repository clone is aware of.
   * @param options The options to run this command with.
   */
  public async remoteBranches(options: ExecutableGit.Options = {}): Promise<ExecutableGit.RemoteBranchesResult> {
    const gitResult: ExecutableGit.Result = await this.run(["branch", "--remotes"], options);
    const remoteBranches: GitRemoteBranch[] = [];
    for (let remoteBranchLine of getLines(gitResult.stdout)) {
      if (remoteBranchLine && remoteBranchLine.indexOf("->") === -1) {
        remoteBranchLine = remoteBranchLine.trim();
        if (remoteBranchLine) {
          const firstSlashIndex: number = remoteBranchLine.indexOf("/");
          const repositoryTrackingName: string = remoteBranchLine.substring(0, firstSlashIndex);
          const branchName: string = remoteBranchLine.substring(firstSlashIndex + 1);
          remoteBranches.push({
            repositoryTrackingName,
            branchName
          });
        }
      }
    }
    return {
      ...gitResult,
      remoteBranches
    };
  }

  /**
   * Run "git status".
   */
  public async status(options: ExecutableGit.Options = {}): Promise<ExecutableGit.StatusResult> {
    const folderPath: string = options.executionFolderPath || this.options.executionFolderPath || process.cwd();

    let parseState: StatusParseState = "CurrentBranch";
    let localBranch: string | undefined;
    let remoteBranch: string | undefined;
    let hasUncommittedChanges = false;
    const stagedModifiedFiles: string[] = [];
    const stagedDeletedFiles: string[] = [];
    const notStagedModifiedFiles: string[] = [];
    const notStagedDeletedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    const runResult: ExecutableGit.Result = await this.run(["status"], options);
    const lines: string[] = getLines(runResult.stdout);
    let lineIndex = 0;
    while (lineIndex < lines.length) {
      const line: string = lines[lineIndex].trim();
      if (!line) {
        ++lineIndex;
      } else {
        switch (parseState) {
          case "CurrentBranch":
            const onBranchMatch: RegExpMatchArray | null = line.match(onBranchRegExp);
            if (onBranchMatch) {
              localBranch = onBranchMatch[1];
            } else {
              const detachedHeadMatch: RegExpMatchArray | null = line.match(statusDetachedHeadRegExp);
              if (detachedHeadMatch) {
                localBranch = detachedHeadMatch[1];
              }
            }
            parseState = "RemoteBranch";
            ++lineIndex;
            break;

          case "RemoteBranch":
            const remoteBranchMatch: RegExpMatchArray | null = line.match(/.*\'(.*)\'.*/);
            if (remoteBranchMatch) {
              remoteBranch = remoteBranchMatch[1];
              ++lineIndex;
            }
            parseState = "Changes";
            break;

          case "Changes":
            hasUncommittedChanges = !line.match(/nothing to commit, working tree clean/i);
            if (hasUncommittedChanges) {
              if (line.match(/Changes to be committed:/i)) {
                parseState = "ChangesToBeCommitted";
              } if (isChangesNotStagedForCommitHeader(line)) {
                parseState = "ChangesNotStagedForCommit";
              } else if (isUntrackedFilesHeader(line)) {
                parseState = "UntrackedFiles";
              }
            }
            ++lineIndex;
            break;

          case "ChangesToBeCommitted":
            if (!line.match(/\(use "git reset HEAD <file>..." to unstage\)/i)) {
              const modifiedMatch: RegExpMatchArray | null = line.match(/modified:(.*)/i);
              if (modifiedMatch) {
                const modifiedFilePath: string = joinPath(folderPath, modifiedMatch[1].trim());
                stagedModifiedFiles.push(modifiedFilePath);
              } else {
                const deletedMatch: RegExpMatchArray | null = line.match(/deleted:(.*)/i);
                if (deletedMatch) {
                  const deletedFilePath: string = joinPath(folderPath, deletedMatch[1].trim());
                  stagedDeletedFiles.push(deletedFilePath);
                } else if (isChangesNotStagedForCommitHeader(line)) {
                  parseState = "ChangesNotStagedForCommit";
                } else if (isUntrackedFilesHeader(line)) {
                  parseState = "UntrackedFiles";
                }
              }
            }
            ++lineIndex;
            break;

          case "ChangesNotStagedForCommit":
            if (!line.match(/\(use "git add <file>..." to update what will be committed\)/i) && !line.match(/\(use "git checkout -- <file>..." to discard changes in working directory\)/i)) {
              const modifiedMatch: RegExpMatchArray | null = line.match(/modified:(.*)/i);
              if (modifiedMatch) {
                const modifiedFilePath: string = joinPath(folderPath, modifiedMatch[1].trim());
                notStagedModifiedFiles.push(modifiedFilePath);
              } else {
                const deletedMatch: RegExpMatchArray | null = line.match(/deleted:(.*)/i);
                if (deletedMatch) {
                  const deletedFilePath: string = joinPath(folderPath, deletedMatch[1].trim());
                  notStagedDeletedFiles.push(deletedFilePath);
                } else if (isUntrackedFilesHeader(line)) {
                  parseState = "UntrackedFiles";
                }
              }
            }
            ++lineIndex;
            break;

          case "UntrackedFiles":
            if (!line.match(/\(use "git add <file>..." to include in what will be committed\)/i) &&
              !line.match(/nothing added to commit but untracked files present \(use "git add" to track\)/i) &&
              !line.match(/no changes added to commit \(use \"git add\" and\/or \"git commit -a\"\)/i)) {
              const resolveUntrackedFilePath: string = joinPath(folderPath, line);
              untrackedFiles.push(resolveUntrackedFilePath);
            }
            ++lineIndex;
            break;
        }
      }
    }

    const modifiedFiles: string[] = [];
    if (hasUncommittedChanges) {
      modifiedFiles.push(
        ...stagedModifiedFiles,
        ...stagedDeletedFiles,
        ...notStagedModifiedFiles,
        ...notStagedDeletedFiles,
        ...untrackedFiles);
    }

    return {
      ...runResult,
      localBranch,
      remoteBranch,
      hasUncommittedChanges,
      modifiedFiles,
      stagedModifiedFiles,
      stagedDeletedFiles,
      notStagedModifiedFiles,
      notStagedDeletedFiles,
      untrackedFiles,
    };
  }

  /**
   * Get the configuration value for the provided configuration value name.
   * @param configurationValueName The name of the configuration value to get.
   * @param options The options that can configure how the command will run.
   */
  public async getConfigurationValue(configurationValueName: string, options?: ExecutableGit.Options): Promise<ExecutableGit.GetConfigurationValueResult> {
    const result: ExecutableGit.GetConfigurationValueResult = await this.run(["config", "--get", configurationValueName], options);
    if (result.exitCode === 0 && result.stdout) {
      result.configurationValue = result.stdout;
    }
    return result;
  }

  /**
   * Get the URL of the current repository.
   * @param options The options that can configure how the command will run.
   */
  public async getRepositoryUrl(options: ExecutableGit.Options = {}): Promise<string | undefined> {
    let result: string | undefined = (await this.getConfigurationValue("remote.origin.url", options)).configurationValue;
    if (result) {
      result = result.trim();
    }
    return result;
  }

  /**
   * Unstage all staged files.
   * @param options The options that can configure how the command will run.
   */
  public resetAll(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run(["reset", "*"], options);
  }

  /**
   * Get the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @returns The URL associated with the provided remote repository or undefined if the remote name
   * is not found.
   */
  public async getRemoteUrl(remoteName: string, options: ExecutableGit.Options = {}): Promise<string | undefined> {
    const result: string | undefined = (await this.run(["remote", "get-url", remoteName], options)).stdout;
    return (result && result.trim()) || undefined;
  }

  /**
   * Set the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @param remoteUrl The URL associated with the provided remote repository.
   */
  public setRemoteUrl(remoteName: string, remoteUrl: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run(["remote", "set-url", remoteName, remoteUrl], options);
  }
}

/**
 * The prefix that marks the beginning of a diff-ed file line.
 */
const changedFileDiffLinePrefix = "diff --git";

/**
 * The regular expression used to get a relative file path from a full diff contents line.
 */
const fullDiffGitLineRegex: RegExp = /diff --git a\/(.*) b\/.*/;

/**
 * Get the files that have changed based on the provided full diff text result.
 * @param text The text of the full diff.
 * @param currentFolder The folder that the diff-ed files should be resolved against.
 */
export function getFilesChangedFromFullDiff(text: string | string[], currentFolder?: string): string[] {
  const lines: string[] = typeof text === "string" ? getLines(text) : text;
  const fileDiffLines: string[] = where(lines, (line: string) => line.startsWith(changedFileDiffLinePrefix));
  const result: string[] = [];
  for (const fileDiffLine of fileDiffLines) {
    const lineMatch: RegExpMatchArray | null = fileDiffLine.match(fullDiffGitLineRegex);
    if (lineMatch) {
      const relativeFilePath: string = lineMatch[1];
      const filePath: string = currentFolder ? joinPath(currentFolder, relativeFilePath) : relativeFilePath;
      result.push(filePath);
    }
  }
  return result;
}

const branchDetachedHeadRegExp: RegExp = /\(HEAD detached at (.*)\)/;

/**
 * Get a GitRemoteBranch from the provided label. Labels usually follow the format
 * "<repository-tracking-name>:<branch-name>", such as "origin:master".
 * @param label The string or GitRemoteBranch to convert to a GitRemoteBranch.
 */
export function getGitRemoteBranch(label: string | GitRemoteBranch): GitRemoteBranch {
  let result: GitRemoteBranch;
  if (typeof label === "string") {
    const colonIndex: number = label.indexOf(":");
    const repositoryTrackingName: string = label.substring(0, colonIndex);
    const branchName: string = label.substring(colonIndex + 1);
    result = {
      repositoryTrackingName,
      branchName
    };
  } else {
    result = label;
  }
  return result;
}

/**
 * A branch from a tracked remote repository.
 */
export interface GitRemoteBranch {
  /**
   * The tracking name of the remote repository, such as "origin".
   */
  repositoryTrackingName: string;
  /**
   * The name of the branch.
   */
  branchName: string;
}

/**
 * Get the full name of the provided remote branch.
 * @param remoteBranch The remote branch to get the full name of.
 */
export function getRemoteBranchFullName(remoteBranch: string | GitRemoteBranch): string {
  return !remoteBranch || typeof remoteBranch === "string"
    ? remoteBranch
    : `${remoteBranch.repositoryTrackingName}:${remoteBranch.branchName}`;
}

type StatusParseState = "CurrentBranch" | "RemoteBranch" | "Changes" | "ChangesToBeCommitted" | "ChangesNotStagedForCommit" | "UntrackedFiles";

function isChangesNotStagedForCommitHeader(text: string): boolean {
  return !!text.match(/Changes not staged for commit:/i);
}

function isUntrackedFilesHeader(text: string): boolean {
  return !!text.match(/Untracked files:/i);
}

const statusDetachedHeadRegExp: RegExp = /HEAD detached at (.*)/i;
const onBranchRegExp: RegExp = /On branch (.*)/i;
