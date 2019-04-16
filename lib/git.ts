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
 * The result of running a git operation.
 */
export interface GitRunResult extends RunResult {
  /**
   * The error that occurred while running the git operation.
   */
  error?: Error;
}

export function git(args: string | string[], options: RunOptions = {}): Promise<GitRunResult> {
  return run("git", args, options);
}

/**
 * Options that can be passed to `git fetch`.
 */
export interface GitFetchOptions extends RunOptions {
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
 * Download objects and refs from another repository.
 * @param options The options that can be passed to `git fetch`.
 */
export function gitFetch(options: GitFetchOptions = {}): Promise<GitRunResult> {
  let command = "fetch";
  if (options.prune) {
    command += " --prune";
  }
  return git(command, options);
}

export function gitMergeOriginMaster(options: RunOptions = {}): Promise<GitRunResult> {
  return git("merge origin master", options);
}

/**
 * Options that can be passed to gitClone().
 */
export interface GitCloneOptions extends RunOptions {
  /**
   * Operate quietly. Progress is not reported to the standard error stream.
   */
  quiet?: boolean;
  /**
   * Run verbosely. Does not affect the reporting of progress status to the standard error stream.
   */
  verbose?: boolean;
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
 * Clone the repository with the provided URI.
 * @param gitUri The repository URI to clone.
 * @param options The options that can be passed to "git clone".
 */
export function gitClone(gitUri: string, options: GitCloneOptions = {}): Promise<GitRunResult> {
  let command = `clone`;
  if (options.quiet) {
    command += ` --quiet`;
  }
  if (options.verbose) {
    command += ` --verbose`;
  }
  if (options.origin) {
    command += ` --origin ${options.origin}`;
  }
  if (options.branch) {
    command += ` --branch ${options.branch}`;
  }
  if (options.depth != undefined) {
    command += ` --depth ${options.depth}`;
  }
  command += ` ${gitUri}`;
  if (options.directory) {
    command += ` ${options.directory}`;
  }
  return git(command, options);
}

export interface GitCheckoutResult extends GitRunResult {
  /**
   * Get the files that would've been overwritten if this checkout operation had taken place. This
   * property will only be populated in an error scenario.
   */
  filesThatWouldBeOverwritten?: string[];
}

export async function gitCheckout(refId: string, options: RunOptions = {}): Promise<GitCheckoutResult> {
  const runResult: GitRunResult = await git(`checkout ${refId}`, options);
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
          filesThatWouldBeOverwritten.push(joinPath((options && options.executionFolderPath) || "", line.trim()));
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

export function gitPull(options: RunOptions = {}): Promise<GitRunResult> {
  return git(`pull`, options);
}

/**
 * The options for determining how gitPush() will run.
 */
export interface GitPushOptions extends RunOptions {
  /**
   * The upstream repository to push to if the current branch doesn't already have an upstream
   * branch.
   */
  setUpstream?: boolean | string;
  /**
   * The name of the branch to push.
   */
  branchName?: string;
}

/**
 * Push the current branch to the remote tracked repository.
 * @param options The options for determining how this command will run.
 */
export async function gitPush(options: GitPushOptions = {}): Promise<GitRunResult> {
  let args = "push";
  if (options.setUpstream) {
    const upstream: string = typeof options.setUpstream === "string" ? options.setUpstream : "origin";
    const branchName: string = options.branchName || await gitCurrentBranch(options);
    args += ` --set-upstream ${upstream} ${branchName}`;
  }
  return await git(args, options);
}

/**
 * Add/stage the provided files.
 * @param filePaths The paths to the files to stage.
 * @param options The options for determining how this command will run.
 */
export function gitAdd(filePaths: string | string[], options: RunOptions = {}): Promise<GitRunResult> {
  const args: string[] = ["add"];
  if (typeof filePaths === "string") {
    args.push(filePaths);
  } else {
    args.push(...filePaths);
  }
  return git(args, options);
}

/**
 * Add/stage all of the current unstaged files.
 * @param options The options that determine how this command will run.
 */
export function gitAddAll(options: RunOptions = {}): Promise<GitRunResult> {
  return gitAdd("*", options);
}

/**
 * Options that modify how a "git commit" operation will run.
 */
export interface GitCommitOptions extends RunOptions {
  /**
   * Whether or not pre-commit checks will be run.
   */
  noVerify?: boolean;
}

export function gitCommit(commitMessages: string | string[], options: GitCommitOptions = {}): Promise<GitRunResult> {
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

  return git(args, options);
}

export function gitDeleteLocalBranch(branchName: string, options: RunOptions = {}): Promise<GitRunResult> {
  return git(`branch -D ${branchName}`, options);
}

/**
 * Create a new local branch with the provided name.
 * @param branchName The name of the new branch.
 * @param options The options for determining how this command will run.
 */
export function gitCreateLocalBranch(branchName: string, options: RunOptions = {}): Promise<GitRunResult> {
  return git(`checkout -b ${branchName}`, options);
}

/**
 * The options for determining how this command will run.
 */
export interface GitDeleteRemoteBranchOptions extends RunOptions {
  /**
   * The name of the tracked remote repository. Defaults to "origin".
   */
  remoteName?: string;
}

/**
 * Remote the provided branch from the provided tracked remote repository.
 * @param branchName The name of the remote branch to delete.
 * @param remoteName The name of the tracked remote repository.
 * @param options The options for determining how this command will run.
 */
export function gitDeleteRemoteBranch(branchName: string, options: GitDeleteRemoteBranchOptions = {}): Promise<GitRunResult> {
  return git(`push ${options.remoteName || "origin"} :${branchName}`, options);
}

/**
 * Options that can be passed to gitDiff().
 */
export interface GitDiffOptions extends RunOptions {
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
}

/**
 * The result of a "git diff" command.
 */
export interface GitDiffResult extends GitRunResult {
  /**
   * The files that are reported as being changed by the diff command.
   */
  filesChanged: string[];
}

export async function gitDiff(options: GitDiffOptions = {}): Promise<GitDiffResult> {
  let command = "diff";

  if (options.commit1) {
    command += ` ${options.commit1}`;
  }

  if (options.commit2) {
    command += ` ${options.commit2}`;
  }

  if (options.nameOnly) {
    command += ` --name-only`;
  }

  if (options.ignoreSpace === "all") {
    command += ` --ignore-all-space`;
  } else if (options.ignoreSpace) {
    command += ` --ignore-space-${options.ignoreSpace}`;
  }

  const commandResult: RunResult = await git(command, options);

  let filesChanged: string[];
  const repositoryFolderPath: string | undefined = options.executionFolderPath || process.cwd();
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

/**
 * The return type of gitLocalBranches().
 */
export interface GitLocalBranchesResult extends GitRunResult {
  localBranches: string[];
  currentBranch: string;
}

const branchDetachedHeadRegExp: RegExp = /\(HEAD detached at (.*)\)/;
export async function gitLocalBranches(options: RunOptions = {}): Promise<GitLocalBranchesResult> {
  const commandResult: RunResult = await git("branch", options);
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
export async function gitCurrentBranch(options: RunOptions = {}): Promise<string> {
  return (await gitLocalBranches(options)).currentBranch;
}

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
 * The return type of gitRemoteBranches().
 */
export interface GitRemoteBranchesResult extends GitRunResult {
  /**
   * The branches in remote repositories.
   */
  remoteBranches: GitRemoteBranch[];
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

/**
 * Get the remote branches that this repository clone is aware of.
 * @param options The options to run this command with.
 */
export async function gitRemoteBranches(options: RunOptions = {}): Promise<GitRemoteBranchesResult> {
  const gitResult: GitRunResult = await git(["branch", "--remotes"], options);
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

export interface GitStatusResult extends GitRunResult {
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

type StatusParseState = "CurrentBranch" | "RemoteBranch" | "Changes" | "ChangesToBeCommitted" | "ChangesNotStagedForCommit" | "UntrackedFiles";

function isChangesNotStagedForCommitHeader(text: string): boolean {
  return !!text.match(/Changes not staged for commit:/i);
}

function isUntrackedFilesHeader(text: string): boolean {
  return !!text.match(/Untracked files:/i);
}

const statusDetachedHeadRegExp: RegExp = /HEAD detached at (.*)/i;
const onBranchRegExp: RegExp = /On branch (.*)/i;

/**
 * Run "git status".
 */
export async function gitStatus(options: RunOptions = {}): Promise<GitStatusResult> {
  const folderPath: string = (options && options.executionFolderPath) || process.cwd();

  let parseState: StatusParseState = "CurrentBranch";
  let localBranch: string | undefined;
  let remoteBranch: string | undefined;
  let hasUncommittedChanges = false;
  const stagedModifiedFiles: string[] = [];
  const stagedDeletedFiles: string[] = [];
  const notStagedModifiedFiles: string[] = [];
  const notStagedDeletedFiles: string[] = [];
  const untrackedFiles: string[] = [];

  const runResult: RunResult = await git("status", options);
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
 * The result of running gitGetConfig().
 */
export interface GitGetConfigResult extends GitRunResult {
  /**
   * The requested configuration value or undefined if the value was not found.
   */
  configurationValue?: string;
}

/**
 * Get the configuration value for the provided configuration value name.
 * @param configurationValueName The name of the configuration value to get.
 * @param options The options that can configure how the command will run.
 */
export async function gitConfigGet(configurationValueName: string, options?: RunOptions): Promise<GitGetConfigResult> {
  const result: GitGetConfigResult = await git(["config", "--get", configurationValueName], options);
  if (result.exitCode === 0 && result.stdout) {
    result.configurationValue = result.stdout;
  }
  return result;
}

/**
 * Get the URL of the current repository.
 * @param options The options that can configure how the command will run.
 */
export async function gitGetRepositoryUrl(options?: RunOptions): Promise<string | undefined> {
  return (await gitConfigGet("remote.origin.url", options)).configurationValue;
}

export class GitScope {
  constructor(private options: RunOptions) {
  }

  public run(args: string | string[], options: RunOptions = {}): Promise<GitRunResult> {
    return git(args, {
      ...this.options,
      ...options,
    });
  }

  public fetch(options: RunOptions = {}): Promise<GitRunResult> {
    return gitFetch({
      ...this.options,
      ...options,
    });
  }

  public mergeOriginMaster(options: RunOptions = {}): Promise<GitRunResult> {
    return gitMergeOriginMaster({
      ...this.options,
      ...options
    });
  }

  public clone(gitUri: string, options: GitCloneOptions = {}): Promise<GitRunResult> {
    return gitClone(gitUri, {
      ...this.options,
      ...options
    });
  }

  public checkout(refId: string, options: RunOptions = {}): Promise<GitCheckoutResult> {
    return gitCheckout(refId, {
      ...this.options,
      ...options
    });
  }

  public pull(options: RunOptions = {}): Promise<GitRunResult> {
    return gitPull({
      ...this.options,
      ...options
    });
  }

  public push(options: GitPushOptions = {}): Promise<GitRunResult> {
    return gitPush({
      ...this.options,
      ...options
    });
  }

  /**
   * Add/stage the provided files.
   * @param filePaths The paths to the files to stage.
   * @param options The options for determining how this command will run.
   */
  public add(filePaths: string | string[], options: RunOptions = {}): Promise<GitRunResult> {
    return gitAdd(filePaths, {
      ...this.options,
      ...options
    });
  }

  /**
   * Add/stage all of the current unstaged files.
   * @param options The options that determine how this command will run.
   */
  public addAll(options: RunOptions = {}): Promise<GitRunResult> {
    return gitAddAll({
      ...this.options,
      ...options
    });
  }

  public commit(commitMessage: string | string[], options: GitCommitOptions = {}): Promise<GitRunResult> {
    return gitCommit(commitMessage, {
      ...this.options,
      ...options
    });
  }

  public deleteLocalBranch(branchName: string, options: RunOptions = {}): Promise<GitRunResult> {
    return gitDeleteLocalBranch(branchName, {
      ...this.options,
      ...options
    });
  }

  public createLocalBranch(branchName: string, options: RunOptions = {}): Promise<GitRunResult> {
    return gitCreateLocalBranch(branchName, {
      ...this.options,
      ...options
    });
  }

  public deleteRemoteBranch(branchName: string, options: GitDeleteRemoteBranchOptions = {}): Promise<GitRunResult> {
    return gitDeleteRemoteBranch(branchName, {
      ...this.options,
      ...options
    });
  }

  public diff(options: GitDiffOptions = {}): Promise<GitDiffResult> {
    return gitDiff({
      ...this.options,
      ...options,
    });
  }

  public localBranches(options: RunOptions = {}): Promise<GitLocalBranchesResult> {
    return gitLocalBranches({
      ...this.options,
      ...options,
    });
  }

  public remoteBranches(options: RunOptions = {}): Promise<GitRemoteBranchesResult> {
    return gitRemoteBranches({
      ...this.options,
      ...options
    });
  }

  public currentBranch(options: RunOptions = {}): Promise<string> {
    return gitCurrentBranch({
      ...this.options,
      ...options
    });
  }

  public status(options: RunOptions = {}): Promise<GitStatusResult> {
    return gitStatus({
      ...this.options,
      ...options,
    });
  }

  /**
   * Get the configuration value for the provided configuration value name.
   * @param configurationValueName The name of the configuration value to get.
   * @param options The options that can configure how the command will run.
   */
  public configGet(configurationValueName: string, options?: RunOptions): Promise<GitGetConfigResult> {
    return gitConfigGet(configurationValueName, {
      ...this.options,
      ...options
    });
  }

  /**
   * Get the URL of the current repository.
   * @param options The options that can configure how the command will run.
   */
  public getRepositoryUrl(options?: RunOptions): Promise<string | undefined> {
    return gitGetRepositoryUrl({
      ...this.options,
      ...options
    });
  }
}
